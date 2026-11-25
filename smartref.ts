export type AcademicLevel = 'S1' | 'S2' | 'S3';

export interface StudyProgram {
  id: string;
  level: AcademicLevel;
  levelLabel: string;
  name: string;
  thesisTerm: string;
  description: string;
  focusAreas: string[];
  recommendedDatabases: string[];
  samplePrompts: string[];
  sampleKeywordTopic: string;
  sampleJournalQuery: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sourceMode?: 'gemini' | 'local';
  suggestedSearchQuery?: string;
  verifiedArticles?: JournalArticle[];
  isError?: boolean;
}

export interface KeywordSynonymGroup {
  istilah: string;
  padanan: string[];
}

export interface BooleanStrategy {
  label: string;
  query: string;
  targetDatabase: string;
}

export interface KeywordGenerationResult {
  kataKunciIndonesia: string[];
  kataKunciInggris: string[];
  sinonimTeknis: KeywordSynonymGroup[];
  strategiBoolean: BooleanStrategy[];
  istilahPencarianDisarankan: string[];
  catatanStrategi: string;
  sourceMode?: 'gemini' | 'local';
  modeNotice?: string;
}

export interface JournalArticle {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number | null;
  sourceName: string;
  isOpenAccess: boolean;
  citedByCount: number;
  doiUrl: string | null;
  landingUrl: string | null;
  abstractSnippet: string | null;
  type: string;
  sourceProvider?: 'OpenAlex' | 'Crossref';
}

export interface LibrarianTicketResponse {
  ticketId: string;
  createdAt: string;
  name: string;
  programLabel: string;
  category: string;
  status: string;
  modeNote: string;
}

export type WorkspaceTab = 'assistant' | 'keywords' | 'journals';
