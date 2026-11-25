interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
}

export function Footer({ onNavigateSection }: FooterProps) {
  return (
    <footer className="bg-[#F7F6F0] border-t border-[#E5E5DF] text-[#333333]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="space-y-1.5">
            <p className="font-serif text-xl font-medium text-[#193C32]">FTIP SmartRef</p>
            <p className="text-sm text-[#333333]">
              Perpustakaan Fakultas Teknologi Industri Pertanian
            </p>
            <p className="text-sm text-[#333333]/80">Universitas Padjadjaran</p>
            <p className="pt-2 font-serif italic text-sm text-[#193C32]">
              &ldquo;Temukan Referensi, Kembangkan Inovasi.&rdquo;
            </p>
          </div>

          <nav aria-label="Navigasi Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#333333]/80">
            <a
              href="#beranda"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('beranda');
              }}
              className="hover:text-[#193C32] hover:underline underline-offset-4"
            >
              Beranda
            </a>
            <a
              href="#layanan"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('layanan');
              }}
              className="hover:text-[#193C32] hover:underline underline-offset-4"
            >
              Layanan
            </a>
            <a
              href="#program-studi"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('program-studi');
              }}
              className="hover:text-[#193C32] hover:underline underline-offset-4"
            >
              Program Studi
            </a>
            <a
              href="#tentang-kami"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('tentang-kami');
              }}
              className="hover:text-[#193C32] hover:underline underline-offset-4"
            >
              Tentang Kami
            </a>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-[#E5E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#333333]/65">
          <p>
            &copy; {new Date().getFullYear()} Perpustakaan Fakultas Teknologi Industri Pertanian,
            Universitas Padjadjaran.
          </p>
          <p>Indeks artikel ilmiah didukung oleh OpenAlex API.</p>
        </div>
      </div>
    </footer>
  );
}
