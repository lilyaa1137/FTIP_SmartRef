import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, MapPin, Send } from 'lucide-react';
import { LibrarianTicketResponse, StudyProgram } from '../types/smartref';
import { safeFetchJson } from '../utils/safeFetch';

interface AskLibrarianSectionProps {
  programs: StudyProgram[];
  selectedProgram: StudyProgram;
}

const QUESTION_CATEGORIES = [
  'Penelusuran Literatur & Jurnal',
  'Akses E-Journal & Database Unpad',
  'Manajemen Sitasi (Mendeley / Zotero)',
  'Panduan Cek Kemiripan & Tugas Akhir',
  'Konsultasi Referensi Lainnya',
];

export function AskLibrarianSection({ programs, selectedProgram }: AskLibrarianSectionProps) {
  const [name, setName] = useState('');
  const [npmOrNip, setNpmOrNip] = useState('');
  const [email, setEmail] = useState('');
  const [programLabel, setProgramLabel] = useState(
    `${selectedProgram.level} - ${selectedProgram.name}`
  );
  const [category, setCategory] = useState(QUESTION_CATEGORIES[0]);
  const [question, setQuestion] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ticket, setTicket] = useState<LibrarianTicketResponse | null>(null);
  const [totalInquiries, setTotalInquiries] = useState<number | null>(null);

  useEffect(() => {
    setProgramLabel(`${selectedProgram.level} - ${selectedProgram.name}`);
  }, [selectedProgram]);

  useEffect(() => {
    safeFetchJson<{ totalInquiries?: number }>('/api/librarian/stats', {
      headers: { Accept: 'application/json' },
    })
      .then((data) => {
        if (data && typeof data.totalInquiries === 'number') {
          setTotalInquiries(data.totalInquiries);
        }
      })
      .catch(() => {
        // Optional stat fetch
      });
  }, [ticket]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (name.trim().length < 2) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Masukkan alamat email yang valid.');
      return;
    }
    if (question.trim().length < 10) {
      setErrorMessage('Uraikan pertanyaan referensi Anda minimal 10 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await safeFetchJson<LibrarianTicketResponse>(
        '/api/librarian',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            npmOrNip: npmOrNip.trim(),
            email: email.trim(),
            programLabel,
            category,
            question: question.trim(),
          }),
        },
        'Layanan Tanya Pustakawan sementara tidak tersedia. Silakan coba beberapa saat lagi.'
      );

      setTicket(data);
      setQuestion('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan pertanyaan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="tentang-kami" className="bg-[#FFFFFF] py-14 sm:py-18">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 space-y-14">
        {/* TENTANG KAMI & INFORMASI PERPUSTAKAAN */}
        <div className="space-y-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#333333]/65 mb-2.5">
              TENTANG KAMI
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#193C32]">
              Perpustakaan FTIP Universitas Padjadjaran
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#333333]/85 leading-[1.75]">
              FTIP SmartRef merupakan layanan referensi digital yang dirancang untuk mendampingi
              mahasiswa dan peneliti Fakultas Teknologi Industri Pertanian Universitas Padjadjaran
              dalam menelusuri literatur ilmiah, menyusun strategi pencarian, serta menemukan sumber
              informasi akademik yang relevan.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#333333]/65 mb-4">
              INFORMASI PERPUSTAKAAN
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lokasi */}
              <div className="bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#193C32] shrink-0" strokeWidth={1.5} />
                  <h3 className="font-serif text-lg font-medium text-[#193C32]">Lokasi</h3>
                </div>
                <p className="text-sm text-[#333333]/85 leading-relaxed">
                  Gedung I (Gedung Dekanat) Lantai 1
                  <br />
                  Fakultas Teknologi Industri Pertanian
                  <br />
                  Kampus Jatinangor Universitas Padjadjaran
                </p>
              </div>

              {/* Jam Operasional */}
              <div className="bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#193C32] shrink-0" strokeWidth={1.5} />
                  <h3 className="font-serif text-lg font-medium text-[#193C32]">
                    Jam Operasional
                  </h3>
                </div>
                <p className="font-serif text-xl sm:text-2xl font-medium text-[#193C32] tabular-nums">
                  08.00–15.30 WIB
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ASK A LIBRARIAN FORM */}
        <div
          id="tanya-pustakawan"
          className="pt-12 border-t border-[#E5E5DF] grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
        >
          <div className="lg:col-span-4 space-y-3">
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#333333]/65">
              Konsultasi Pustakawan
            </p>
            <h3 className="font-serif text-2xl font-medium text-[#193C32]">Ask a Librarian</h3>
            <p className="text-sm text-[#333333]/80 leading-relaxed">
              Ajukan pertanyaan referensi, konsultasi penelusuran literatur, atau bantuan akses
              sumber akademik langsung kepada staf perpustakaan.
            </p>
            {totalInquiries !== null && (
              <p className="pt-2 text-xs text-[#333333]/65 tabular-nums">
                Pertanyaan tercatat dalam antrean layanan lokal: {totalInquiries}
              </p>
            )}
          </div>

          <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E5E5DF] rounded-md p-6 sm:p-8">
            {ticket ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#193C32] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <h3 className="font-serif text-xl font-medium text-[#193C32]">
                      Pertanyaan Referensi Tercatat
                    </h3>
                    <p className="mt-1 text-sm text-[#333333]/80">
                      Terima kasih, {ticket.name}. Pertanyaan Anda telah disimpan dengan rincian
                      berikut:
                    </p>
                  </div>
                </div>

                <dl className="bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-5 space-y-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2 border-b border-[#E5E5DF] pb-2.5">
                    <dt className="text-[#333333]/70">Nomor Tiket</dt>
                    <dd className="font-mono font-medium text-[#193C32] tabular-nums">
                      {ticket.ticketId}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-b border-[#E5E5DF] pb-2.5">
                    <dt className="text-[#333333]/70">Program Studi</dt>
                    <dd className="font-medium text-[#333333]">{ticket.programLabel}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 border-b border-[#E5E5DF] pb-2.5">
                    <dt className="text-[#333333]/70">Kategori</dt>
                    <dd className="font-medium text-[#333333]">{ticket.category}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-[#333333]/70">Status</dt>
                    <dd className="font-medium text-[#193C32]">{ticket.status}</dd>
                  </div>
                </dl>

                <p className="text-xs text-[#333333]/75 leading-relaxed bg-[#F7F6F0] border border-[#E5E5DF] rounded-md p-4">
                  {ticket.modeNote}
                </p>

                <button
                  type="button"
                  onClick={() => setTicket(null)}
                  className="px-5 py-2.5 text-sm font-medium text-[#FFFFFF] bg-[#193C32] rounded-md hover:bg-[#245744] transition-colors cursor-pointer"
                >
                  Kirim Pertanyaan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="border-b border-[#E5E5DF] pb-4">
                  <h3 className="font-serif text-xl font-medium text-[#193C32]">
                    Ask a Librarian
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-[#333333]/75">
                    Ajukan pertanyaan referensi langsung kepada staf Perpustakaan FTIP Unpad.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="lib-name"
                      className="block text-xs font-medium text-[#333333] mb-1.5"
                    >
                      Nama Lengkap
                    </label>
                    <input
                      id="lib-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Alya Rahmawati"
                      className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 text-sm text-[#333333] focus:outline-none focus:border-[#193C32]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lib-npm"
                      className="block text-xs font-medium text-[#333333] mb-1.5"
                    >
                      NPM / NIP (Opsional)
                    </label>
                    <input
                      id="lib-npm"
                      type="text"
                      value={npmOrNip}
                      onChange={(e) => setNpmOrNip(e.target.value)}
                      placeholder="Contoh: 240110220001"
                      className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 text-sm text-[#333333] font-mono tabular-nums focus:outline-none focus:border-[#193C32]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="lib-email"
                      className="block text-xs font-medium text-[#333333] mb-1.5"
                    >
                      Alamat Email Akademik
                    </label>
                    <input
                      id="lib-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@mail.unpad.ac.id"
                      className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3.5 text-sm text-[#333333] focus:outline-none focus:border-[#193C32]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lib-program"
                      className="block text-xs font-medium text-[#333333] mb-1.5"
                    >
                      Program Studi &amp; Jenjang
                    </label>
                    <select
                      id="lib-program"
                      value={programLabel}
                      onChange={(e) => setProgramLabel(e.target.value)}
                      className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3 text-sm text-[#333333] focus:outline-none focus:border-[#193C32]"
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={`${p.level} - ${p.name}`}>
                          {p.level} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lib-category"
                    className="block text-xs font-medium text-[#333333] mb-1.5"
                  >
                    Kategori Layanan
                  </label>
                  <select
                    id="lib-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3 text-sm text-[#333333] focus:outline-none focus:border-[#193C32]"
                  >
                    {QUESTION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="lib-question"
                    className="block text-xs font-medium text-[#333333] mb-1.5"
                  >
                    Pertanyaan atau Kebutuhan Referensi
                  </label>
                  <textarea
                    id="lib-question"
                    rows={4}
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Jelaskan topik penelitian, kendala akses jurnal, atau referensi yang sedang Anda cari..."
                    className="w-full rounded-md border border-[#E5E5DF] bg-[#FFFFFF] p-3.5 text-sm text-[#333333] focus:outline-none focus:border-[#193C32]"
                  />
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm"
                  >
                    <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-[#333333]/65">
                    Antrean demonstrasi lokal server FTIP SmartRef.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#193C32] text-[#FFFFFF] text-sm font-medium hover:bg-[#245744] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{isSubmitting ? 'Mengirim...' : 'Kirim ke Pustakawan'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
