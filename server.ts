import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  generateLocalAssistantReply,
  generateLocalKeywords,
} from './src/utils/localSmartRef.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const INQUIRIES_FILE = path.resolve(DATA_DIR, 'librarian_inquiries.json');

interface ProgramContext {
  id?: string;
  level?: string;
  name?: string;
  thesisTerm?: string;
  focusAreas?: string[];
  sampleJournalQuery?: string;
}

interface IncomingMessage {
  role: 'user' | 'model';
  text: string;
}

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

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function sanitizeSafeHttpUrl(urlValue: unknown): string | null {
  if (typeof urlValue !== 'string' || !urlValue.trim()) return null;
  try {
    const parsed = new URL(urlValue.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function reconstructAbstract(invertedIndex: unknown, maxWords = 48): string | null {
  if (!invertedIndex || typeof invertedIndex !== 'object' || Array.isArray(invertedIndex)) {
    return null;
  }
  const positions: Array<[number, string]> = [];
  for (const [word, indices] of Object.entries(invertedIndex as Record<string, unknown>)) {
    if (!Array.isArray(indices)) continue;
    for (const pos of indices) {
      if (typeof pos === 'number' && Number.isFinite(pos) && pos >= 0 && pos < 500) {
        positions.push([pos, word]);
      }
    }
  }
  if (positions.length === 0) return null;
  positions.sort((a, b) => a[0] - b[0]);
  const words = positions.slice(0, maxWords).map(([, w]) => w);
  const text = words.join(' ').replace(/\s+/g, ' ').trim();
  return positions.length > maxWords ? `${text}...` : text;
}

function buildPersonalizationBlock(program?: ProgramContext): string {
  if (!program || !program.name) {
    return 'Pengguna belum memilih program studi spesifik. Berikan panduan referensi umum untuk bidang Teknik Pertanian, Teknologi Pangan, atau Teknologi Industri Pertanian di FTIP Unpad.';
  }
  const level = sanitizeText(program.level, 10) || 'S1';
  const name = sanitizeText(program.name, 100);
  const thesisTerm = sanitizeText(program.thesisTerm, 60) || 'Tugas Akhir';
  const focus = Array.isArray(program.focusAreas)
    ? program.focusAreas.map((f) => sanitizeText(f, 80)).filter(Boolean).join(', ')
    : '';

  let depthGuidance =
    'Berikan penjelasan terstruktur, definisi konsep inti, panduan metodologi praktis, serta rekomendasi istilah pencarian.';
  if (level === 'S2') {
    depthGuidance =
      'Sesuaikan kedalaman untuk mahasiswa Magister (S2): tekankan pemetaan research gap, kerangka teoretis/pemodelan, perbandingan metodologi lintas studi, dan strategi tinjauan pustaka sistematis.';
  } else if (level === 'S3') {
    depthGuidance =
      'Sesuaikan kedalaman untuk kandidat Doktor (S3): tekankan identifikasi state-of-the-art, kebaruan ilmiah (novelty), sintesis literatur mutakhir berstandar PRISMA, serta kontribusi fundamental atau lintas disiplin.';
  }

  return `Profil Akademik Pengguna:
- Jenjang: ${level} (${thesisTerm})
- Program Studi: ${name} (Fakultas Teknologi Industri Pertanian, Universitas Padjadjaran)
- Bidang Fokus Utama: ${focus || 'Agroindustri dan Teknologi Pertanian'}
- Panduan Kedalaman: ${depthGuidance}`;
}

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

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. AI Reference Assistant Chat Endpoint (Gemini AI + transparent local guidance fallback)
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const program: ProgramContext | undefined = req.body?.program;

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

      const latestMessage = cleanMessages[cleanMessages.length - 1].text;
      const ai = getGeminiClient();

      if (ai) {
        try {
          const systemInstruction = `Anda adalah FTIP SmartRef, asisten referensi perpustakaan digital resmi untuk Fakultas Teknologi Industri Pertanian (FTIP), Universitas Padjadjaran (Unpad).

${buildPersonalizationBlock(program)}

Aturan Utama:
1. Selalu gunakan Bahasa Indonesia yang akademik, santun, jelas, dan mudah dipahami mahasiswa maupun dosen.
2. Sesuaikan saran sumber, kedalaman metodologi, dan sudut pandang riset dengan jenjang (S1/S2/S3) serta program studi pengguna.
3. Bantu mahasiswa merumuskan topik penelitian, menyarankan kata kunci/strategi pencarian, serta merekomendasikan basis data ilmiah yang relevan (OpenAlex, ScienceDirect, Scopus, SpringerLink, Portal Garuda, SINTA, Kandaga Unpad).
4. JANGAN PERNAH mengarang atau memalsukan judul artikel jurnal spesifik, nama penulis, tahun terbit, volume, atau DOI dari ingatan. Jelaskan secara jujur bila Anda tidak dapat memverifikasi artikel tertentu secara langsung dan arahkan pengguna untuk memverifikasinya di fitur Journal Finder (OpenAlex).
5. Format jawaban dengan poin-poin rapi agar mudah dibaca.`;

          const contents = cleanMessages.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          }));

          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents,
            config: {
              systemInstruction,
            },
          });

          const reply = response.text?.trim();
          if (reply) {
            const localMeta = generateLocalAssistantReply(latestMessage, {
              level: (program?.level as 'S1' | 'S2' | 'S3') || 'S1',
              name: program?.name,
              thesisTerm: program?.thesisTerm,
              focusAreas: program?.focusAreas,
              sampleJournalQuery: program?.sampleJournalQuery,
            });
            res.json({
              reply,
              sourceMode: 'gemini',
              suggestedSearchQuery: localMeta.suggestedSearchQuery,
            });
            return;
          }
        } catch (geminiErr) {
          console.error('[FTIP SmartRef /api/chat] Gemini upstream error, falling back:', geminiErr);
        }
      } else {
        console.warn('[FTIP SmartRef /api/chat] GEMINI_API_KEY tidak tersedia, menggunakan mode panduan referensi lokal.');
      }

      // Transparent Local Reference Guidance Fallback
      const localFallback = generateLocalAssistantReply(latestMessage, {
        level: (program?.level as 'S1' | 'S2' | 'S3') || 'S1',
        name: program?.name,
        thesisTerm: program?.thesisTerm,
        focusAreas: program?.focusAreas,
        sampleJournalQuery: program?.sampleJournalQuery,
      });

      res.json({
        reply: localFallback.reply,
        sourceMode: 'local',
        suggestedSearchQuery: localFallback.suggestedSearchQuery,
        modeNotice:
          'Mode Panduan Referensi Lokal aktif karena kunci GEMINI_API_KEY server belum terpasang atau sedang tidak terjangkau.',
      });
    } catch (error) {
      console.error('[FTIP SmartRef /api/chat]', error);
      res.status(500).json({
        error: 'Terjadi kendala saat memproses pertanyaan Anda. Silakan coba beberapa saat lagi.',
      });
    }
  });

  // 2. Smart Keyword Generator Endpoint (Gemini AI + Local Academic Keyword Fallback)
  app.post('/api/keywords', async (req: Request, res: Response) => {
    try {
      const topic = sanitizeText(req.body?.topic, 600);
      const focus = sanitizeText(req.body?.focus, 300);
      const program: ProgramContext | undefined = req.body?.program;

      if (topic.length < 5) {
        res.status(400).json({
          error: 'Masukkan topik riset minimal 5 karakter untuk menghasilkan kata kunci.',
        });
        return;
      }

      const ai = getGeminiClient();

      if (ai) {
        try {
          const prompt = `Analisis topik riset berikut untuk sivitas akademika FTIP Universitas Padjadjaran dan susun strategi kata kunci penelusuran literatur ilmiah.

${buildPersonalizationBlock(program)}

Topik Riset: "${topic}"
${focus ? `Fokus / Metode Tambahan: "${focus}"` : ''}

Instruksi:
- Hasilkan kata kunci utama dalam Bahasa Indonesia dan Bahasa Inggris yang tepat secara terminologi agroindustri, teknologi pangan, atau teknik pertanian.
- Berikan daftar istilah terkait dan sinonim teknis yang sering dipakai di jurnal internasional.
- Susun 3 variasi strategi pencarian Boolean siap pakai menggunakan operator AND, OR, dan NOT (pastikan setidaknya satu kueri mencontohkan operator NOT untuk menyaring konteks di luar topik) serta tanda kutip frasa.
- Berikan daftar kueri pencarian yang disarankan untuk database ilmiah (OpenAlex, ScienceDirect, Scopus, Portal Garuda) dan catatan strategi singkat dalam Bahasa Indonesia sesuai jenjang studi pengguna.`;

          const response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              systemInstruction:
                'Anda adalah pustakawan spesialis literasi informasi ilmiah untuk bidang Teknologi Pertanian, Teknologi Pangan, dan Teknologi Industri Pertanian.',
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
          });

          const rawJson = (response.text ?? '{}').trim();
          const parsed = JSON.parse(rawJson);
          res.json({
            ...parsed,
            sourceMode: 'gemini',
          });
          return;
        } catch (geminiErr) {
          console.error('[FTIP SmartRef /api/keywords] Gemini upstream error, using local fallback:', geminiErr);
        }
      } else {
        console.warn('[FTIP SmartRef /api/keywords] GEMINI_API_KEY tidak tersedia, menggunakan generator kata kunci lokal.');
      }

      // Local Keyword Generator Fallback
      const localResult = generateLocalKeywords(topic, focus, {
        level: (program?.level as 'S1' | 'S2' | 'S3') || 'S1',
        name: program?.name,
        thesisTerm: program?.thesisTerm,
        focusAreas: program?.focusAreas,
      });

      res.json(localResult);
    } catch (error) {
      console.error('[FTIP SmartRef /api/keywords]', error);
      res.status(500).json({
        error: 'Terjadi kendala saat memproses kata kunci. Silakan coba kembali.',
      });
    }
  });

  // 3. OpenAlex Real Scholarly Journal Finder Endpoint
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
      const sortParam =
        req.query.sort === 'year'
          ? 'publication_year:desc'
          : req.query.sort === 'cited'
            ? 'cited_by_count:desc'
            : 'relevance_score:desc';

      const filters: string[] = [];
      if (yearFrom) {
        filters.push(`from_publication_date:${yearFrom}-01-01`);
      }
      if (openAccessOnly) {
        filters.push('is_oa:true');
      }

      const params = new URLSearchParams({
        search: q,
        'per-page': '12',
        sort: sortParam,
        select:
          'id,title,publication_year,authorships,primary_location,open_access,cited_by_count,doi,abstract_inverted_index,type',
      });

      if (filters.length > 0) {
        params.set('filter', filters.join(','));
      }

      const openAlexUrl = `https://api.openalex.org/works?${params.toString()}`;
      const upstreamRes = await fetch(openAlexUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FTIP-SmartRef-Unpad/1.0 (mailto:library.ftip@unpad.ac.id)',
        },
      });

      const upstreamContentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
      if (!upstreamRes.ok || !upstreamContentType.includes('application/json')) {
        const bodyPreview = await upstreamRes.text().catch(() => '');
        console.error(
          `[FTIP SmartRef /api/journals] Upstream OpenAlex error ${upstreamRes.status} (${upstreamContentType}):`,
          bodyPreview.slice(0, 200)
        );
        res.status(502).json({
          error:
            'Layanan pencarian OpenAlex sedang mengalami gangguan sementara. Silakan coba kembali beberapa saat lagi.',
        });
        return;
      }

      const data = (await upstreamRes.json()) as {
        meta?: { count?: number };
        results?: Array<Record<string, unknown>>;
      };

      const articles = (Array.isArray(data.results) ? data.results : []).map((work) => {
        const authorships = Array.isArray(work.authorships) ? work.authorships : [];
        const authors = authorships
          .slice(0, 5)
          .map((a) => {
            const authorObj = (a as Record<string, unknown>)?.author as
              | Record<string, unknown>
              | undefined;
            return typeof authorObj?.display_name === 'string' ? authorObj.display_name : '';
          })
          .filter(Boolean);

        const primaryLocation = work.primary_location as Record<string, unknown> | undefined;
        const source = primaryLocation?.source as Record<string, unknown> | undefined;
        const openAccess = work.open_access as Record<string, unknown> | undefined;

        const doiUrl = sanitizeSafeHttpUrl(work.doi);
        const landingUrl =
          sanitizeSafeHttpUrl(openAccess?.oa_url) ||
          sanitizeSafeHttpUrl(primaryLocation?.landing_page_url) ||
          doiUrl ||
          sanitizeSafeHttpUrl(work.id);

        return {
          id: typeof work.id === 'string' ? work.id : crypto.randomUUID(),
          title:
            typeof work.title === 'string' && work.title.trim()
              ? work.title.trim()
              : 'Judul tidak tersedia',
          authors: authors.length > 0 ? authors : ['Penulis tidak tercantum'],
          publicationYear: typeof work.publication_year === 'number' ? work.publication_year : null,
          sourceName:
            typeof source?.display_name === 'string' && source.display_name.trim()
              ? source.display_name.trim()
              : 'Sumber jurnal / repositori ilmiah',
          isOpenAccess: Boolean(openAccess?.is_oa),
          citedByCount: typeof work.cited_by_count === 'number' ? work.cited_by_count : 0,
          doiUrl,
          landingUrl,
          abstractSnippet: reconstructAbstract(work.abstract_inverted_index),
          type: typeof work.type === 'string' ? work.type : 'article',
        };
      });

      res.json({
        totalCount: typeof data.meta?.count === 'number' ? data.meta.count : articles.length,
        articles,
      });
    } catch (error) {
      console.error('[FTIP SmartRef /api/journals]', error);
      res.status(502).json({
        error:
          'Gagal mengambil metadata artikel dari OpenAlex API. Periksa koneksi jaringan atau coba kata kunci lain.',
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
return app;
}