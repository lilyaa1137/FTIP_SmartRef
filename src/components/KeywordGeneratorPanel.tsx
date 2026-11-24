import { FormEvent, useState } from 'react';
import { AlertCircle, Check, Copy, KeyRound, Search } from 'lucide-react';
import { KeywordGenerationResult, StudyProgram } from '../types/smartref';
import { ApiResponseError, safeFetchJson } from '../utils/safeFetch';
import { generateLocalKeywords } from '../utils/localSmartRef';

interface KeywordGeneratorPanelProps {
  selectedProgram: StudyProgram;
  onSearchInJournals: (query: string) => void;
}

export function KeywordGeneratorPanel({
  selectedProgram,
  onSearchInJournals,
}: KeywordGeneratorPanelProps) {
  const [topic, setTopic] = useState('');
  const [focus, setFocus] = useState('');
  const [result, setResult] = useState<KeywordGenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard API may be blocked in restricted contexts
    }
  };

  const generateKeywords = async (topicInput: string, focusInput: string) => {
    const cleanTopic = topicInput.trim();
    if (cleanTopic.length < 5) {
      setValidationError('Masukkan topik penelitian minimal 5 karakter.');
      return;
    }

    setIsLoading(true);
    setValidationError(null);

    try {
      let data: KeywordGenerationResult;
      try {
        data = await safeFetchJson<KeywordGenerationResult>(
          '/api/keywords',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              topic: cleanTopic,
              focus: focusInput.trim(),
              program: {
                id: selectedProgram.id,
                level: selectedProgram.level,
                name: selectedProgram.name,
                thesisTerm: selectedProgram.thesisTerm,
                focusAreas: selectedProgram.focusAreas,
              },
            }),
          },
          'Generator server tidak terjangkau.'
        );
      } catch (err) {
        if (err instanceof ApiResponseError || err instanceof Error) {
          data = generateLocalKeywords(cleanTopic, focusInput.trim(), selectedProgram);
        } else {
          data = generateLocalKeywords(cleanTopic, focusInput.trim(), selectedProgram);
        }
      }

      setResult(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void generateKeywords(topic, focus);
  };

  const handleUseExample = () => {
    setTopic(selectedProgram.sampleKeywordTopic);
    setFocus(selectedProgram.focusAreas[0] || '');
    void generateKeywords(selectedProgram.sampleKeywordTopic, selectedProgram.focusAreas[0] || '');
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#193C32]">
              Smart Keyword Generator
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-[#333333]/75">
              Disesuaikan untuk {selectedProgram.levelLabel} {selectedProgram.name} (
              {selectedProgram.thesisTerm}).
            </p>
          </div>

          <button
            type="button"
            onClick={handleUseExample}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-medium text-[#193C32] bg-[#FFFFFF] border border-[#E5E5DF] rounded-md hover:border-[#193C32] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Gunakan Contoh Topik {selectedProgram.level}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <label htmlFor="keyword-topic" className="block text-xs font-medium text-[#333333] mb-1.5">
              Topik atau Rencana Judul Penelitian
            </label>
            <input
              id="keyword-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`Contoh: ${selectedProgram.sampleKeywordTopic}`}
              className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 text-sm text-[#333333] placeholder:text-[#333333]/45 focus:outline-none focus:border-[#193C32]"
            />
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="keyword-focus" className="block text-xs font-medium text-[#333333] mb-1.5">
              Metode / Variabel (Opsional)
            </label>
            <input
              id="keyword-focus"
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Mis. antioksidan, HACCP, LCA"
              className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 text-sm text-[#333333] placeholder:text-[#333333]/45 focus:outline-none focus:border-[#193C32]"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isLoading || topic.trim().length < 5}
              className="w-full h-10 inline-flex items-center justify-center gap-2 px-4 rounded-md bg-[#193C32] text-[#FFFFFF] text-sm font-medium hover:bg-[#245744] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" strokeWidth={1.5} />
              <span>{isLoading ? 'Memproses...' : 'Hasilkan'}</span>
            </button>
          </div>
        </div>

        {validationError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{validationError}</span>
          </div>
        )}
      </form>

      {!result && !isLoading && (
        <div className="border border-dashed border-[#E5E5DF] rounded-md p-8 text-center">
          <p className="font-serif text-lg text-[#193C32]">
            Penyusunan Kata Kunci &amp; Strategi Pencarian Boolean
          </p>
          <p className="mt-2 text-sm text-[#333333]/75 max-w-xl mx-auto">
            Masukkan topik penelitian Anda untuk memperoleh kata kunci Bahasa Indonesia, Bahasa
            Inggris, sinonim teknis, serta kueri Boolean (AND, OR, NOT) bagi basis data ilmiah.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="border border-[#E5E5DF] rounded-md p-8 text-center bg-[#FFFFFF]">
          <p className="text-sm font-medium text-[#193C32]">
            Menyusun kata kunci akademik dan kombinasi Boolean...
          </p>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-6">
          {result.modeNotice && (
            <div className="p-3.5 rounded-md bg-[#F7F6F0] border border-[#E5E5DF] text-xs text-[#193C32]">
              {result.modeNotice}
            </div>
          )}

          {/* 1 & 2: Indonesian and English Main Keywords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-5">
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#E5E5DF]">
                <h4 className="font-serif text-base font-medium text-[#193C32]">
                  1. Kata Kunci Utama (Bahasa Indonesia)
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopy(result.kataKunciIndonesia.join(', '), 'id-kw')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#333333]/70 hover:text-[#193C32] cursor-pointer"
                >
                  {copiedId === 'id-kw' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#193C32]" strokeWidth={1.5} />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <ul className="divide-y divide-[#F7F6F0]">
                {result.kataKunciIndonesia.map((kw, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm text-[#333333] py-2">
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => onSearchInJournals(kw)}
                      className="text-xs font-medium text-[#193C32] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cari Jurnal
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-5">
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#E5E5DF]">
                <h4 className="font-serif text-base font-medium text-[#193C32]">
                  2. Kata Kunci Utama (Bahasa Inggris)
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopy(result.kataKunciInggris.join(', '), 'en-kw')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#333333]/70 hover:text-[#193C32] cursor-pointer"
                >
                  {copiedId === 'en-kw' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#193C32]" strokeWidth={1.5} />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
              <ul className="divide-y divide-[#F7F6F0]">
                {result.kataKunciInggris.map((kw, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm text-[#333333] py-2">
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => onSearchInJournals(kw)}
                      className="text-xs font-medium text-[#193C32] hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Cari Jurnal
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3 & 5: Synonyms & Suggested Database Queries */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-5">
              <h4 className="font-serif text-base font-medium text-[#193C32] mb-3 pb-2.5 border-b border-[#E5E5DF]">
                3. Istilah Terkait &amp; Sinonim
              </h4>
              <div className="divide-y divide-[#F7F6F0]">
                {result.sinonimTeknis.map((group, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-[#333333]">{group.istilah}</p>
                    <p className="mt-1 text-xs text-[#333333]/70">
                      Sinonim: {group.padanan.join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-serif text-base font-medium text-[#193C32] mb-3 pb-2.5 border-b border-[#E5E5DF]">
                  5. Kueri Database Ilmiah Disarankan
                </h4>
                <ul className="divide-y divide-[#F7F6F0]">
                  {result.istilahPencarianDisarankan.map((term, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 text-sm text-[#333333] py-2"
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={() => onSearchInJournals(term)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#193C32] hover:underline underline-offset-4 shrink-0 cursor-pointer"
                      >
                        <Search className="w-3 h-3" strokeWidth={1.5} />
                        <span>Telusuri</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5E5DF]">
                <p className="text-xs font-medium text-[#193C32] mb-1">
                  Catatan Strategi ({selectedProgram.level})
                </p>
                <p className="text-xs text-[#333333]/75 leading-relaxed">{result.catatanStrategi}</p>
              </div>
            </div>
          </div>

          {/* 4: Boolean Search Strategies */}
          <div className="bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-5 sm:p-6">
            <h4 className="font-serif text-lg font-medium text-[#193C32] mb-1">
              4. Strategi Pencarian Boolean (AND, OR, NOT)
            </h4>
            <p className="text-xs text-[#333333]/70 mb-4">
              Salin kueri untuk ScienceDirect, Scopus, Google Scholar, atau uji langsung di Journal
              Finder.
            </p>

            <div className="space-y-4">
              {result.strategiBoolean.map((strat, idx) => {
                const copyKey = `bool-${idx}`;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-md bg-[#F7F6F0] border border-[#E5E5DF] space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium text-[#193C32]">{strat.label}</span>
                        <span className="mx-2 text-[#B5A477]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-xs text-[#333333]/70">{strat.targetDatabase}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(strat.query, copyKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#333333] bg-[#FFFFFF] border border-[#E5E5DF] rounded-md hover:border-[#193C32] transition-colors cursor-pointer"
                        >
                          {copiedId === copyKey ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#193C32]" strokeWidth={1.5} />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                              <span>Salin Kueri</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onSearchInJournals(strat.query)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#FFFFFF] bg-[#193C32] rounded-md hover:bg-[#245744] transition-colors cursor-pointer"
                        >
                          <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Cari di Journal Finder</span>
                        </button>
                      </div>
                    </div>

                    <pre className="font-mono text-xs text-[#333333] bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
                      {strat.query}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
