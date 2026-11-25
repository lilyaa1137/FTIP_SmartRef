import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, ExternalLink, MessageSquareText, RotateCcw, Send, User } from 'lucide-react';
import { ChatMessage, JournalArticle, StudyProgram } from '../types/smartref';
import { ApiResponseError, safeFetchJson } from '../utils/safeFetch';

interface AiAssistantPanelProps {
  selectedProgram: StudyProgram;
  hasExplicitProgram?: boolean;
  onOpenJournals: (query: string) => void;
}

function createInitialGreeting(program: StudyProgram, hasExplicitProgram: boolean): ChatMessage {
  const introText = hasExplicitProgram
    ? `Halo. Saya asisten referensi Perpustakaan FTIP Universitas Padjadjaran. Konteks saat ini disesuaikan untuk jenjang ${program.levelLabel} Program Studi ${program.name} (${program.thesisTerm}).\n\nSilakan sampaikan topik yang sedang Anda eksplorasi, rencana metodologi, atau kebutuhan penelusuran jurnal ilmiahnya.`
    : `Halo. Saya asisten referensi Perpustakaan FTIP Universitas Padjadjaran.\n\nSaya dapat membantu Anda mengeksplorasi arah topik penelitian, merancang kata kunci & strategi pencarian literatur, hingga menyusun variabel dan metodologi di bidang Teknologi Pangan, Teknologi Industri Pertanian, maupun Teknik Pertanian. Topik atau bidang apa yang sedang Anda minati saat ini?`;

  return {
    id: `greeting-${program.id}-${hasExplicitProgram ? 'explicit' : 'general'}`,
    role: 'model',
    text: introText,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function AiAssistantPanel({
  selectedProgram,
  hasExplicitProgram = false,
  onOpenJournals,
}: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createInitialGreeting(selectedProgram, hasExplicitProgram),
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; lastPrompt: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1 && prev[0]?.role === 'model') {
        return [createInitialGreeting(selectedProgram, hasExplicitProgram)];
      }
      return prev;
    });
  }, [selectedProgram, hasExplicitProgram]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setErrorState(null);
    setIsLoading(true);

    try {
      const apiMessages = nextMessages
        .filter((m) => !m.id.startsWith('greeting-') && !m.isError)
        .map((m) => ({ role: m.role, text: m.text }));

      const data = await safeFetchJson<{
        reply: string;
        sourceMode?: 'gemini' | 'local';
        suggestedSearchQuery?: string;
        verifiedArticles?: JournalArticle[];
      }>(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            hasExplicitProgram,
            program: {
              id: selectedProgram.id,
              level: selectedProgram.level,
              name: selectedProgram.name,
              thesisTerm: selectedProgram.thesisTerm,
              focusAreas: selectedProgram.focusAreas,
              sampleJournalQuery: selectedProgram.sampleJournalQuery,
            },
          }),
        },
        'Layanan AI Reference Assistant sementara tidak tersedia. Silakan coba beberapa saat lagi.'
      );

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        sourceMode: data.sourceMode === 'local' ? 'local' : 'gemini',
        suggestedSearchQuery: data.suggestedSearchQuery,
        verifiedArticles: Array.isArray(data.verifiedArticles) ? data.verifiedArticles : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMessage =
        err instanceof ApiResponseError || err instanceof Error
          ? err.message
          : 'Terjadi kendala saat menghubungi layanan Gemini AI. Silakan coba kembali.';
      setErrorState({ message: errMessage, lastPrompt: trimmed });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'model',
          text: errMessage,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setMessages([createInitialGreeting(selectedProgram, hasExplicitProgram)]);
    setErrorState(null);
    setInput('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Context Column */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#333333]/65">
            Konteks Akademik
          </p>
          <h3 className="mt-1.5 font-serif text-lg font-medium text-[#193C32]">
            {selectedProgram.level} · {selectedProgram.name}
          </h3>
          <p className="mt-2 text-xs text-[#333333]/80 leading-relaxed">
            Disesuaikan untuk kebutuhan {selectedProgram.thesisTerm} pada fokus{' '}
            {selectedProgram.focusAreas.slice(0, 2).join(' dan ')}.
          </p>
          <p className="mt-3 pt-3 border-t border-[#E5E5DF] text-xs text-[#333333]/70">
            Basis data rujukan: {selectedProgram.recommendedDatabases.join(' · ')}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-[#333333]/75 mb-2.5">
            Contoh Pertanyaan ({selectedProgram.level} {selectedProgram.name})
          </p>
          <div className="divide-y divide-[#E5E5DF] border border-[#E5E5DF] rounded-md bg-[#FFFFFF]">
            {selectedProgram.samplePrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => void sendMessage(promptText)}
                className="w-full text-left px-4 py-3 text-xs sm:text-sm text-[#333333] hover:bg-[#F7F6F0] transition-colors disabled:opacity-50 cursor-pointer leading-relaxed"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#333333]/70 leading-relaxed border-t border-[#E5E5DF] pt-4">
          Asisten tidak memalsukan kutipan atau DOI. Untuk memverifikasi artikel ilmiah nyata,
          gunakan{' '}
          <button
            type="button"
            onClick={() => onOpenJournals(selectedProgram.sampleJournalQuery)}
            className="font-medium text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744] cursor-pointer"
          >
            Journal Finder
          </button>
          .
        </p>
      </div>

      {/* Right Chat Column */}
      <div className="lg:col-span-8 flex flex-col border border-[#E5E5DF] rounded-md bg-[#F7F6F0]/50 overflow-hidden min-h-[500px] max-h-[620px]">
        <div className="px-5 py-3.5 bg-[#FFFFFF] border-b border-[#E5E5DF] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquareText className="w-4 h-4 text-[#193C32] shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#193C32] truncate">AI Reference Assistant</p>
              <p className="text-xs text-[#333333]/65 truncate">
                {selectedProgram.levelLabel} · {selectedProgram.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#333333]/80 bg-[#FFFFFF] border border-[#E5E5DF] rounded-md hover:border-[#193C32] hover:text-[#193C32] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Sesi Baru</span>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isErr = Boolean(msg.isError);
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-[#F7F6F0] border-[#E5E5DF] text-[#333333]'
                      : isErr
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-[#193C32] border-[#193C32] text-[#FFFFFF]'
                  }`}
                >
                  {isUser ? (
                    <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : isErr ? (
                    <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <MessageSquareText className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#193C32] text-[#FFFFFF]'
                      : isErr
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'bg-[#FFFFFF] border border-[#E5E5DF] text-[#333333]'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                  {isErr && (
                    <div className="mt-3 pt-2.5 border-t border-red-200 flex flex-wrap items-center gap-4 text-xs font-medium">
                      {errorState?.lastPrompt && (
                        <button
                          type="button"
                          onClick={() => void sendMessage(errorState.lastPrompt)}
                          className="text-red-900 underline underline-offset-4 hover:text-red-700 cursor-pointer"
                        >
                          Coba Kirim Ulang
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenJournals(selectedProgram.sampleJournalQuery)}
                        className="text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744] cursor-pointer"
                      >
                        Cari Referensi di Journal Finder
                      </button>
                    </div>
                  )}

                  {!isUser && !isErr && msg.verifiedArticles && msg.verifiedArticles.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#E5E5DF] space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[#193C32]">
                        Referensi Terverifikasi (OpenAlex / Crossref)
                      </p>
                      <div className="space-y-2">
                        {msg.verifiedArticles.map((article) => {
                          const targetUrl = article.doiUrl || article.landingUrl;
                          return (
                            <div
                              key={article.id}
                              className="p-2.5 rounded-md bg-[#F7F6F0] border border-[#E5E5DF] text-xs"
                            >
                              <p className="font-medium text-[#193C32] leading-snug">
                                {article.title}
                              </p>
                              <p className="mt-1 text-[#333333]/75">
                                {article.authors.slice(0, 2).join(', ')}
                                {article.authors.length > 2 ? ' dkk.' : ''}
                                {article.publicationYear ? ` (${article.publicationYear})` : ''} ·{' '}
                                {article.sourceName}
                                {article.sourceProvider ? ` (${article.sourceProvider})` : ''}
                              </p>
                              {targetUrl && (
                                <a
                                  href={targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1.5 inline-flex items-center gap-1 font-medium text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744]"
                                >
                                  <span>Buka tautan publikasi</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!isUser && !isErr && msg.suggestedSearchQuery && (
                    <div className="mt-3 pt-3 border-t border-[#E5E5DF]">
                      <button
                        type="button"
                        onClick={() => onOpenJournals(msg.suggestedSearchQuery!)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744] cursor-pointer"
                      >
                        <span>Telusuri di Journal Finder: &ldquo;{msg.suggestedSearchQuery}&rdquo;</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}

                  <p
                    className={`mt-2 text-[11px] tabular-nums ${
                      isUser ? 'text-[#FFFFFF]/70' : isErr ? 'text-red-800/70' : 'text-[#333333]/55'
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-[#193C32] text-[#FFFFFF] flex items-center justify-center shrink-0">
                <MessageSquareText className="w-3.5 h-3.5" strokeWidth={1.5} />
              </div>
              <div className="bg-[#FFFFFF] border border-[#E5E5DF] rounded-md px-4 py-3 text-sm text-[#333333]/75">
                Menyusun analisis dan menelusuri referensi ilmiah...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-[#FFFFFF] border-t border-[#E5E5DF]">
          <div className="flex items-end gap-3">
            <label htmlFor="ai-chat-input" className="sr-only">
              Tulis pertanyaan referensi akademik
            </label>
            <textarea
              id="ai-chat-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              placeholder={`Tanyakan topik ${selectedProgram.thesisTerm} untuk ${selectedProgram.name}...`}
              className="flex-1 resize-none rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 py-2 text-sm text-[#333333] placeholder:text-[#333333]/50 focus:outline-none focus:border-[#193C32]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Kirim pertanyaan"
              className="h-10 px-5 inline-flex items-center gap-2 rounded-md bg-[#193C32] text-[#FFFFFF] text-sm font-medium hover:bg-[#245744] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
