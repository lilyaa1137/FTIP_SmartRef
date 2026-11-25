import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import type { Content, FunctionDeclaration, Part } from '@google/genai';
import {
  GEMINI_MODEL,
  buildChatSystemInstruction,
  buildKeywordPrompt,
  classifyGeminiError,
  isRetryableGeminiError,
  sanitizeText,
  searchAcademicWorks,
} from './src/utils/academicCore.ts';
import type { IncomingMessage, ProgramContext } from './src/utils/academicCore.ts';
import type { JournalArticle } from './src/types/smartref.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const INQUIRIES_FILE = path.resolve(DATA_DIR, 'librarian_inquiries.json');

interface LibrarianInquiryRecord {
  ticketId: string;
  createdAt: string;
  name: string;
  npmOrNip: string;
  email: string;
  programLabel: string;
  category: string;
  question: string;
  status: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isRetryableGeminiError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

const searchAcademicLiteratureDeclaration: FunctionDeclaration = {
  name: 'searchAcademicLiterature',
  description:
    'Cari publikasi ilmiah nyata dan terverifikasi dari basis data OpenAlex dan Crossref menggunakan kueri Bahasa Inggris akademik yang ringkas dan akurat. Gunakan alat ini setiap kali pengguna meminta referensi/jurnal/literatur, atau saat pengguna mengeksplorasi suatu topik riset dan contoh artikel terverifikasi akan memperkaya jawaban.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      englishQuery: {
        type: Type.STRING,
        description:
          'Kueri pencarian akademik Bahasa Inggris yang ringkas dan spesifik (3-7 kata, tanpa operator NOT panjang), mis. "machine learning crop quality prediction", "coffee drying temperature sensory quality", atau "edible coating fruit shelf life".',
      },
      yearFrom: {
        type: Type.INTEGER,
        description: 'Tahun terbit minimum (opsional, misalnya 2019 atau 2020 untuk literatur mutakhir).',
      },
    },
    required: ['englishQuery'],
  },
};

async function readInquiries(): Promise<LibrarianInquiryRecord[]> {
  try {
    const raw = await fs.readFile(INQUIRIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeInquiry(record: LibrarianInquiryRecord): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = await readInquiries();
  const updated = [record, ...existing].slice(0, 100);
  await fs.writeFile(INQUIRIES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. Gemini AI Reference Assistant Chat Endpoint (with Dynamic OpenAlex + Crossref Tool Calling)
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const program: ProgramContext | undefined = req.body?.program;
      const hasExplicitProgram = req.body?.hasExplicitProgram === true;

      const cleanMessages: IncomingMessage[] = rawMessages
        .slice(-16)
        .map((m: unknown) => {
          const obj = m as Record<string, unknown>;
          const role = obj?.role === 'model' ? 'model' : 'user';
          const text = sanitizeText(obj?.text, 3000);
          return { role, text };
        })
        .filter((m: IncomingMessage) => m.text.length > 0);

      if (cleanMessages.length === 0 || cleanMessages[cleanMessages.length - 1].role !== 'user') {
        res.status(400).json({ error: 'Pesan pertanyaan tidak boleh kosong.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          errorCode: 'MISSING_GEMINI_API_KEY',
          error:
            'Asisten AI Gemini belum aktif karena GEMINI_API_KEY belum dikonfigurasi pada server. Periksa atau tambahkan API key di panel Settings > Secrets. Anda tetap dapat menelusuri artikel ilmiah nyata melalui tab Journal Finder.',
        });
        return;
      }

      const systemInstruction = buildChatSystemInstruction(
        program,
        hasExplicitProgram,
        cleanMessages
      );

      const contents: Content[] = cleanMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const tools = [{ functionDeclarations: [searchAcademicLiteratureDeclaration] }];
      const verifiedArticlesMap = new Map<string, JournalArticle>();
      let lastSuggestedQuery: string | undefined;
      let finalReply = '';

      for (let round = 0; round < 3; round++) {
        const response = await callGeminiWithRetry(() =>
          ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
              systemInstruction,
              tools,
            },
          })
        );

        const candidateContent = response.candidates?.[0]?.content;
        const parts: Part[] = Array.isArray(candidateContent?.parts) ? candidateContent.parts : [];
        const functionCalls = parts.filter((p) => Boolean(p.functionCall));

        if (functionCalls.length === 0 || !candidateContent) {
          finalReply = (response.text ?? '').trim();
          break;
        }

        contents.push(candidateContent);

        const functionResponseParts: Part[] = [];
        for (const part of functionCalls) {
          const fc = part.functionCall!;
          if (fc.name === 'searchAcademicLiterature') {
            const args = (fc.args || {}) as Record<string, unknown>;
            const englishQuery = sanitizeText(args.englishQuery, 200);
            const yearFromRaw = Number(args.yearFrom);
            const yearFrom =
              Number.isInteger(yearFromRaw) && yearFromRaw >= 1980 && yearFromRaw <= 2030
                ? yearFromRaw
                : 2018;

            if (englishQuery) {
              lastSuggestedQuery = englishQuery;
            }

            let searchResult: { totalCount: number; articles: JournalArticle[] } = {
              totalCount: 0,
              articles: [],
            };
            let searchError: string | null = null;

            try {
              searchResult = await searchAcademicWorks(englishQuery || 'agricultural technology', {
                perPage: 4,
                yearFrom,
                sort: 'relevance',
                timeoutMs: 4500,
              });
              for (const art of searchResult.articles) {
                const key = art.doiUrl || art.id;
                if (!verifiedArticlesMap.has(key)) {
                  verifiedArticlesMap.set(key, art);
                }
              }
            } catch (err) {
              searchError =
                err instanceof Error ? err.message : 'Gagal mengakses OpenAlex/Crossref.';
            }

            functionResponseParts.push({
              functionResponse: {
                id: fc.id,
                name: fc.name,
                response: {
                  queryUsed: englishQuery,
                  totalFound: searchResult.totalCount,
                  error: searchError,
                  articles: searchResult.articles.map((a) => ({
                    title: a.title,
                    authors: a.authors.slice(0, 3),
                    year: a.publicationYear,
                    journal: a.sourceName,
                    doiUrl: a.doiUrl,
                    landingUrl: a.landingUrl,
                    citedByCount: a.citedByCount,
                    provider: a.sourceProvider,
                  })),
                },
              },
            });
          }
        }

        if (functionResponseParts.length === 0) {
          finalReply = (response.text ?? '').trim();
          break;
        }

        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }

      if (!finalReply) {
        res.status(502).json({
          errorCode: 'GEMINI_EMPTY_RESPONSE',
          error:
            'Gemini AI tidak mengembalikan teks jawaban yang valid. Silakan kirim ulang pertanyaan Anda.',
        });
        return;
      }

      res.json({
        reply: finalReply,
        sourceMode: 'gemini',
        suggestedSearchQuery: lastSuggestedQuery,
        verifiedArticles: Array.from(verifiedArticlesMap.values()).slice(0, 5),
      });
    } catch (error) {
      console.error('[FTIP SmartRef /api/chat]', error);
      const classified = classifyGeminiError(error);
      res.status(classified.httpStatus).json({
        errorCode: classified.errorCode,
        error: classified.message,
      });
    }
  });

  // 2. Smart Keyword Generator Endpoint (Gemini AI)
  app.post('/api/keywords', async (req: Request, res: Response) => {
    try {
      const topic = sanitizeText(req.body?.topic, 600);
      const focus = sanitizeText(req.body?.focus, 300);
      const program: ProgramContext | undefined = req.body?.program;
      const hasExplicitProgram = req.body?.hasExplicitProgram === true;

      if (topic.length < 5) {
        res.status(400).json({
          error: 'Masukkan topik riset minimal 5 karakter untuk menghasilkan kata kunci.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          errorCode: 'MISSING_GEMINI_API_KEY',
          error:
            'Smart Keyword Generator AI belum aktif karena GEMINI_API_KEY belum dikonfigurasi pada server. Silakan periksa panel Settings > Secrets.',
        });
        return;
      }

      const prompt = buildKeywordPrompt(topic, focus, program, hasExplicitProgram);

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction:
              'Anda adalah pustakawan spesialis literasi informasi ilmiah untuk bidang Teknologi Pangan, Teknik Pertanian, Teknologi Industri Pertanian, Sosial Ekonomi Pertanian, dan ilmu pertanian interdisipliner.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                kataKunciIndonesia: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                kataKunciInggris: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                sinonimTeknis: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      istilah: { type: Type.STRING },
                      padanan: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ['istilah', 'padanan'],
                  },
                },
                strategiBoolean: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      query: { type: Type.STRING },
                      targetDatabase: { type: Type.STRING },
                    },
                    required: ['label', 'query', 'targetDatabase'],
                  },
                },
                istilahPencarianDisarankan: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                catatanStrategi: {
                  type: Type.STRING,
                },
              },
              required: [
                'kataKunciIndonesia',
                'kataKunciInggris',
                'sinonimTeknis',
                'strategiBoolean',
                'istilahPencarianDisarankan',
                'catatanStrategi',
              ],
            },
          },
        })
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      res.json({
        ...parsed,
        sourceMode: 'gemini',
      });
    } catch (error) {
      console.error('[FTIP SmartRef /api/keywords]', error);
      const classified = classifyGeminiError(error);
      res.status(classified.httpStatus).json({
        errorCode: classified.errorCode,
        error: classified.message,
      });
    }
  });

  // 3. Real Scholarly Journal Finder Endpoint (OpenAlex primary + Crossref fallback)
  app.get('/api/journals', async (req: Request, res: Response) => {
    try {
      const q = sanitizeText(req.query.q, 240);
      if (q.length < 2) {
        res.status(400).json({ error: 'Masukkan minimal 2 karakter kata kunci untuk mencari artikel jurnal.' });
        return;
      }

      const yearFromRaw = Number(req.query.yearFrom);
      const yearFrom =
        Number.isInteger(yearFromRaw) && yearFromRaw >= 1950 && yearFromRaw <= 2030
          ? yearFromRaw
          : null;
      const openAccessOnly = req.query.openAccess === 'true';
      const sortParam: 'relevance' | 'year' | 'cited' =
        req.query.sort === 'year'
          ? 'year'
          : req.query.sort === 'cited'
            ? 'cited'
            : 'relevance';

      const result = await searchAcademicWorks(q, {
        perPage: 12,
        yearFrom,
        openAccessOnly,
        sort: sortParam,
        timeoutMs: 7000,
      });

      res.json({
        totalCount: result.totalCount,
        articles: result.articles,
      });
    } catch (error) {
      console.error('[FTIP SmartRef /api/journals]', error);
      res.status(502).json({
        error:
          'Gagal mengambil metadata artikel dari OpenAlex maupun Crossref API. Periksa koneksi jaringan atau coba kata kunci lain.',
      });
    }
  });

  // 4. Ask a Librarian Submission & Queue Stats
  app.get('/api/librarian/stats', async (_req: Request, res: Response) => {
    const records = await readInquiries();
    res.json({
      totalInquiries: records.length,
    });
  });

  app.post('/api/librarian', async (req: Request, res: Response) => {
    try {
      const name = sanitizeText(req.body?.name, 120);
      const npmOrNip = sanitizeText(req.body?.npmOrNip, 40);
      const email = sanitizeText(req.body?.email, 140);
      const programLabel = sanitizeText(req.body?.programLabel, 140);
      const category = sanitizeText(req.body?.category, 80);
      const question = sanitizeText(req.body?.question, 2000);

      if (name.length < 2) {
        res.status(400).json({ error: 'Nama lengkap wajib diisi minimal 2 karakter.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Format alamat email tidak valid.' });
        return;
      }
      if (!programLabel) {
        res.status(400).json({ error: 'Silakan pilih program studi dan jenjang.' });
        return;
      }
      if (question.length < 10) {
        res.status(400).json({ error: 'Pertanyaan referensi wajib diisi minimal 10 karakter.' });
        return;
      }

      const now = new Date();
      const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const ticketId = `REF-FTIP-${dateCode}-${suffix}`;

      const record: LibrarianInquiryRecord = {
        ticketId,
        createdAt: now.toISOString(),
        name,
        npmOrNip: npmOrNip || '-',
        email,
        programLabel,
        category: category || 'Penelusuran Literatur',
        question,
        status: 'Tercatat di Antrean Lokal',
      };

      await writeInquiry(record);

      res.status(201).json({
        ticketId: record.ticketId,
        createdAt: record.createdAt,
        name: record.name,
        programLabel: record.programLabel,
        category: record.category,
        status: record.status,
        modeNote:
          'Tiket pertanyaan Anda tersimpan pada antrean demonstrasi lokal FTIP SmartRef. Integrasi pengiriman email otomatis ke meja pustakawan Unpad memerlukan konfigurasi server SMTP atau sistem helpdesk kampus saat rilis produksi.',
      });
    } catch (error) {
      console.error('[FTIP SmartRef /api/librarian]', error);
      res.status(500).json({ error: 'Gagal menyimpan pertanyaan Anda. Silakan coba kembali.' });
    }
  });

  // Ensure unmatched /api/* routes and JSON parse errors return JSON rather than SPA HTML
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint layanan API tidak ditemukan.' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      console.error('[FTIP SmartRef API middleware error]', err);
      res.status(400).json({ error: 'Permintaan API tidak valid atau tidak dapat diproses.' });
      return;
    }
    next(err);
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FTIP SmartRef server berjalan di http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server FTIP SmartRef:', err);
  process.exit(1);
});
