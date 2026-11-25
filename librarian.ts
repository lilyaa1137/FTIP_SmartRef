import { sanitizeText } from '../../src/utils/academicCore.ts';
import { jsonResponse, readJsonBody } from '../_shared/cfTypes.ts';
import type { CfPagesHandler } from '../_shared/cfTypes.ts';

export const onRequestPost: CfPagesHandler = async ({ request }) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(request);
    } catch {
      return jsonResponse({ error: 'Permintaan JSON tidak valid.' }, 400);
    }

    const name = sanitizeText(body?.name, 120);
    const email = sanitizeText(body?.email, 140);
    const programLabel = sanitizeText(body?.programLabel, 140);
    const category = sanitizeText(body?.category, 80);
    const question = sanitizeText(body?.question, 2000);

    if (name.length < 2) {
      return jsonResponse({ error: 'Nama lengkap wajib diisi minimal 2 karakter.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Format alamat email tidak valid.' }, 400);
    }
    if (!programLabel) {
      return jsonResponse({ error: 'Silakan pilih program studi dan jenjang.' }, 400);
    }
    if (question.length < 10) {
      return jsonResponse(
        { error: 'Pertanyaan referensi wajib diisi minimal 10 karakter.' },
        400
      );
    }

    const now = new Date();
    const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const randomBytes = new Uint8Array(2);
    crypto.getRandomValues(randomBytes);
    const suffix = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    const ticketId = `REF-FTIP-${dateCode}-${suffix}`;

    return jsonResponse(
      {
        ticketId,
        createdAt: now.toISOString(),
        name,
        programLabel,
        category: category || 'Penelusuran Literatur',
        status: 'Tercatat di Layanan Digital FTIP',
        modeNote:
          'Tiket pertanyaan Anda telah dibuat. Untuk pengiriman otomatis ke meja pustakawan Unpad pada mode serverless Cloudflare Pages, hubungkan endpoint ini ke layanan email transaksional atau sistem helpdesk kampus.',
      },
      201
    );
  } catch (error) {
    console.error('[CF Pages /api/librarian]', error);
    return jsonResponse({ error: 'Gagal memproses pertanyaan Anda. Silakan coba kembali.' }, 500);
  }
};
