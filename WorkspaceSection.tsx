import { BookOpen, KeyRound, MessageSquareText } from 'lucide-react';
import { StudyProgram, WorkspaceTab } from '../types/smartref';
import { AiAssistantPanel } from './AiAssistantPanel';
import { KeywordGeneratorPanel } from './KeywordGeneratorPanel';
import { JournalFinderPanel } from './JournalFinderPanel';

interface WorkspaceSectionProps {
  programs: StudyProgram[];
  selectedProgram: StudyProgram;
  hasExplicitProgram?: boolean;
  onSelectProgram: (program: StudyProgram) => void;
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  journalSearchQuery?: string;
  journalSearchTrigger: number;
  onTriggerJournalSearch: (query: string) => void;
}

const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string; icon: typeof MessageSquareText }> = [
  { id: 'assistant', label: 'AI Reference Assistant', icon: MessageSquareText },
  { id: 'keywords', label: 'Smart Keyword Generator', icon: KeyRound },
  { id: 'journals', label: 'Journal Finder', icon: BookOpen },
];

export function WorkspaceSection({
  programs,
  selectedProgram,
  hasExplicitProgram = false,
  onSelectProgram,
  activeTab,
  onChangeTab,
  journalSearchQuery,
  journalSearchTrigger,
  onTriggerJournalSearch,
}: WorkspaceSectionProps) {
  return (
    <section id="ruang-layanan" className="bg-[#FFFFFF] pt-4 pb-16 sm:pb-20">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="border border-[#E5E5DF] rounded-md bg-[#FFFFFF]">
          {/* Workspace Header Bar */}
          <div className="px-5 sm:px-7 py-4 bg-[#F7F6F0] border-b border-[#E5E5DF] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Layanan Interaktif FTIP SmartRef"
              className="flex flex-wrap items-center gap-2"
            >
              {WORKSPACE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onChangeTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#193C32] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] text-[#333333]/80 border border-[#E5E5DF] hover:text-[#193C32] hover:border-[#193C32]/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="workspace-program-select"
                className="text-xs text-[#333333]/75 whitespace-nowrap"
              >
                Program Studi:
              </label>
              <select
                id="workspace-program-select"
                value={selectedProgram.id}
                onChange={(e) => {
                  const found = programs.find((p) => p.id === e.target.value);
                  if (found) onSelectProgram(found);
                }}
                className="h-9 rounded-md border border-[#E5E5DF] bg-[#FFFFFF] px-3 text-xs sm:text-sm font-medium text-[#193C32] focus:outline-none focus:border-[#193C32]"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.level} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Workspace Body */}
          <div className="p-5 sm:p-8">
            {activeTab === 'assistant' && (
              <AiAssistantPanel
                selectedProgram={selectedProgram}
                hasExplicitProgram={hasExplicitProgram}
                onOpenJournals={onTriggerJournalSearch}
              />
            )}

            {activeTab === 'keywords' && (
              <KeywordGeneratorPanel
                selectedProgram={selectedProgram}
                hasExplicitProgram={hasExplicitProgram}
                onSearchInJournals={onTriggerJournalSearch}
              />
            )}

            {activeTab === 'journals' && (
              <JournalFinderPanel
                selectedProgram={selectedProgram}
                externalQuery={journalSearchQuery}
                externalTrigger={journalSearchTrigger}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
