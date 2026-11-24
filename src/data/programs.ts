import { StudyProgram } from '../types/smartref';

export const STUDY_PROGRAMS: StudyProgram[] = [
  {
    id: 's1-teknik-pertanian',
    level: 'S1',
    levelLabel: 'Sarjana (S1)',
    name: 'Teknik Pertanian',
    thesisTerm: 'Skripsi / Tugas Akhir',
    description:
      'Memfokuskan kajian pada rekayasa alat dan mesin pertanian, sistem irigasi presisi, energi terbarukan pertanian, serta teknologi pascapanen.',
    focusAreas: [
      'Mekanisasi & Otomasi Pertanian',
      'Irigasi Presisi & Hidrologi Lahan',
      'Rekayasa Pascapanen & Pengeringan',
      'Bioenergi & Energi Terbarukan Agro',
    ],
    recommendedDatabases: ['OpenAlex', 'ScienceDirect', 'ASABE Technical Library', 'Portal Garuda'],
    samplePrompts: [
      'Bagaimana menyusun tinjauan pustaka untuk topik sensor kelembaban tanah IoT pada irigasi tetes?',
      'Metodologi uji kinerja apa yang umum dirujuk untuk mesin pengering surya hasil pertanian?',
      'Strategi pencarian literatur untuk topik mekanisasi lahan dan efisiensi energi pertanian.',
    ],
    sampleKeywordTopic: 'Sistem irigasi tetes otomatis berbasis sensor kelembaban tanah untuk tanaman hortikultura',
    sampleJournalQuery: 'precision irrigation soil moisture sensor horticulture',
  },
  {
    id: 's1-teknologi-pangan',
    level: 'S1',
    levelLabel: 'Sarjana (S1)',
    name: 'Teknologi Pangan',
    thesisTerm: 'Skripsi / Tugas Akhir',
    description:
      'Mendalami kimia pangan, mikrobiologi pangan, rekayasa proses pengolahan, keamanan pangan, serta pengembangan produk pangan fungsional lokal.',
    focusAreas: [
      'Kimia & Analisis Komponen Pangan',
      'Mikrobiologi & Keamanan Pangan',
      'Rekayasa Pengolahan & Pengawetan',
      'Pangan Fungsional & Karakteristik Sensori',
    ],
    recommendedDatabases: ['OpenAlex', 'ScienceDirect', 'PubMed', 'FAO/WHO Codex & Garuda'],
    samplePrompts: [
      'Saya mahasiswa Teknologi Pangan. Bantu saya mencari referensi tentang keamanan pangan.',
      'Bagaimana menyusun strategi pencarian untuk pengembangan pangan fungsional berbasis komoditas lokal?',
      'Apa pendekatan pencarian literatur untuk analisis mikrobiologi pangan dan HACCP?',
    ],
    sampleKeywordTopic: 'Pemanfaatan limbah kulit kopi menjadi produk pangan fungsional.',
    sampleJournalQuery: 'food safety HACCP microbiological quality food processing',
  },
  {
    id: 's1-teknologi-industri-pertanian',
    level: 'S1',
    levelLabel: 'Sarjana (S1)',
    name: 'Teknologi Industri Pertanian',
    thesisTerm: 'Skripsi / Tugas Akhir',
    description:
      'Mengintegrasikan teknologi proses agroindustri dengan manajemen sistem produksi, rantai pasok, pengendalian mutu, dan optimasi industri pertanian.',
    focusAreas: [
      'Manajemen Rantai Pasok Agroindustri',
      'Pengendalian Mutu & Produktivitas',
      'Pengolahan Limbah & Ekonomi Sirkular',
      'Desain Proses & Kelayakan Tekno-Ekonomi',
    ],
    recommendedDatabases: ['OpenAlex', 'ScienceDirect', 'Scopus', 'SINTA & Kandaga Unpad'],
    samplePrompts: [
      'Referensi metode optimasi apa yang paling tepat untuk analisis rantai pasok kopi arabika Jawa Barat?',
      'Bagaimana mencari literatur Life Cycle Assessment (LCA) untuk pengolahan limbah agroindustri?',
      'Variabel kunci apa yang biasa dikaji dalam studi kelayakan tekno-ekonomi agroindustri skala UMKM?',
    ],
    sampleKeywordTopic: 'Analisis risiko rantai pasok berkelanjutan pada agroindustri kopi arabika menggunakan metode House of Risk',
    sampleJournalQuery: 'sustainable coffee supply chain risk management agroindustry',
  },
  {
    id: 's2-teknologi-agroindustri',
    level: 'S2',
    levelLabel: 'Magister (S2)',
    name: 'Teknologi Agroindustri',
    thesisTerm: 'Tesis',
    description:
      'Program magister yang berorientasi pada inovasi teknologi pengolahan biomassa, bioproses tingkat lanjut, dan pengembangan sistem agroindustri bernilai tambah tinggi.',
    focusAreas: [
      'Inovasi Bioproses & Biorefinery',
      'Valorisasi Biomassa & Produk Samping',
      'Rekayasa Material Kemasan & Biopolimer',
      'Pengembangan Produk Agroindustri Unggulan',
    ],
    recommendedDatabases: ['OpenAlex', 'ScienceDirect', 'SpringerLink', 'Scopus'],
    samplePrompts: [
      'Bagaimana memetakan research gap untuk tesis tentang valorisasi limbah kulit kopi menjadi biopolimer atau pangan fungsional?',
      'Pendekatan systematic literature review seperti apa yang kuat untuk proposal tesis S2 Teknologi Agroindustri?',
      'Kata kunci apa yang relevan untuk riset biorefinery tropis dan konversi biomassa lignoselulosa?',
    ],
    sampleKeywordTopic: 'Valorisasi biomassa lignoselulosa limbah pertanian menjadi biopolimer kemasan ramah lingkungan',
    sampleJournalQuery: 'lignocellulosic agricultural waste biopolymer packaging valorization',
  },
  {
    id: 's2-teknologi-industri-pertanian',
    level: 'S2',
    levelLabel: 'Magister (S2)',
    name: 'Teknologi Industri Pertanian',
    thesisTerm: 'Tesis',
    description:
      'Menekankan pemodelan sistem kompleks agroindustri, ketahanan rantai pasok cerdas, manajemen inovasi, dan pengambilan keputusan strategis berbasis data.',
    focusAreas: [
      'Pemodelan Sistem Dinamis Agroindustri',
      'Smart & Resilient Agro-Supply Chain',
      'Manajemen Inovasi & Daya Saing Industri',
      'Optimasi Multi-Kriteria & Keberlanjutan',
    ],
    recommendedDatabases: ['OpenAlex', 'Scopus', 'IEEE Xplore', 'ScienceDirect'],
    samplePrompts: [
      'Model konseptual dan referensi utama apa yang digunakan dalam pemodelan sistem dinamis ketahanan pangan?',
      'Bagaimana menyusun strategi pencarian untuk menggabungkan metode AHP-TOPSIS dan simulasi rantai pasok agroindustri?',
      'Rekomendasi kerangka teori keberlanjutan (triple bottom line) untuk tesis manajemen agroindustri.',
    ],
    sampleKeywordTopic: 'Pemodelan sistem dinamis ketahanan rantai pasok komoditas hortikultura menghadapi fluktuasi iklim',
    sampleJournalQuery: 'system dynamics horticultural supply chain resilience',
  },
  {
    id: 's3-teknologi-agroindustri',
    level: 'S3',
    levelLabel: 'Doktor (S3)',
    name: 'Teknologi Agroindustri',
    thesisTerm: 'Disertasi',
    description:
      'Program doktoral yang menghasilkan kebaruan ilmiah (novelty) fundamental dan terapan dalam rekayasa agroindustri berkelanjutan, bioteknologi industri, serta kebijakan sistem agro.',
    focusAreas: [
      'Kebaruan Fundamental Biorefinery & Nanoteknologi Agro',
      'Arsitektur Agroindustri Sirkular Nol Limbah',
      'Integrasi IoT, AI & Industri 4.0 di Sektor Agro',
      'Sintesis Kebijakan & Transformasi Sistem Pangan',
    ],
    recommendedDatabases: ['OpenAlex', 'Web of Science', 'Scopus', 'Nature & ScienceDirect'],
    samplePrompts: [
      'Bagaimana melakukan pemetaan state-of-the-art dan novelty disertasi pada topik nanokomposit selulosa dari biomassa tropis?',
      'Strategi penyusunan PRISMA systematic review untuk publikasi jurnal bereputasi tinggi di bidang teknologi agroindustri.',
      'Pendekatan multidisiplin apa yang relevan untuk mengintegrasikan LCA, tekno-ekonomi, dan kebijakan dekarbonisasi agroindustri?',
    ],
    sampleKeywordTopic: 'Sintesis dan karakterisasi nanoselulosa bakteri dari limbah cair agroindustri sebagai penguat biokomposit',
    sampleJournalQuery: 'bacterial nanocellulose agro-industrial wastewater biocomposite',
  },
];
