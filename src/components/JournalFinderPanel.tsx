import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, BookOpen, ExternalLink, Search } from 'lucide-react';
import { JournalArticle, StudyProgram } from '../types/smartref';
import { ApiResponseError, safeFetchJson } from '../utils/safeFetch';
import { JournalSearchResponse, searchOpenAlexDirect } from '../utils/openalex';

interface JournalFinderPanelProps {
  selectedProgram: StudyProgram;
  externalQuery?: string;
  externalTrigger?: number;
}

export function JournalFinderPanel({
  selectedProgram,
  externalQuery,
  externalTrigger,
}: JournalFinderPanelProps) {
  const [query, setQuery] = useState(selectedProgram.sampleJournalQuery);
  const [yearFrom, setYearFrom] = useState<string>('2020');
  const [sortBy, setSortBy] = useState<'relevance' | 'year' | 'cited'>('relevance');
  const [openAccessOnly, setOpenAccessOnly] = useState(false);

  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runSearch = async (
    searchQuery: string,
    yr: string = yearFrom,
    srt: 'relevance' | 'year' | 'cited' = sortBy,
    oa: boolean = openAccessOnly
  ) => {
    const clean = searchQuery.trim();
    if (clean.length < 2) {
      setErrorMessage('Masukkan minimal 2 karakter kata kunci pencarian.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q: clean,
        sort: srt,
        openAccess: String(oa),
      });
      if (yr) {
        params.set('yearFrom', yr);
      }

      let data: JournalSearchResponse;
      try {
        data = await safeFetchJson<JournalSearchResponse>(
          `/api/journals?${params.toString()}`,
          { headers: { Accept: 'application/json' } },
          'Layanan pencarian jurnal sedang tidak tersedia. Silakan coba beberapa saat lagi.'
        );
      } catch (err) {
        if (err instanceof ApiResponseError && (err.isNonJsonHtml || err.status === 404)) {
          data = await searchOpenAlexDirect({
            query: clean,
            yearFrom: yr,
            sortBy: srt,
            openAccessOnly: oa,
          });
        } else {
          throw err;
        }
      }

      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : 0);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Layanan pencarian jurnal sementara tidak tersedia. Silakan coba beberapa saat lagi.'
      );
      setArticles([]);
      setTotalCount(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (externalQuery && externalTrigger && externalTrigger > 0) {
      setQuery(externalQuery);
      void runSearch(externalQuery, yearFrom, sortBy, openAccessOnly);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTrigger]);

  useEffect(() => {
    if (!hasSearched) {
      setQuery(selectedProgram.sampleJournalQuery);
    }
  }, [selectedProgram, hasSearched]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(query, yearFrom, sortBy, openAccessOnly);
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-5 sm:p-6 space-y-4"
      >
        <div>
          <h3 className="font-serif text-lg font-medium text-[#193C32]">
            Journal Finder
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[#333333]/75">
            Penelusuran metadata artikel ilmiah nyata—judul, penulis, tahun terbit, sumber
            publikasi, dan tautan artikel—melalui OpenAlex API.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="openalex-query" className="sr-only">
              Kata kunci pencarian artikel ilmiah
            </label>
            <input
              id="openalex-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masukkan kata kunci artikel ilmiah atau kueri Boolean..."
              className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 text-sm text-[#333333] placeholder:text-[#333333]/45 focus:outline-none focus:border-[#193C32]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || query.trim().length < 2}
            className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#193C32] text-[#FFFFFF] text-sm font-medium hover:bg-[#245744] disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" strokeWidth={1.5} />
            <span>{isLoading ? 'Menelusuri...' : 'Cari Artikel'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#333333]">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-year" className="text-[#333333]/70">
              Tahun Terbit:
            </label>
            <select
              id="filter-year"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              className="h-9 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-2.5 text-xs text-[#333333] focus:outline-none focus:border-[#193C32]"
            >
              <option value="">Semua Tahun</option>
              <option value="2024">Sejak 2024</option>
              <option value="2022">Sejak 2022</option>
              <option value="2020">Sejak 2020</option>
              <option value="2016">10 Tahun Terakhir</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-sort" className="text-[#333333]/70">
              Urutkan:
            </label>
            <select
              id="filter-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'relevance' | 'year' | 'cited')}
              className="h-9 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-2.5 text-xs text-[#333333] focus:outline-none focus:border-[#193C32]"
            >
              <option value="relevance">Paling Relevan</option>
              <option value="year">Terbaru</option>
              <option value="cited">Sitasi Terbanyak</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openAccessOnly}
              onChange={(e) => setOpenAccessOnly(e.target.checked)}
              className="w-4 h-4 rounded border-[#E5E5DF] accent-[#193C32]"
            />
            <span>Hanya Open Access</span>
          </label>

          <button
            type="button"
            onClick={() => {
              setQuery(selectedProgram.sampleJournalQuery);
              void runSearch(selectedProgram.sampleJournalQuery, yearFrom, sortBy, openAccessOnly);
            }}
            className="ml-auto text-xs font-medium text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744] cursor-pointer"
          >
            Kueri Contoh {selectedProgram.name}
          </button>
        </div>
      </form>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-md bg-red-50 border border-red-200 text-red-900 text-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{errorMessage}</span>
        </div>
      )}

      {!hasSearched && !isLoading && (
        <div className="border border-dashed border-[#E5E5DF] rounded-md p-8 text-center">
          <BookOpen className="w-6 h-6 text-[#193C32]/60 mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-serif text-lg text-[#193C32]">
            Penelusuran Publikasi Ilmiah via OpenAlex
          </p>
          <p className="mt-2 text-sm text-[#333333]/75 max-w-xl mx-auto">
            Klik tombol <span className="font-medium text-[#193C32]">Cari Artikel</span> di atas
            untuk menampilkan artikel jurnal terverifikasi sesuai kueri penelitian Anda.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="border border-[#E5E5DF] rounded-md p-8 text-center bg-[#FFFFFF]">
          <p className="text-sm font-medium text-[#193C32]">
            Mengambil metadata artikel ilmiah dari OpenAlex API...
          </p>
        </div>
      )}

      {hasSearched && !isLoading && !errorMessage && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#333333]/70 px-1">
            <span className="tabular-nums">
              Menampilkan {articles.length} artikel dari {(totalCount ?? 0).toLocaleString('id-ID')}{' '}
              hasil terindeks
            </span>
            <span>Sumber: api.openalex.org</span>
          </div>

          {articles.length === 0 ? (
            <div className="border border-[#E5E5DF] rounded-md p-8 text-center bg-[#FFFFFF]">
              <p className="font-serif text-lg text-[#193C32]">Tidak Ada Artikel Ditemukan</p>
              <p className="mt-2 text-sm text-[#333333]/75">
                Coba gunakan kata kunci Bahasa Inggris yang lebih luas atau longgarkan filter tahun
                terbit.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5DF] border border-[#E5E5DF] rounded-md bg-[#FFFFFF]">
              {articles.map((article) => (
                <article key={article.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#333333]/70 mb-2">
                    <span className="font-medium text-[#193C32] tabular-nums">
                      {article.publicationYear ?? 'Tahun t/a'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#333333]">{article.sourceName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{article.citedByCount} sitasi</span>
                    {article.isOpenAccess && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#245744] font-medium">Open Access</span>
                      </>
                    )}
                  </div>

                  <h4 className="font-serif text-lg font-medium text-[#193C32] leading-snug">
                    {article.title}
                  </h4>

                  <p className="mt-2 text-xs sm:text-sm text-[#333333]/75">
                    Penulis: {article.authors.join(', ')}
                  </p>

                  {article.abstractSnippet && (
                    <p className="mt-3 text-sm text-[#333333]/85 leading-relaxed">
                      {article.abstractSnippet}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-5 text-xs font-medium">
                    {article.landingUrl && (
                      <a
                        href={article.landingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#193C32] hover:text-[#245744] underline underline-offset-4 decoration-[#B5A477]"
                      >
                        <span>Buka Tautan Artikel</span>
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    )}
                    {article.doiUrl && article.doiUrl !== article.landingUrl && (
                      <a
                        href={article.doiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#333333]/75 hover:text-[#193C32] underline underline-offset-4"
                      >
                        <span>Tautan DOI</span>
                        <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
