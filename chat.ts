import {
  GEMINI_MODEL,
  buildChatSystemInstruction,
  classifyGeminiError,
  sanitizeText,
  searchAcademicWorks,
} from '../../src/utils/academicCore.ts';
import type { IncomingMessage, ProgramContext } from '../../src/utils/academicCore.ts';
import type { JournalArticle } from '../../src/types/smartref.ts';
import { callGeminiRest, jsonResponse, readJsonBody } from '../_shared/cfTypes.ts';
import type {
  CfPagesHandler,
  GeminiRestContent,
  GeminiRestPart,
} from '../_shared/cfTypes.ts';

const SEARCH_TOOL_DECLARATION = {
  name: 'searchAcademicLiterature',
  description:
    'Cari publikasi ilmiah nyata dan terverifikasi dari basis data OpenAlex dan Crossref menggunakan kueri Bahasa Inggris akademik yang ringkas dan akurat. Gunakan alat ini setiap kali pengguna meminta referensi/jurnal/literatur, atau saat pengguna mengeksplorasi suatu topik riset dan contoh artikel terverifikasi akan memperkaya jawaban.',
  parameters: {
    type: 'OBJECT',
    properties: {
      englishQuery: {
        type: 'STRING',
        description:
          'Kueri pencarian akademik Bahasa Inggris yang ringkas dan spesifik (3-7 kata, tanpa operator NOT panjang), mis. "machine learning crop quality prediction", "coffee drying temperature sensory quality", atau "edible coating fruit shelf life".',
      },
      yearFrom: {
        type: 'INTEGER',
        description: 'Tahun terbit minimum (opsional, misalnya 2019 atau 2020 untuk literatur mutakhir).',
      },
    },
    required: ['englishQuery'],
  },
};

export const onRequestPost: CfPagesHandler = async ({ request, env }) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      return jsonResponse({ error: 'Permintaan JSON tidak valid.' }, 400);
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const program = body?.program as ProgramContext | undefined;
    const hasExplicitProgram = body?.hasExplicitProgram === true;

    const cleanMessages: IncomingMessage[] = rawMessages
      .slice(-16)
      .map((m: unknown): IncomingMessage => {
        const obj = m as Record<string, unknown>;
        const role = obj?.role === 'model' ? 'model' : 'user';
        const text = sanitizeText(obj?.text, 3000);
        return { role, text };
      })
      .filter((m) => m.text.length > 0);

    if (cleanMessages.length === 0 || cleanMessages[cleanMessages.length - 1].role !== 'user') {
      return jsonResponse({ error: 'Pesan pertanyaan tidak boleh kosong.' }, 400);
    }

    const apiKey = env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return jsonResponse(
        {
          errorCode: 'MISSING_GEMINI_API_KEY',
          error:
            'Asisten AI Gemini belum aktif karena GEMINI_API_KEY belum dikonfigurasi pada server Cloudflare Pages. Tambahkan GEMINI_API_KEY pada Environment Variables (Secrets) proyek Cloudflare Pages Anda. Fitur Journal Finder tetap dapat digunakan secara langsung.',
        },
        503
      );
    }

    const systemInstruction = buildChatSystemInstruction(
      program,
      hasExplicitProgram,
      cleanMessages
    );

    const contents: GeminiRestContent[] = cleanMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const verifiedArticlesMap = new Map<string, JournalArticle>();
    let lastSuggestedQuery: string | undefined;
    let finalReply = '';

    for (let round = 0; round < 3; round++) {
      const response = await callGeminiRest(apiKey, GEMINI_MODEL, {
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: [{ functionDeclarations: [SEARCH_TOOL_DECLARATION] }],
      });

      const candidateContent = response.candidates?.[0]?.content;
      const parts: GeminiRestPart[] = Array.isArray(candidateContent?.parts)
        ? candidateContent.parts
        : [];
      const functionCalls = parts.filter((p) => Boolean(p.functionCall));

      if (functionCalls.length === 0 || !candidateContent) {
        finalReply = parts
          .map((p) => p.text || '')
          .join('')
          .trim();
        break;
      }

      contents.push(candidateContent);

      const functionResponseParts: GeminiRestPart[] = [];
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
              ...(fc.id ? { id: fc.id } : {}),
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
        finalReply = parts
          .map((p) => p.text || '')
          .join('')
          .trim();
        break;
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    if (!finalReply) {
      return jsonResponse(
        {
          errorCode: 'GEMINI_EMPTY_RESPONSE',
          error:
            'Gemini AI tidak mengembalikan teks jawaban yang valid. Silakan kirim ulang pertanyaan Anda.',
        },
        502
      );
    }

    return jsonResponse({
      reply: finalReply,
      sourceMode: 'gemini',
      suggestedSearchQuery: lastSuggestedQuery,
      verifiedArticles: Array.from(verifiedArticlesMap.values()).slice(0, 5),
    });
  } catch (error) {
    console.error('[CF Pages /api/chat]', error);
    const classified = classifyGeminiError(error);
    return jsonResponse(
      {
        errorCode: classified.errorCode,
        error: classified.message,
      },
      classified.httpStatus
    );
  }
};
