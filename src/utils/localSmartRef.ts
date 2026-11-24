import type { KeywordGenerationResult, StudyProgram } from '../types/smartref.ts';

interface TermMapping {
  idTerm: string;
  enTerm: string;
  synonyms: string[];
  exclude?: string;
}

const DOMAIN_DICTIONARY: Array<{ triggers: string[]; mapping: TermMapping }> = [
  {
    triggers: ['kulit kopi', 'cascara', 'coffee husk', 'coffee pulp', 'ampas kopi'],
    mapping: {
      idTerm: 'limbah kulit kopi',
      enTerm: 'coffee husk',
      synonyms: ['coffee pulp', 'cascara', 'coffee by-product', 'coffee pericarp'],
    },
  },
  {
    triggers: ['kopi', 'coffee', 'arabika', 'robusta'],
    mapping: {
      idTerm: 'komoditas kopi',
      enTerm: 'coffee',
      synonyms: ['Coffea arabica', 'Coffea canephora', 'coffee processing'],
    },
  },
  {
    triggers: ['pangan fungsional', 'functional food', 'fungsional'],
    mapping: {
      idTerm: 'produk pangan fungsional',
      enTerm: 'functional food',
      synonyms: ['nutraceutical', 'bioactive food', 'health-promoting food'],
    },
  },
  {
    triggers: ['keamanan pangan', 'food safety', 'haccp', 'cemaran', 'sanitasi', 'higiene'],
    mapping: {
      idTerm: 'keamanan pangan',
      enTerm: 'food safety',
      synonyms: ['HACCP', 'food hygiene', 'microbiological hazard', 'food quality control'],
    },
  },
  {
    triggers: ['limbah', 'by-product', 'sampah', 'residu', 'waste', 'valorisasi'],
    mapping: {
      idTerm: 'pemanfaatan limbah agroindustri',
      enTerm: 'agro-industrial waste valorization',
      synonyms: ['by-product utilization', 'agricultural residue', 'circular bioeconomy'],
    },
  },
  {
    triggers: ['antioksidan', 'antioxidant', 'polifenol', 'fenolik', 'flavonoid', 'antosianin'],
    mapping: {
      idTerm: 'aktivitas antioksidan',
      enTerm: 'antioxidant activity',
      synonyms: ['polyphenols', 'total phenolic content', 'DPPH radical scavenging'],
    },
  },
  {
    triggers: ['irigasi', 'irrigation', 'kelembaban tanah', 'soil moisture', 'hidrologi'],
    mapping: {
      idTerm: 'sistem irigasi presisi',
      enTerm: 'precision irrigation',
      synonyms: ['drip irrigation', 'soil moisture sensor', 'smart water management'],
    },
  },
  {
    triggers: ['pengeringan', 'drying', 'pengering', 'kadar air', 'moisture'],
    mapping: {
      idTerm: 'teknologi pengeringan',
      enTerm: 'drying kinetics',
      synonyms: ['solar drying', 'dehydration', 'moisture diffusivity'],
    },
  },
  {
    triggers: ['kemasan', 'packaging', 'biopolimer', 'edible film', 'bioplastik'],
    mapping: {
      idTerm: 'kemasan pangan biodegradable',
      enTerm: 'biodegradable packaging',
      synonyms: ['biopolymer film', 'active packaging', 'edible coating'],
    },
  },
  {
    triggers: ['rantai pasok', 'supply chain', 'logistik', 'risiko', 'distribusi'],
    mapping: {
      idTerm: 'manajemen rantai pasok agroindustri',
      enTerm: 'agro-industrial supply chain',
      synonyms: ['agrifood value chain', 'supply chain resilience', 'cold chain logistics'],
    },
  },
  {
    triggers: ['ekstraksi', 'extraction', 'maserasi', 'ultrasonik', 'uae'],
    mapping: {
      idTerm: 'metode ekstraksi senyawa bioaktif',
      enTerm: 'bioactive compound extraction',
      synonyms: ['ultrasound-assisted extraction', 'green extraction', 'solvent maceration'],
    },
  },
  {
    triggers: ['fermentasi', 'fermentation', 'probiotik', 'mikroba', 'starter'],
    mapping: {
      idTerm: 'teknologi fermentasi',
      enTerm: 'fermentation process',
      synonyms: ['probiotic culture', 'solid-state fermentation', 'microbial bioprocessing'],
    },
  },
  {
    triggers: ['tepung', 'flour', 'pati', 'starch', 'ubi', 'singkong', 'sorgum'],
    mapping: {
      idTerm: 'karakterisasi tepung dan pati',
      enTerm: 'modified flour characterization',
      synonyms: ['physicochemical properties', 'pasting behavior', 'functional properties'],
    },
  },
  {
    triggers: ['biomassa', 'biomass', 'lignoselulosa', 'bioenergi', 'biogas', 'biodiesel'],
    mapping: {
      idTerm: 'konversi biomassa dan bioenergi',
      enTerm: 'biomass valorization',
      synonyms: ['lignocellulosic biomass', 'biorefinery', 'renewable agro-energy'],
    },
  },
  {
    triggers: ['sensor', 'iot', 'otomatis', 'otomasi', 'mekanisasi', 'traktor'],
    mapping: {
      idTerm: 'otomasi dan mekanisasi pertanian',
      enTerm: 'agricultural automation',
      synonyms: ['IoT smart farming', 'precision agriculture', 'mechanization'],
    },
  },
];

const STOPWORDS = new Set([
  'yang', 'dan', 'atau', 'untuk', 'pada', 'dari', 'dengan', 'menjadi', 'sebagai', 'dalam',
  'tentang', 'terhadap', 'melalui', 'secara', 'menggunakan', 'berbasis', 'pemanfaatan',
  'analisis', 'kajian', 'pengaruh', 'studi', 'evaluasi', 'pengembangan', 'upaya',
  'the', 'and', 'for', 'with', 'from', 'into', 'using', 'based', 'study', 'analysis',
  'mahasiswa', 'saya', 'tolong', 'bantu', 'mencari', 'referensi', 'jurnal', 'artikel',
]);

function extractTopicTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export function generateLocalKeywords(
  topic: string,
  focus: string,
  program?: Partial<StudyProgram>
): KeywordGenerationResult {
  const combined = `${topic} ${focus}`.toLowerCase();
  const matchedMappings: TermMapping[] = [];

  for (const entry of DOMAIN_DICTIONARY) {
    if (entry.triggers.some((t) => combined.includes(t))) {
      const alreadyCovered = matchedMappings.some(
        (m) =>
          m.enTerm.includes(entry.mapping.enTerm) ||
          m.idTerm.includes(entry.mapping.idTerm)
      );
      if (!alreadyCovered) {
        matchedMappings.push(entry.mapping);
      }
    }
  }

  const tokens = extractTopicTokens(`${topic} ${focus}`);
  const uniqueTokens = Array.from(new Set(tokens)).slice(0, 6);

  const idKeywords = Array.from(
    new Set([
      ...matchedMappings.map((m) => m.idTerm),
      ...(focus.trim() ? [focus.trim().toLowerCase()] : []),
      ...(uniqueTokens.length >= 2 ? [uniqueTokens.slice(0, 3).join(' ')] : []),
      ...uniqueTokens.slice(0, 4),
    ])
  ).slice(0, 7);

  const enKeywords = Array.from(
    new Set([
      ...matchedMappings.map((m) => m.enTerm),
      ...matchedMappings.flatMap((m) => m.synonyms.slice(0, 1)),
      ...(program?.name === 'Teknik Pertanian'
        ? ['agricultural engineering', 'postharvest technology']
        : program?.name === 'Teknologi Pangan'
          ? ['food science and technology', 'food quality']
          : ['agro-industrial technology', 'sustainable agroindustry']),
    ])
  ).slice(0, 7);

  const sinonimTeknis =
    matchedMappings.length > 0
      ? matchedMappings.slice(0, 4).map((m) => ({
          istilah: `${m.idTerm} (${m.enTerm})`,
          padanan: m.synonyms,
        }))
      : [
          {
            istilah: uniqueTokens.slice(0, 2).join(' ') || topic.slice(0, 40),
            padanan: [
              ...(program?.focusAreas?.slice(0, 2) || ['agro-industrial processing']),
              'characterization',
              'optimization',
            ],
          },
        ];

  const primaryGroupA = matchedMappings[0]
    ? `("${matchedMappings[0].enTerm}" OR "${matchedMappings[0].synonyms[0]}" OR "${matchedMappings[0].idTerm}")`
    : `("${uniqueTokens.slice(0, 2).join(' ') || topic.trim()}")`;

  const primaryGroupB = matchedMappings[1]
    ? `("${matchedMappings[1].enTerm}" OR "${matchedMappings[1].synonyms[0]}")`
    : program?.name === 'Teknik Pertanian'
      ? `("agricultural engineering" OR "precision agriculture" OR "postharvest")`
      : program?.name === 'Teknologi Pangan'
        ? `("food technology" OR "functional food" OR "food safety")`
        : `("agroindustry" OR "sustainable processing" OR "value added")`;

  const notClause =
    combined.includes('kopi') || combined.includes('pangan')
      ? ' NOT ("clinical trial" OR "animal feed only")'
      : ' NOT ("medical surgery" OR "dental")';

  const cleanOpenAlexQuery = [
    matchedMappings[0]?.enTerm || uniqueTokens.slice(0, 2).join(' '),
    matchedMappings[1]?.enTerm || matchedMappings[0]?.synonyms[0] || '',
  ]
    .filter(Boolean)
    .join(' ');

  const strategiBoolean = [
    {
      label: 'Kueri Inti Presisi Tinggi (AND + OR)',
      query: `${primaryGroupA} AND ${primaryGroupB}`,
      targetDatabase: 'OpenAlex, ScienceDirect, Scopus',
    },
    {
      label: 'Kueri Terfokus dengan Eksklusi (AND + OR + NOT)',
      query: `${primaryGroupA} AND ${primaryGroupB}${notClause}`,
      targetDatabase: 'Scopus, Web of Science, Google Scholar',
    },
    {
      label: 'Kueri Dwibahasa Literatur Nasional & Internasional',
      query: `("${idKeywords[0] || topic.trim()}" OR "${enKeywords[0] || cleanOpenAlexQuery}") AND ("${program?.name || 'agroindustri'}" OR "Indonesia")`,
      targetDatabase: 'Garuda Kemdikbud, SINTA, Kandaga Unpad',
    },
  ];

  const istilahPencarianDisarankan = Array.from(
    new Set([
      cleanOpenAlexQuery,
      ...matchedMappings.flatMap((m) => [m.enTerm, ...m.synonyms.slice(0, 2)]),
      `${enKeywords[0] || 'agroindustry'} review`,
    ])
  )
    .filter(Boolean)
    .slice(0, 6);

  const level = program?.level || 'S1';
  const progName = program?.name || 'FTIP Unpad';

  return {
    kataKunciIndonesia: idKeywords.length > 0 ? idKeywords : [topic.trim()],
    kataKunciInggris: enKeywords,
    sinonimTeknis,
    strategiBoolean,
    istilahPencarianDisarankan,
    catatanStrategi: `Disusun melalui pemetaan terminologi lokal untuk jenjang ${level} (${progName}). Gunakan operator tanda kutip ("...") untuk frasa pasti, OR untuk menggabungkan sinonim, AND untuk mempersempit irisan topik, serta NOT untuk menyaring konteks di luar bidang agroindustri.`,
    sourceMode: 'local',
    modeNotice:
      'Hasil disusun menggunakan Generator Kata Kunci Lokal FTIP (karena kunci Gemini AI server belum dikonfigurasi). Anda dapat langsung menyalin kueri Boolean atau mencarinya di Pencari Jurnal OpenAlex.',
  };
}

export function generateLocalAssistantReply(
  userMessage: string,
  program?: Partial<StudyProgram>
): { reply: string; suggestedSearchQuery: string } {
  const level = program?.level || 'S1';
  const progName = program?.name || 'Teknologi Pangan';
  const thesisTerm = program?.thesisTerm || 'Skripsi / Tugas Akhir';
  const kwResult = generateLocalKeywords(userMessage, '', program);
  const openAlexQuery = kwResult.istilahPencarianDisarankan[0] || program?.sampleJournalQuery || 'food safety agroindustry';

  let levelAdvice =
    'Untuk jenjang S1, fokuskan pada 1–2 variabel perlakuan atau parameter mutu utama, gunakan metode uji standar (mis. SNI/AOAC/ISO), serta rujuk minimal 15–25 artikel jurnal 5 tahun terakhir.';
  if (level === 'S2') {
    levelAdvice =
      'Untuk jenjang Magister (S2), tekankan pemetaan research gap antar-penelitian terdahulu, validasi model atau optimasi multi-faktor (mis. RSM/LCA/pemodelan sistem), serta tinjauan literatur sistematis.';
  } else if (level === 'S3') {
    levelAdvice =
      'Untuk jenjang Doktor (S3), pastikan kebaruan ilmiah (novelty) fundamental terpetakan melalui systematic literature review (PRISMA) terhadap publikasi Q1 mutakhir serta integrasi pendekatan lintas disiplin.';
  }

  const reply = `[Mode Panduan Referensi Lokal FTIP — ${level} ${progName}]

Berdasarkan pertanyaan Anda terkait "${userMessage.trim()}", berikut panduan terstruktur untuk ${thesisTerm} di Program Studi ${progName}:

1. Perumusan Fokus & Pertanyaan Penelitian
   • Tentukan objek kajian utama (${kwResult.kataKunciIndonesia.slice(0, 3).join(', ')}).
   • Hubungkan dengan variabel terukur atau indikator kinerja yang relevan dengan fokus ${program?.focusAreas?.slice(0, 2).join(' dan ') || progName}.
   • ${levelAdvice}

2. Rekomendasi Kata Kunci & Strategi Pencarian
   • Kata kunci Indonesia: ${kwResult.kataKunciIndonesia.slice(0, 4).join(', ')}
   • Kata kunci Inggris: ${kwResult.kataKunciInggris.slice(0, 4).join(', ')}
   • Kueri Boolean siap pakai:
     ${kwResult.strategiBoolean[0]?.query}

3. Sumber Ilmiah yang Disarankan
   • Internasional: OpenAlex (tersedia di tab Journal Finder), ScienceDirect, Scopus, SpringerLink, dan FAO/WHO Codex Alimentarius (bila terkait standar pangan).
   • Nasional: Portal Garuda, SINTA, serta Repositori Kandaga Universitas Padjadjaran untuk memetakan riset terdahulu di lingkungan Unpad.

4. Verifikasi Referensi
   • Saya tidak dapat memverifikasi judul artikel atau DOI secara langsung dari memori tanpa pencarian indeks nyata. Untuk memperoleh daftar artikel ilmiah terverifikasi beserta tautan aslinya, silakan gunakan tombol pencarian Journal Finder (OpenAlex) dengan kueri: "${openAlexQuery}".`;

  return { reply, suggestedSearchQuery: openAlexQuery };
}
