import {
  GEMINI_MODEL,
  buildKeywordPrompt,
  classifyGeminiError,
  sanitizeText,
} from '../../src/utils/academicCore.ts';
import type { ProgramContext } from '../../src/utils/academicCore.ts';
import { callGeminiRest, jsonResponse, readJsonBody } from '../_shared/cfTypes.ts';
import type { CfPagesHandler } from '../_shared/cfTypes.ts';

export const onRequestPost: CfPagesHandler = async ({ request, env }) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      return jsonResponse({ error: 'Permintaan JSON tidak valid.' }, 400);
    }

    const topic = sanitizeText(body?.topic, 600);
    const focus = sanitizeText(body?.focus, 300);
    const program = body?.program as ProgramContext | undefined;
    const hasExplicitProgram = body?.hasExplicitProgram === true;

    if (topic.length < 5) {
      return jsonResponse(
        { error: 'Masukkan topik riset minimal 5 karakter untuk menghasilkan kata kunci.' },
        400
      );
    }

    const apiKey = env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return jsonResponse(
        {
          errorCode: 'MISSING_GEMINI_API_KEY',
          error:
            'Smart Keyword Generator AI belum aktif karena GEMINI_API_KEY belum dikonfigurasi pada server Cloudflare Pages. Tambahkan GEMINI_API_KEY di Environment Variables (Secrets).',
        },
        503
      );
    }

    const prompt = buildKeywordPrompt(topic, focus, program, hasExplicitProgram);

    const response = await callGeminiRest(apiKey, GEMINI_MODEL, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [
          {
            text: 'Anda adalah pustakawan spesialis literasi informasi ilmiah untuk bidang Teknologi Pangan, Teknik Pertanian, Teknologi Industri Pertanian, Sosial Ekonomi Pertanian, dan ilmu pertanian interdisipliner.',
          },
        ],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            kataKunciIndonesia: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            kataKunciInggris: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            sinonimTeknis: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  istilah: { type: 'STRING' },
                  padanan: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                },
                required: ['istilah', 'padanan'],
              },
            },
            strategiBoolean: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  label: { type: 'STRING' },
                  query: { type: 'STRING' },
                  targetDatabase: { type: 'STRING' },
                },
                required: ['label', 'query', 'targetDatabase'],
              },
            },
            istilahPencarianDisarankan: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            catatanStrategi: {
              type: 'STRING',
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

    const parts = response.candidates?.[0]?.content?.parts || [];
    const rawJson = parts
      .map((p) => p.text || '')
      .join('')
      .trim();
    const parsed = JSON.parse(rawJson || '{}');

    return jsonResponse({
      ...parsed,
      sourceMode: 'gemini',
    });
  } catch (error) {
    console.error('[CF Pages /api/keywords]', error);
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
