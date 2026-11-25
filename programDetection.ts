export interface DetectedProgramMention {
  programName?: string;
  level?: 'S1' | 'S2' | 'S3';
}

export function detectProgramFromText(text: string): DetectedProgramMention {
  const lower = text.toLowerCase();
  let programName: string | undefined;
  let level: 'S1' | 'S2' | 'S3' | undefined;

  if (lower.includes('teknologi industri pertanian') || /\btip\b/.test(lower)) {
    programName = 'Teknologi Industri Pertanian';
  } else if (lower.includes('teknologi agroindustri')) {
    programName = 'Teknologi Agroindustri';
  } else if (lower.includes('teknik pertanian') || lower.includes('biosistem') || /\btep\b/.test(lower)) {
    programName = 'Teknik Pertanian';
  } else if (lower.includes('teknologi pangan') || /\btpn\b/.test(lower)) {
    programName = 'Teknologi Pangan';
  } else if (
    lower.includes('sosial ekonomi pertanian') ||
    lower.includes('agribisnis') ||
    lower.includes('sosek')
  ) {
    programName = 'Sosial Ekonomi Pertanian / Agribisnis';
  }

  if (/\bs3\b|doktor|disertasi/.test(lower)) {
    level = 'S3';
  } else if (/\bs2\b|magister|tesis/.test(lower)) {
    level = 'S2';
  } else if (/\bs1\b|sarjana|skripsi/.test(lower)) {
    level = 'S1';
  }

  return { programName, level };
}

export function normalizeAcademicQuery(rawQuery: string): string {
  return rawQuery
    .replace(/\bNOT\s*\([^)]*\)/gi, ' ')
    .replace(/\bNOT\s+"[^"]*"/gi, ' ')
    .replace(/\b(AND|OR|NOT)\b/g, ' ')
    .replace(/[()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
