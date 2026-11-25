import { sanitizeText, searchAcademicWorks } from '../../src/utils/academicCore.ts';
import { jsonResponse } from '../_shared/cfTypes.ts';
import type { CfPagesHandler } from '../_shared/cfTypes.ts';

export const onRequestGet: CfPagesHandler = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const q = sanitizeText(url.searchParams.get('q'), 240);
    if (q.length < 2) {
      return jsonResponse(
        { error: 'Masukkan minimal 2 karakter kata kunci untuk mencari artikel jurnal.' },
        400
      );
    }

    const yearFromRaw = Number(url.searchParams.get('yearFrom'));
    const yearFrom =
      Number.isInteger(yearFromRaw) && yearFromRaw >= 1950 && yearFromRaw <= 2030
        ? yearFromRaw
        : null;
    const openAccessOnly = url.searchParams.get('openAccess') === 'true';
    const sortQuery = url.searchParams.get('sort');
    const sortParam: 'relevance' | 'year' | 'cited' =
      sortQuery === 'year' ? 'year' : sortQuery === 'cited' ? 'cited' : 'relevance';

    const result = await searchAcademicWorks(q, {
      perPage: 12,
      yearFrom,
      openAccessOnly,
      sort: sortParam,
      timeoutMs: 7000,
    });

    return jsonResponse({
      totalCount: result.totalCount,
      articles: result.articles,
    });
  } catch (error) {
    console.error('[CF Pages /api/journals]', error);
    return jsonResponse(
      {
        error:
          'Gagal mengambil metadata artikel dari OpenAlex maupun Crossref API. Periksa koneksi jaringan atau coba kata kunci lain.',
      },
      502
    );
  }
};
