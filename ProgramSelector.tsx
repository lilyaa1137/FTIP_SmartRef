import { Check } from 'lucide-react';
import { AcademicLevel, StudyProgram } from '../types/smartref';

interface ProgramSelectorProps {
  programs: StudyProgram[];
  selectedProgram: StudyProgram;
  onSelectProgram: (program: StudyProgram) => void;
  onProceedToWorkspace: () => void;
}

const LEVELS: Array<{ level: AcademicLevel; title: string }> = [
  { level: 'S1', title: 'Program Sarjana (S1)' },
  { level: 'S2', title: 'Program Magister (S2)' },
  { level: 'S3', title: 'Program Doktor (S3)' },
];

export function ProgramSelector({
  programs,
  selectedProgram,
  onSelectProgram,
  onProceedToWorkspace,
}: ProgramSelectorProps) {
  return (
    <section
      id="program-studi"
      className="bg-[#F7F6F0] border-t border-b border-[#E5E5DF] py-14 sm:py-18"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#193C32]">
              Untuk Seluruh Sivitas Akademika FTIP
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-[#333333]/80 leading-relaxed">
              Pilih program studi Anda untuk menyesuaikan rekomendasi literatur, kedalaman
              metodologi, dan strategi pencarian pada layanan FTIP SmartRef.
            </p>
          </div>

          <div className="text-xs text-[#333333]/75 shrink-0">
            Program aktif:{' '}
            <span className="font-medium text-[#193C32]">
              {selectedProgram.level} {selectedProgram.name}
            </span>
          </div>
        </div>

        {/* Simple Organized List Grouped by S1, S2, and S3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {LEVELS.map(({ level, title }) => {
            const groupPrograms = programs.filter((p) => p.level === level);
            return (
              <div key={level} className="border-t border-[#193C32]/25 pt-4">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-serif text-lg font-medium text-[#193C32]">{title}</h3>
                  <span className="text-xs font-mono text-[#333333]/60">{level}</span>
                </div>

                <ul className="divide-y divide-[#E5E5DF] bg-[#FFFFFF] border border-[#E5E5DF] rounded-md">
                  {groupPrograms.map((program) => {
                    const isSelected = selectedProgram.id === program.id;
                    return (
                      <li key={program.id}>
                        <button
                          type="button"
                          onClick={() => onSelectProgram(program)}
                          aria-pressed={isSelected}
                          className={`w-full text-left px-4 py-3.5 transition-colors flex items-start justify-between gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#193C32] ${
                            isSelected
                              ? 'bg-[#F7F6F0] text-[#193C32]'
                              : 'bg-[#FFFFFF] text-[#333333] hover:bg-[#F7F6F0]/60'
                          }`}
                        >
                          <div>
                            <p
                              className={`text-sm ${
                                isSelected ? 'font-semibold text-[#193C32]' : 'font-medium'
                              }`}
                            >
                              {program.name}
                            </p>
                            <p className="mt-1 text-xs text-[#333333]/65 leading-relaxed">
                              {program.focusAreas.slice(0, 2).join(' · ')}
                            </p>
                          </div>

                          <span
                            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-[#193C32] border-[#193C32] text-[#FFFFFF]'
                                : 'border-[#E5E5DF] text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" strokeWidth={2} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-[#333333]/80">
            Rekomendasi asisten dan kata kunci saat ini disesuaikan untuk{' '}
            <span className="font-medium text-[#193C32]">
              {selectedProgram.levelLabel} {selectedProgram.name}
            </span>{' '}
            ({selectedProgram.thesisTerm}).
          </p>
          <button
            type="button"
            onClick={onProceedToWorkspace}
            className="text-sm font-medium text-[#193C32] underline underline-offset-4 decoration-[#B5A477] hover:text-[#245744] whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Terapkan ke Ruang Layanan
          </button>
        </div>
      </div>
    </section>
  );
}
