import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onStartSearch: () => void;
  onLearnServices: () => void;
}

export function HeroSection({ onStartSearch, onLearnServices }: HeroSectionProps) {
  return (
    <section
      id="beranda"
      className="bg-[#F7F6F0] border-b border-[#E5E5DF] py-16 sm:py-20 lg:py-24"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-[11px] sm:text-xs font-medium tracking-[0.12em] uppercase text-[#193C32]/80 mb-4">
            LAYANAN REFERENSI DIGITAL
          </p>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-medium leading-[1.2] tracking-tight text-[#193C32]">
            Temukan Referensi, Kembangkan Inovasi.
          </h1>

          <p className="mt-5 text-base sm:text-[17px] text-[#333333]/85 leading-[1.7] max-w-2xl">
            Platform layanan referensi digital untuk membantu mahasiswa Fakultas Teknologi Industri
            Pertanian Universitas Padjadjaran dalam menemukan, menelusuri, dan mengembangkan sumber
            informasi akademik.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={onStartSearch}
              className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium text-[#FFFFFF] bg-[#193C32] rounded-md hover:bg-[#245744] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193C32]"
            >
              <span>Mulai Pencarian Referensi</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <a
              href="#layanan"
              onClick={(e) => {
                e.preventDefault();
                onLearnServices();
              }}
              className="text-sm font-medium text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744] transition-colors whitespace-nowrap"
            >
              Pelajari Layanan
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
