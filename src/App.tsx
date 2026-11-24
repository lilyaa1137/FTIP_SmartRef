/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { STUDY_PROGRAMS } from './data/programs';
import { StudyProgram, WorkspaceTab } from './types/smartref';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ServiceSection } from './components/ServiceSection';
import { WorkspaceSection } from './components/WorkspaceSection';
import { ProgramSelector } from './components/ProgramSelector';
import { AskLibrarianSection } from './components/AskLibrarianSection';
import { Footer } from './components/Footer';

export default function App() {
  const [selectedProgram, setSelectedProgram] = useState<StudyProgram>(STUDY_PROGRAMS[1]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('assistant');
  const [journalSearchQuery, setJournalSearchQuery] = useState<string | undefined>(undefined);
  const [journalSearchTrigger, setJournalSearchTrigger] = useState<number>(0);

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectService = (target: WorkspaceTab | 'librarian') => {
    if (target === 'librarian') {
      scrollToElement('tanya-pustakawan');
      return;
    }
    setActiveTab(target);
    scrollToElement('ruang-layanan');
  };

  const handleTriggerJournalSearch = (query: string) => {
    setJournalSearchQuery(query);
    setJournalSearchTrigger((n) => n + 1);
    setActiveTab('journals');
    scrollToElement('ruang-layanan');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#333333]">
      <Navbar onNavigateSection={scrollToElement} />

      <main className="flex-1">
        <HeroSection
          onStartSearch={() => {
            setActiveTab('journals');
            scrollToElement('ruang-layanan');
          }}
          onLearnServices={() => scrollToElement('layanan')}
        />

        <ServiceSection activeTab={activeTab} onSelectService={handleSelectService} />

        <WorkspaceSection
          programs={STUDY_PROGRAMS}
          selectedProgram={selectedProgram}
          onSelectProgram={setSelectedProgram}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          journalSearchQuery={journalSearchQuery}
          journalSearchTrigger={journalSearchTrigger}
          onTriggerJournalSearch={handleTriggerJournalSearch}
        />

        <ProgramSelector
          programs={STUDY_PROGRAMS}
          selectedProgram={selectedProgram}
          onSelectProgram={setSelectedProgram}
          onProceedToWorkspace={() => {
            setActiveTab('assistant');
            scrollToElement('ruang-layanan');
          }}
        />

        <AskLibrarianSection
          programs={STUDY_PROGRAMS}
          selectedProgram={selectedProgram}
        />
      </main>

      <Footer onNavigateSection={scrollToElement} />
    </div>
  );
}
