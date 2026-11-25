import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onNavigateSection: (sectionId: string) => void;
}

const NAV_ITEMS = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'layanan', label: 'Layanan' },
  { id: 'program-studi', label: 'Program Studi' },
  { id: 'tentang-kami', label: 'Tentang Kami' },
];

export function Navbar({ onNavigateSection }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClick = (sectionId: string) => {
    setMobileOpen(false);
    onNavigateSection(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E5E5DF]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-8">
        {/* Left side: Brand + Small Institutional Label */}
        <a
          href="#beranda"
          onClick={(e) => {
            e.preventDefault();
            handleClick('beranda');
          }}
          className="flex flex-col focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#193C32]"
        >
          <span className="font-serif text-xl font-medium tracking-tight text-[#193C32] whitespace-nowrap">
            FTIP SmartRef
          </span>
          <span className="text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[#333333]/65 font-medium mt-0.5">
            PERPUSTAKAAN FTIP UNIVERSITAS PADJADJARAN
          </span>
        </a>

        {/* Right side: Simple Typographic Navigation */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center text-sm text-[#333333]"
        >
          {NAV_ITEMS.map((item, idx) => (
            <div key={item.id} className="flex items-center">
              {idx > 0 && (
                <span aria-hidden="true" className="mx-3.5 text-[#E5E5DF] select-none">
                  |
                </span>
              )}
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.id);
                }}
                className="py-1 font-normal text-[#333333]/85 hover:text-[#193C32] hover:underline underline-offset-4 decoration-[#B5A477] transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            </div>
          ))}
        </nav>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          aria-expanded={mobileOpen}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-[#193C32] hover:bg-[#F7F6F0] transition-colors cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E5DF] bg-[#FFFFFF] px-5 py-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleClick(item.id);
              }}
              className="block py-2.5 text-sm text-[#333333] hover:text-[#193C32] border-b border-[#F7F6F0] last:border-b-0"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
