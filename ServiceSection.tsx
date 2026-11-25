import { ArrowRight, BookOpen, KeyRound, MessageSquareText, UserRound } from 'lucide-react';
import { WorkspaceTab } from '../types/smartref';

interface ServiceSectionProps {
  activeTab: WorkspaceTab;
  onSelectService: (target: WorkspaceTab | 'librarian') => void;
}

const SERVICES: Array<{
  id: WorkspaceTab | 'librarian';
  title: string;
  description: string;
  actionLabel: string;
  icon: typeof MessageSquareText;
}> = [
  {
    id: 'assistant',
    title: 'AI Reference Assistant',
    description:
      'Konsultasi topik penelitian, perumusan masalah, strategi penelusuran literatur, dan rekomendasi basis data sesuai program studi.',
    actionLabel: 'Buka Asisten',
    icon: MessageSquareText,
  },
  {
    id: 'keywords',
    title: 'Smart Keyword Generator',
    description:
      'Penyusunan kata kunci Bahasa Indonesia dan Inggris, sinonim teknis, serta kueri Boolean (AND, OR, NOT) untuk basis data ilmiah.',
    actionLabel: 'Susun Kata Kunci',
    icon: KeyRound,
  },
  {
    id: 'journals',
    title: 'Journal Finder',
    description:
      'Penelusuran metadata artikel ilmiah terverifikasi—judul, penulis, tahun terbit, sumber publikasi, dan tautan—melalui OpenAlex API.',
    actionLabel: 'Cari Jurnal',
    icon: BookOpen,
  },
  {
    id: 'librarian',
    title: 'Ask a Librarian',
    description:
      'Pengajuan pertanyaan referensi, bantuan akses koleksi elektronik Unpad, dan konsultasi literasi informasi kepada pustakawan FTIP.',
    actionLabel: 'Ajukan Pertanyaan',
    icon: UserRound,
  },
];

export function ServiceSection({ activeTab, onSelectService }: ServiceSectionProps) {
  return (
    <section id="layanan" className="bg-[#FFFFFF] pt-14 pb-10 sm:pt-18 sm:pb-12">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#193C32]">
            Layanan Referensi
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-[#333333]/80 leading-relaxed">
            Berbagai layanan untuk mendukung kebutuhan informasi dan penelitian akademik.
          </p>
        </div>

        {/* Minimalist Editorial 4-Column Hairline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#E5E5DF]">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const isActive = service.id !== 'librarian' && activeTab === service.id;

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelectService(service.id)}
                className={`group text-left p-6 border-r border-b border-[#E5E5DF] transition-colors flex flex-col justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#193C32] ${
                  isActive ? 'bg-[#F7F6F0]' : 'bg-[#FFFFFF] hover:bg-[#F7F6F0]/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <Icon className="w-5 h-5 text-[#193C32]" strokeWidth={1.5} />
                    {isActive && (
                      <span className="text-[11px] font-medium tracking-wide text-[#245744]">
                        Aktif
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg font-medium text-[#193C32] leading-snug">
                    {service.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-[#333333]/80 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#E5E5DF] flex items-center justify-between text-xs font-medium text-[#193C32]">
                  <span>{service.actionLabel}</span>
                  <ArrowRight
                    className="w-3.5 h-3.5 text-[#B5A477] group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={1.5}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
