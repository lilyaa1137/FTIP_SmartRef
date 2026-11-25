import type { JournalArticle } from '../types/smartref.ts';
import {
  detectProgramFromText,
  normalizeAcademicQuery,
} from './programDetection.ts';

export const GEMINI_MODEL = 'gemini-4-hydrogen';

export interface ProgramContext {
  id?: string;
  level?: string;
  name?: string;
  thesisTerm?: string;
  focusAreas?: string[];
  sampleJournalQuery?: string;
}

export interface IncomingMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AcademicSearchOptions {
  perPage?: number;
  yearFrom?: number | null;
  openAccessOnly?: boolean;
  sort?: 'relevance' | 'year' | 'cited';
  timeoutMs?: number;
}

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function sanitizeSafeHttpUrl(urlValue: unknown): string | null {
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

export function stripXmlTags(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function reconstructAbstract(invertedIndex: unknown, maxWords = 48): string | null {
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

export function mapOpenAlexWork(work: Record<string, unknown>): JournalArticle {
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
    sourceProvider: 'OpenAlex',
  };
}

export function mapCrossrefItem(item: Record<string, unknown>): JournalArticle {
  const rawTitle = Array.isArray(item.title) ? item.title[0] : item.title;
  const title =
    typeof rawTitle === 'string' && rawTitle.trim()
      ? stripXmlTags(rawTitle)
      : 'Judul tidak tersedia';

  const rawAuthors = Array.isArray(item.author) ? item.author : [];
  const authors = rawAuthors
    .slice(0, 5)
    .map((a) => {
      const obj = a as Record<string, unknown>;
      const given = typeof obj?.given === 'string' ? obj.given.trim() : '';
      const family = typeof obj?.family === 'string' ? obj.family.trim() : '';
      return `${given} ${family}`.trim();
    })
    .filter(Boolean);

  const issued = item.issued as { 'date-parts'?: unknown } | undefined;
  const dateParts = Array.isArray(issued?.['date-parts']) ? issued['date-parts'] : [];
  const firstYear =
    Array.isArray(dateParts[0]) && typeof dateParts[0][0] === 'number' ? dateParts[0][0] : null;

  const container = Array.isArray(item['container-title'])
    ? item['container-title'][0]
    : item['container-title'];

  const doiRaw = typeof item.DOI === 'string' && item.DOI.trim() ? item.DOI.trim() : null;
  const doiUrl = doiRaw ? `https://doi.org/${doiRaw}` : null;
  const landingUrl = sanitizeSafeHttpUrl(item.URL) || doiUrl;

  const abstractRaw =
    typeof item.abstract === 'string' && item.abstract.trim() ? stripXmlTags(item.abstract) : null;
  const abstractSnippet = abstractRaw
    ? abstractRaw.split(/\s+/).slice(0, 48).join(' ') +
      (abstractRaw.split(/\s+/).length > 48 ? '...' : '')
    : null;

  return {
    id: doiUrl || (typeof item.URL === 'string' ? item.URL : crypto.randomUUID()),
    title,
    authors: authors.length > 0 ? authors : ['Penulis tidak tercantum'],
    publicationYear: firstYear,
    sourceName:
      typeof container === 'string' && container.trim()
        ? stripXmlTags(container)
        : 'Sumber jurnal / Crossref',
    isOpenAccess: false,
    citedByCount:
      typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : 0,
    doiUrl,
    landingUrl,
    abstractSnippet,
    type: typeof item.type === 'string' ? item.type : 'article',
    sourceProvider: 'Crossref',
  };
}

export async function searchOpenAlexWorks(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<{ totalCount: number; articles: JournalArticle[] }> {
  const perPage = options.perPage ?? 12;
  const timeoutMs = options.timeoutMs ?? 6000;
  const sortParam =
    options.sort === 'year'
      ? 'publication_year:desc'
      : options.sort === 'cited'
        ? 'cited_by_count:desc'
        : 'relevance_score:desc';

  const filters: string[] = [];
  if (options.yearFrom) {
    filters.push(`from_publication_date:${options.yearFrom}-01-01`);
  }
  if (options.openAccessOnly) {
    filters.push('is_oa:true');
  }

  const runOpenAlexFetch = async (qStr: string) => {
    const params = new URLSearchParams({
      search: qStr,
      'per-page': String(perPage),
      sort: sortParam,
      select:
        'id,title,publication_year,authorships,primary_location,open_access,cited_by_count,doi,abstract_inverted_index,type',
    });
    if (filters.length > 0) {
      params.set('filter', filters.join(','));
    }

    const url = `https://api.openalex.org/works?${params.toString()}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FTIP-SmartRef-Unpad/1.0 (mailto:library.ftip@unpad.ac.id)',
      },
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error(`OpenAlex HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      meta?: { count?: number };
      results?: Array<Record<string, unknown>>;
    };
    const articles = (Array.isArray(data.results) ? data.results : []).map((w) =>
      mapOpenAlexWork(w)
    );
    return {
      totalCount: typeof data.meta?.count === 'number' ? data.meta.count : articles.length,
      articles,
    };
  };

  const firstTry = await runOpenAlexFetch(query);
  if (firstTry.articles.length > 0) {
    return firstTry;
  }

  const normalized = normalizeAcademicQuery(query);
  if (normalized && normalized !== query) {
    return runOpenAlexFetch(normalized);
  }
  return firstTry;
}

export async function searchCrossrefWorks(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<{ totalCount: number; articles: JournalArticle[] }> {
  const normalized = normalizeAcademicQuery(query) || query.trim();
  const perPage = options.perPage ?? 12;
  const timeoutMs = options.timeoutMs ?? 6000;

  const params = new URLSearchParams({
    query: normalized,
    rows: String(perPage),
    select: 'DOI,title,author,issued,container-title,is-referenced-by-count,URL,abstract,type',
  });

  if (options.sort === 'year') {
    params.set('sort', 'published');
    params.set('order', 'desc');
  } else if (options.sort === 'cited') {
    params.set('sort', 'is-referenced-by-count');
    params.set('order', 'desc');
  }

  if (options.yearFrom) {
    params.set('filter', `from-pub-date:${options.yearFrom}-01-01`);
  }

  const url = `https://api.crossref.org/works?${params.toString()}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'FTIP-SmartRef-Unpad/1.0 (mailto:library.ftip@unpad.ac.id)',
    },
  });
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok || !ct.includes('application/json')) {
    throw new Error(`Crossref HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    message?: {
      'total-results'?: number;
      items?: Array<Record<string, unknown>>;
    };
  };
  const items = Array.isArray(data.message?.items) ? data.message.items : [];
  const articles = items.map((item) => mapCrossrefItem(item));
  return {
    totalCount:
      typeof data.message?.['total-results'] === 'number'
        ? data.message['total-results']
        : articles.length,
    articles,
  };
}

export async function searchAcademicWorks(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<{ totalCount: number; articles: JournalArticle[] }> {
  try {
    const oa = await searchOpenAlexWorks(query, options);
    if (oa.articles.length > 0 || options.openAccessOnly) {
      return oa;
    }
  } catch (oaErr) {
    console.warn('[FTIP SmartRef searchAcademicWorks] OpenAlex fallback to Crossref:', oaErr);
  }

  if (options.openAccessOnly) {
    return { totalCount: 0, articles: [] };
  }

  return searchCrossrefWorks(query, options);
}

export function buildPersonalizationBlock(
  program?: ProgramContext,
  hasExplicitProgram = false,
  conversationMessages?: IncomingMessage[]
): string {
  let detectedName: string | undefined;
  let detectedLevel: 'S1' | 'S2' | 'S3' | undefined;

  if (Array.isArray(conversationMessages)) {
    for (const msg of conversationMessages) {
      if (msg.role === 'user') {
        const found = detectProgramFromText(msg.text);
        if (found.programName) detectedName = found.programName;
        if (found.level) detectedLevel = found.level;
      }
    }
  }

  const effectiveName = detectedName || (hasExplicitProgram ? sanitizeText(program?.name, 100) : '');
  const effectiveLevel =
    detectedLevel || (hasExplicitProgram ? sanitizeText(program?.level, 10) : '');

  if (!effectiveName) {
    return `Konteks Akademik Pengguna:
- Pengguna belum memilih atau menyebutkan program studi maupun jenjang (S1/S2/S3) secara eksplisit.
- JANGAN berasumsi bahwa pengguna berasal dari S1 Teknologi Pangan.
- Topik yang ditanyakan dapat berasal dari Teknologi Pangan, Teknologi Industri Pertanian, Teknik Pertanian/Biosistem, Sosial Ekonomi Pertanian/Agribisnis, atau bidang interdisipliner lainnya.
- Hanya tanyakan program studi atau jenjangnya secara singkat bila informasi tersebut benar-benar diperlukan untuk mempertajam arahan.`;
  }

  const level = effectiveLevel || 'S1';
  const thesisTerm =
    level === 'S2'
      ? 'Tesis'
      : level === 'S3'
        ? 'Disertasi'
        : sanitizeText(program?.thesisTerm, 60) || 'Skripsi / Tugas Akhir';
  const focus =
    effectiveName === program?.name && Array.isArray(program?.focusAreas)
      ? program.focusAreas.map((f) => sanitizeText(f, 80)).filter(Boolean).join(', ')
      : '';

  let depthGuidance =
    'Sesuaikan kedalaman untuk jenjang S1: arahkan pada variabel yang realistis diuji, desain penelitian yang jelas, dan acuan metode standar.';
  if (level === 'S2') {
    depthGuidance =
      'Sesuaikan kedalaman untuk Magister (S2): tekankan pemetaan research gap, optimasi/pemodelan multi-faktor, perbandingan metodologi, dan tinjauan literatur sistematis.';
  } else if (level === 'S3') {
    depthGuidance =
      'Sesuaikan kedalaman untuk Doktor (S3): tekankan state-of-the-art, kebaruan ilmiah (novelty) fundamental, sintesis PRISMA, dan perspektif lintas disiplin.';
  }

  return `Profil Akademik Pengguna:
- Jenjang: ${level} (${thesisTerm})
- Program Studi: ${effectiveName} (FTIP / Ilmu Pertanian & Agroindustri, Universitas Padjadjaran)
${focus ? `- Bidang Fokus Utama: ${focus}\n` : ''}- Panduan Kedalaman: ${depthGuidance}`;
}

export function buildChatSystemInstruction(
  program: ProgramContext | undefined,
  hasExplicitProgram: boolean,
  cleanMessages: IncomingMessage[]
): string {
  return `Anda adalah FTIP SmartRef, pustakawan referensi akademik berbasis AI di Perpustakaan Fakultas Teknologi Industri Pertanian (FTIP), Universitas Padjadjaran (Unpad).

Cakupan Keilmuan:
Anda memahami secara dinamis berbagai topik riset di bidang Teknologi Pangan, Teknologi Industri Pertanian & Agroindustri, Teknik Pertanian & Biosistem, Sosial Ekonomi Pertanian / Agribisnis, ilmu pangan dan pertanian, kecerdasan buatan/machine learning di sektor agro, biopolimer/lingkungan, hingga topik lintas disiplin terkait.

${buildPersonalizationBlock(program, hasExplicitProgram, cleanMessages)}

Prinsip Layanan & Kecerdasan Percakapan:
1. Pahami topik dan maksud pengguna secara dinamis sesuai konteks pertanyaannya—JANGAN terpaku pada topik tertentu dan JANGAN memberi jawaban template yang kaku atau berulang.
2. Gunakan Bahasa Indonesia yang natural, santun, informatif, dan langsung menjawab inti kebutuhan pengguna. Hindari mengulang kata kunci pengguna secara mekanis tanpa memberi wawasan ilmiah.
3. Sesuaikan struktur dan kedalaman jawaban dengan jenis pertanyaan:
   - Sapaan atau pertanyaan awal umum: jawab ringkas dan ramah, tawarkan bantuan eksplorasi topik, dan tanyakan minat riset atau latar belakang program studinya jika relevan.
   - Eksplorasi topik atau pencarian ide penelitian (apa pun topiknya—misalnya machine learning kualitas pertanian, suhu pengeringan kopi, bioplastik limbah pertanian, rantai pasok, dsb.): jelaskan konsep dasarnya secara mudah dipahami, tawarkan 3–4 arah riset yang spesifik, sertakan beberapa contoh rancangan judul (tandai sebagai gagasan awal), identifikasi variabel bebas/terikat dan metode atau disiplin ilmu terkait, bantu mengerucutkan topik menjadi pertanyaan penelitian, serta berikan kata kunci (Indonesia & Inggris), sinonim teknis, dan contoh kueri Boolean (AND, OR, NOT).
   - Pertanyaan metodologi/analisis: jabarkan variabel, rancangan penelitian/percobaan atau kerangka analisis (kuantitatif/kualitatif/pemodelan), parameter ukur, dan standar relevan (misalnya SNI, AOAC, ISO, ASTM, Codex) jika sesuai.
   - Permintaan pencarian referensi/jurnal: selalu panggil alat \`searchAcademicLiterature\` dengan kueri Bahasa Inggris akademik yang tepat, lalu sajikan referensi terverifikasi yang ditemukan secara terpisah dan jelas dari kata kunci pencarian yang disarankan maupun ide riset awal.
4. Anda juga dianjurkan memanggil \`searchAcademicLiterature\` saat membahas topik riset spesifik agar dapat menyertakan 2–4 referensi ilmiah nyata dari OpenAlex/Crossref sebagai titik awal bacaan mahasiswa.
5. INTEGRITAS ILMIAH (MUTLAK):
   - JANGAN PERNAH mengarang, menebak, atau memalsukan judul artikel, nama penulis, tahun terbit, nama jurnal, atau DOI dari ingatan.
   - Hanya cantumkan artikel sebagai referensi terverifikasi jika artikel tersebut benar-benar dikembalikan oleh alat \`searchAcademicLiterature\`.
   - Jika pencarian alat tidak menghasilkan artikel yang cukup atau sedang bermasalah, sampaikan secara jujur dan arahkan pengguna untuk menyempurnakan kata kunci di Journal Finder (OpenAlex/Crossref) atau basis data seperti Google Scholar, ScienceDirect, SpringerLink, PubMed, SINTA, Portal Garuda, dan Repositori Unpad.
   - Bedakan secara tegas antara: (a) Referensi Terverifikasi hasil penelusuran alat, (b) Kata Kunci & Kueri Pencarian yang disarankan, dan (c) Ide/Contoh Judul Penelitian Awal.`;
}

export function buildKeywordPrompt(
  topic: string,
  focus: string,
  program: ProgramContext | undefined,
  hasExplicitProgram: boolean
): string {
  return `Analisis topik riset berikut secara dinamis untuk mahasiswa atau peneliti di lingkungan FTIP / ilmu pertanian dan agroindustri Universitas Padjadjaran, lalu susun strategi kata kunci penelusuran literatur ilmiah.

${buildPersonalizationBlock(program, hasExplicitProgram)}

Topik Riset: "${topic}"
${focus ? `Fokus / Metode Tambahan: "${focus}"` : ''}

Instruksi:
- Tangkap inti permasalahan ilmiah dari topik secara tepat (apa pun bidangnya: teknologi pangan, teknik pertanian, teknologi industri pertanian, sosial ekonomi pertanian, machine learning pertanian, biopolimer, dll.).
- Hasilkan kata kunci utama dalam Bahasa Indonesia dan Bahasa Inggris yang akurat secara terminologi ilmiah.
- Berikan daftar istilah terkait dan sinonim teknis yang sering dipakai pada jurnal bereputasi.
- Susun 3 variasi strategi pencarian Boolean siap pakai menggunakan operator AND, OR, dan NOT serta tanda kutip frasa.
- Berikan daftar kueri pencarian Bahasa Inggris yang ringkas dan bersih (tanpa kata sambung Indonesia) untuk langsung dijalankan di OpenAlex, Crossref, ScienceDirect, Scopus, dan Portal Garuda, disertai catatan strategi singkat dalam Bahasa Indonesia.`;
}

export function classifyGeminiError(err: unknown): {
  httpStatus: number;
  errorCode: string;
  message: string;
} {
  const rawMessage = err instanceof Error ? err.message : String(err || '');
  const upper = rawMessage.toUpperCase();
  const statusProp =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : NaN;

  if (
    statusProp === 403 ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('API_KEY_INVALID') ||
    (statusProp === 400 && upper.includes('API KEY'))
  ) {
    return {
      httpStatus: statusProp === 400 ? 400 : 403,
      errorCode: 'INVALID_GEMINI_API_KEY',
      message:
        'Kunci GEMINI_API_KEY tidak valid atau tidak memiliki izin akses. Silakan periksa kembali API key Anda di panel Settings > Secrets atau konfigurasi environment server.',
    };
  }

  if (statusProp === 429 || upper.includes('RESOURCE_EXHAUSTED') || upper.includes('QUOTA')) {
    return {
      httpStatus: 429,
      errorCode: 'GEMINI_RATE_LIMIT',
      message:
        'Batas kuota permintaan Gemini API sedang tercapai. Silakan tunggu beberapa saat sebelum mencoba lagi, atau periksa kuota API key Anda.',
    };
  }

  if (statusProp === 404 || upper.includes('NOT_FOUND')) {
    return {
      httpStatus: 502,
      errorCode: 'GEMINI_MODEL_NOT_FOUND',
      message:
        'Model Gemini yang dikonfigurasi tidak ditemukan atau tidak didukung. Silakan periksa konfigurasi model pada server.',
    };
  }

  return {
    httpStatus: 502,
    errorCode: 'GEMINI_UPSTREAM_ERROR',
    message:
      'Layanan Gemini AI sedang mengalami gangguan koneksi sementara. Silakan coba kembali beberapa saat lagi.',
  };
}

export function isRetryableGeminiError(err: unknown): boolean {
  const rawMessage = err instanceof Error ? err.message : String(err || '');
  const upper = rawMessage.toUpperCase();
  const statusProp =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : NaN;

  if (statusProp === 400 || statusProp === 401 || statusProp === 403 || statusProp === 404) {
    return false;
  }
  if (upper.includes('PERMISSION_DENIED') || upper.includes('API_KEY_INVALID')) {
    return false;
  }
  return statusProp === 500 || statusProp === 503 || upper.includes('UNAVAILABLE') || upper.includes('TIMEOUT');
}
