import React, { useState } from 'react'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import type { CharacterProfile } from '../../../types/game'
import { UNIVERSITY_MAJORS, getUniversityMajorById } from '../data/majors'
import { evaluateMajorEligibility } from '../services/educationService'
import { TuitionFundingStep } from './TuitionFundingStep'

interface UniversityApplicationModalProps {
  isOpen: boolean;
  character: CharacterProfile;
  onEnroll: (
    majorId: string,
    fundingMethod: 'scholarship' | 'parents' | 'student_loan'
  ) => void;
  onClose: () => void;
}

export const UniversityApplicationModal: React.FC<
  UniversityApplicationModalProps
> = ({ isOpen, character, onEnroll, onClose }) => {
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedMajor = selectedMajorId
    ? getUniversityMajorById(selectedMajorId)
    : undefined;

  const selectedEligibility = selectedMajor
    ? evaluateMajorEligibility(character, selectedMajor)
    : null;

  const handleClose = () => {
    setSelectedMajorId(null);
    onClose();
  };

  const handleConfirmFunding = (
    fundingMethod: 'scholarship' | 'parents' | 'student_loan'
  ) => {
    if (!selectedMajorId) return;
    onEnroll(selectedMajorId, fundingMethod);
    setSelectedMajorId(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={selectedMajor ? 'Choose Tuition & Funding' : 'Apply for University'}
      icon="🎓"
      actions={
        selectedMajor ? (
          <CartoonButton
            variant="white"
            size="md"
            fullWidth
            onClick={() => setSelectedMajorId(null)}
            icon={<ArrowLeft className="w-4 h-4 stroke-[2.5]" />}
          >
            Back to Majors
          </CartoonButton>
        ) : (
          <CartoonButton variant="white" size="md" fullWidth onClick={handleClose}>
            Maybe Later
          </CartoonButton>
        )
      }
    >
      {/* STEP 1: Select a University Major */}
      {!selectedMajor && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-600">
              Select a 4-Year Undergraduate Major
            </span>
            <Badge variant="sky" size="xs">
              Grades: {character.education.grades}%
            </Badge>
          </div>

          <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2.5">
            {UNIVERSITY_MAJORS.map((major) => {
              const check = evaluateMajorEligibility(character, major);

              return (
                <div
                  key={major.id}
                  className={`
                    rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all
                    ${
                      check.isAdmissible
                        ? 'bg-slate-50 border-slate-900 shadow-[1.5px_2px_0_#0f172a]'
                        : 'bg-slate-100/70 border-slate-300 opacity-80'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1.5px_1.5px_0_#0f172a] flex-shrink-0">
                        {major.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-950 text-xs leading-tight truncate">
                          {major.name}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                          {major.degreeTitle} • ${major.tuitionPerYear.toLocaleString()}/yr
                        </p>
                      </div>
                    </div>

                    {check.isAdmissible ? (
                      <CartoonButton
                        variant="emerald"
                        size="sm"
                        onClick={() => setSelectedMajorId(major.id)}
                      >
                        Select
                      </CartoonButton>
                    ) : (
                      <Badge
                        variant="rose"
                        size="xs"
                        icon={<Lock className="w-3 h-3" />}
                      >
                        Locked
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {check.isAdmissible ? (
                      <Badge
                        variant="emerald"
                        size="xs"
                        icon={<CheckCircle2 className="w-3 h-3" />}
                      >
                        Admissible
                      </Badge>
                    ) : (
                      <Badge variant="rose" size="xs">
                        {check.reasonIfIneligible}
                      </Badge>
                    )}

                    {check.hasDisciplineBonus && (
                      <Badge variant="amber" size="xs">
                        ⭐ {check.disciplineYears} yr Track Bonus
                      </Badge>
                    )}

                    {(check.qualifiesMeritScholarship ||
                      check.qualifiesAthleticScholarship) &&
                      check.isAdmissible && (
                        <Badge variant="sky" size="xs">
                          🏆 Scholarship Eligible!
                        </Badge>
                      )}
                  </div>

                  <p className="text-[11px] font-bold text-slate-600 leading-snug">
                    {major.description}
                  </p>

                  <div className="rounded-xl bg-white/90 border border-slate-300 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 truncate">
                    🎯 <span className="font-black text-slate-700">Careers:</span>{' '}
                    {major.careerUnlocks}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* STEP 2: Choose Funding Plan for Selected Major */}
      {selectedMajor && selectedEligibility && (
        <TuitionFundingStep
          programTitle={selectedMajor.name}
          degreeTitle={selectedMajor.degreeTitle}
          icon={selectedMajor.icon}
          programTypeLabel="4-Year Undergraduate Program"
          durationYears={4}
          tuitionPerYear={selectedMajor.tuitionPerYear}
          totalTuition={selectedMajor.tuitionPerYear * 4}
          familyWealth={character.parents.wealth}
          scholarshipQualified={
            selectedEligibility.qualifiesMeritScholarship ||
            selectedEligibility.qualifiesAthleticScholarship
          }
          scholarshipLabel="Apply for Full Scholarship"
          scholarshipNote={
            selectedEligibility.qualifiesMeritScholarship
              ? 'Qualified for 100% Academic Merit Scholarship!'
              : selectedEligibility.qualifiesAthleticScholarship
              ? 'Qualified for 100% Athletic Division Scholarship!'
              : 'Requires 88%+ Grades & 74+ Smarts, or Varsity Captaincy'
          }
          onSelectFunding={(method) => handleConfirmFunding(method as 'scholarship' | 'parents' | 'student_loan')}
          onBack={() => setSelectedMajorId(null)}
        />
      )}
    </Modal>
  );
};

