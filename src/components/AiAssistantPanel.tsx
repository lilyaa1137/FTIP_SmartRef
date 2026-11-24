import { FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageSquareText, RotateCcw, Send, User } from 'lucide-react';
import { ChatMessage, StudyProgram } from '../types/smartref';
import { ApiResponseError, safeFetchJson } from '../utils/safeFetch';
import { generateLocalAssistantReply } from '../utils/localSmartRef';

interface AiAssistantPanelProps {
  selectedProgram: StudyProgram;
  onOpenJournals: (query: string) => void;
}

function createInitialGreeting(program: StudyProgram): ChatMessage {
  return {
    id: `greeting-${program.id}`,
    role: 'model',
    text: `Halo. Saya FTIP SmartRef, asisten referensi digital Perpustakaan FTIP Universitas Padjadjaran. Saat ini konteks disesuaikan untuk jenjang ${program.levelLabel} Program Studi ${program.name} (${program.thesisTerm}).\n\nSilakan ajukan pertanyaan terkait perumusan topik penelitian, strategi penelusuran literatur, atau rekomendasi basis data ilmiah yang relevan.`,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function AiAssistantPanel({ selectedProgram, onOpenJournals }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createInitialGreeting(selectedProgram),
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1 && prev[0]?.role === 'model') {
        return [createInitialGreeting(selectedProgram)];
      }
      return prev;
    });
  }, [selectedProgram]);

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
    setIsLoading(true);

    try {
      const apiMessages = nextMessages
        .filter((m) => !m.id.startsWith('greeting-'))
        .map((m) => ({ role: m.role, text: m.text }));

      let replyText = '';
      let sourceMode: 'gemini' | 'local' = 'gemini';
      let suggestedSearchQuery: string | undefined;
      let notice: string | null = null;

      try {
        const data = await safeFetchJson<{
          reply: string;
          sourceMode?: 'gemini' | 'local';
          suggestedSearchQuery?: string;
          modeNotice?: string;
        }>(
          '/api/chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              messages: apiMessages,
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
          'Layanan server sementara tidak tersedia.'
        );

        replyText = data.reply;
        sourceMode = data.sourceMode === 'local' ? 'local' : 'gemini';
        suggestedSearchQuery = data.suggestedSearchQuery;
        notice = data.modeNotice || null;
      } catch (err) {
        if (err instanceof ApiResponseError || err instanceof Error) {
          const local = generateLocalAssistantReply(trimmed, selectedProgram);
          replyText = local.reply;
          sourceMode = 'local';
          suggestedSearchQuery = local.suggestedSearchQuery;
          notice =
            'Mode Panduan Referensi Lokal aktif. Untuk respons generatif Gemini AI penuh, pastikan GEMINI_API_KEY aktif di server.';
        }
      }

      setModeNotice(notice);

      const botMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        sourceMode,
        suggestedSearchQuery,
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleReset = () => {
    setMessages([createInitialGreeting(selectedProgram)]);
    setModeNotice(null);
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

        {modeNotice && (
          <div className="px-5 py-2.5 bg-[#F7F6F0] border-b border-[#E5E5DF] text-xs text-[#193C32]">
            {modeNotice}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-[#F7F6F0] border-[#E5E5DF] text-[#333333]'
                      : 'bg-[#193C32] border-[#193C32] text-[#FFFFFF]'
                  }`}
                >
                  {isUser ? (
                    <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <MessageSquareText className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#193C32] text-[#FFFFFF]'
                      : 'bg-[#FFFFFF] border border-[#E5E5DF] text-[#333333]'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                  {!isUser && msg.suggestedSearchQuery && (
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
                      isUser ? 'text-[#FFFFFF]/70' : 'text-[#333333]/55'
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
                Menyusun rekomendasi referensi akademik...
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
