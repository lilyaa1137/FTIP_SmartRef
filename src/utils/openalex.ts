import { JournalArticle } from '../types/smartref';
import { safeFetchJson } from './safeFetch';

export interface JournalSearchResponse {
  totalCount: number;
  articles: JournalArticle[];
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

export async function searchOpenAlexDirect(options: {
  query: string;
  yearFrom?: string;
  sortBy: 'relevance' | 'year' | 'cited';
  openAccessOnly: boolean;
}): Promise<JournalSearchResponse> {
  const cleanQuery = options.query.trim();
  const sortParam =
    options.sortBy === 'year'
      ? 'publication_year:desc'
      : options.sortBy === 'cited'
        ? 'cited_by_count:desc'
        : 'relevance_score:desc';

  const filters: string[] = [];
  const yrNum = Number(options.yearFrom);
  if (options.yearFrom && Number.isInteger(yrNum) && yrNum >= 1950 && yrNum <= 2030) {
    filters.push(`from_publication_date:${yrNum}-01-01`);
  }
  if (options.openAccessOnly) {
    filters.push('is_oa:true');
  }

  const params = new URLSearchParams({
    search: cleanQuery,
    'per-page': '12',
    sort: sortParam,
    select:
      'id,title,publication_year,authorships,primary_location,open_access,cited_by_count,doi,abstract_inverted_index,type',
  });

  if (filters.length > 0) {
    params.set('filter', filters.join(','));
  }

  const openAlexUrl = `https://api.openalex.org/works?${params.toString()}`;
  const data = await safeFetchJson<{
    meta?: { count?: number };
    results?: Array<Record<string, unknown>>;
  }>(
    openAlexUrl,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    'Layanan pencarian OpenAlex sedang tidak dapat diakses. Silakan coba beberapa saat lagi.'
  );

  const rawResults = Array.isArray(data.results) ? data.results : [];
  const articles: JournalArticle[] = rawResults.map((work, index) => {
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
      id: typeof work.id === 'string' ? work.id : `openalex-${index}`,
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

  return {
    totalCount: typeof data.meta?.count === 'number' ? data.meta.count : articles.length,
    articles,
  };
}
