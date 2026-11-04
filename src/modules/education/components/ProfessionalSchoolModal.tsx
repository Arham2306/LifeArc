import React, { useState } from 'react'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import type { CharacterProfile } from '../../../types/game'
import {
  PROFESSIONAL_SCHOOLS_CATALOG,
  getProfessionalSchoolById,
} from '../data/professionalSchools'
import { evaluateProfessionalSchoolEligibility } from '../services/educationService'

interface ProfessionalSchoolModalProps {
  isOpen: boolean;
  character: CharacterProfile;
  onEnroll: (
    schoolId: string,
    fundingMethod: 'scholarship' | 'parents' | 'student_loan'
  ) => void;
  onClose: () => void;
}

export const ProfessionalSchoolModal: React.FC<ProfessionalSchoolModalProps> = ({
  isOpen,
  character,
  onEnroll,
  onClose,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedSchool = selectedSchoolId
    ? getProfessionalSchoolById(selectedSchoolId)
    : undefined;

  const selectedEligibility = selectedSchool
    ? evaluateProfessionalSchoolEligibility(character, selectedSchool)
    : null;

  const handleClose = () => {
    setSelectedSchoolId(null);
    onClose();
  };

  const handleConfirmFunding = (
    fundingMethod: 'scholarship' | 'parents' | 'student_loan'
  ) => {
    if (!selectedSchoolId) return;
    onEnroll(selectedSchoolId, fundingMethod);
    setSelectedSchoolId(null);
  };

  const totalTuition = selectedSchool
    ? selectedSchool.tuitionPerYear * selectedSchool.durationYears
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        selectedSchool
          ? 'Professional School Funding'
          : 'Professional & Graduate Schools'
      }
      icon="🏛️"
      actions={
        selectedSchool ? (
          <CartoonButton
            variant="white"
            size="md"
            fullWidth
            onClick={() => setSelectedSchoolId(null)}
            icon={<ArrowLeft className="w-4 h-4 stroke-[2.5]" />}
          >
            Back to Programs
          </CartoonButton>
        ) : (
          <CartoonButton variant="white" size="md" fullWidth onClick={handleClose}>
            Maybe Later
          </CartoonButton>
        )
      }
    >
      {/* STEP 1: Select a Professional / Graduate Program */}
      {!selectedSchool && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-600">
              Specialized Graduate & Doctoral Programs
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="sky" size="xs">
                Grades: {character.education.grades}%
              </Badge>
              <Badge variant="amber" size="xs">
                Smarts: {character.stats.smarts}
              </Badge>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
            {PROFESSIONAL_SCHOOLS_CATALOG.map((school) => {
              const check = evaluateProfessionalSchoolEligibility(character, school);
              const programTuition = school.tuitionPerYear * school.durationYears;

              return (
                <div
                  key={school.id}
                  className={`
                    rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all
                    ${
                      check.isAdmissible
                        ? 'bg-slate-50 border-slate-900 shadow-[1.5px_2px_0_#0f172a]'
                        : 'bg-slate-100/80 border-slate-300 opacity-80'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1.5px_1.5px_0_#0f172a] flex-shrink-0">
                        {school.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-slate-950 text-xs leading-tight truncate">
                            {school.name}
                          </h4>
                          <Badge variant="slate" size="xs">
                            {school.durationYears} {school.durationYears === 1 ? 'Year' : 'Years'}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 truncate mt-0.5">
                          {school.degreeAwarded}
                        </p>
                      </div>
                    </div>

                    {check.alreadyEarned ? (
                      <Badge variant="emerald" size="xs">
                        🎓 Earned
                      </Badge>
                    ) : check.isAdmissible ? (
                      <CartoonButton
                        variant="emerald"
                        size="sm"
                        onClick={() => setSelectedSchoolId(school.id)}
                      >
                        Apply
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

                  {/* Prerequisites & Requirements Pill Row */}
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Degree Requirement Badge */}
                    {school.requiredDegreeTitles.length === 0 ? (
                      <Badge variant="emerald" size="xs">
                        High School Diploma (Open)
                      </Badge>
                    ) : check.hasRequiredDegree ? (
                      <Badge
                        variant="emerald"
                        size="xs"
                        icon={<CheckCircle2 className="w-3 h-3" />}
                      >
                        Degree Prereq Met
                      </Badge>
                    ) : (
                      <Badge
                        variant="rose"
                        size="xs"
                        icon={<Lock className="w-3 h-3" />}
                      >
                        Req: {school.requiredDegreeTitles[0]}
                      </Badge>
                    )}

                    {/* Minimum Academic Standing */}
                    <Badge
                      variant={
                        character.education.grades >= school.minGrades
                          ? 'slate'
                          : 'rose'
                      }
                      size="xs"
                    >
                      Min {school.minGrades}% Grades
                    </Badge>

                    {/* Minimum Smarts */}
                    <Badge
                      variant={
                        character.stats.smarts >= school.minSmarts
                          ? 'slate'
                          : 'rose'
                      }
                      size="xs"
                    >
                      Min {school.minSmarts} Smarts
                    </Badge>

                    {/* Minimum Health if applicable (Flight School) */}
                    {school.minHealth && (
                      <Badge
                        variant={
                          character.stats.health >= school.minHealth
                            ? 'slate'
                            : 'rose'
                        }
                        size="xs"
                      >
                        Min {school.minHealth} Health
                      </Badge>
                    )}

                    {/* Merit Scholarship Indicator */}
                    {check.isAdmissible && check.qualifiesMeritScholarship && (
                      <Badge variant="sky" size="xs">
                        🏆 Merit Scholarship
                      </Badge>
                    )}
                  </div>

                  {/* Description & Career Unlocks */}
                  <p className="text-[10px] font-bold text-slate-600 leading-snug">
                    {school.description}
                  </p>
                  <p className="text-[9px] font-black text-amber-700 leading-snug">
                    ✨ Unlocks: {school.careerUnlocks}
                  </p>

                  {/* Financial Overview */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-0.5 border-t border-slate-200">
                    <span>
                      Tuition: ${school.tuitionPerYear.toLocaleString()} / year
                    </span>
                    <span className="font-mono font-black text-slate-800">
                      Total: ${programTuition.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* STEP 2: Choose Tuition Funding for Selected Program */}
      {selectedSchool && (
        <div className="space-y-3">
          {/* Selected School Banner */}
          <div className="rounded-2xl border-2 border-slate-900 bg-sky-50 p-3 flex items-center gap-3 shadow-[1.5px_2px_0_#0f172a]">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[1.5px_1.5px_0_#0f172a] flex-shrink-0">
              {selectedSchool.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                Admitted Candidate
              </span>
              <h4 className="font-black text-slate-950 text-sm leading-tight truncate">
                {selectedSchool.name}
              </h4>
              <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                {selectedSchool.degreeAwarded} • {selectedSchool.durationYears} Years
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase">
                Total Tuition
              </p>
              <p className="font-mono text-sm font-black text-slate-900">
                ${totalTuition.toLocaleString()}
              </p>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-700">
            How would you like to finance your {selectedSchool.durationYears}-year professional degree?
          </p>

          <div className="space-y-2">
            {/* OPTION 1: Merit Scholarship */}
            <div
              className={`
                rounded-2xl border-2 p-3 flex flex-col gap-1.5 transition-all
                ${
                  selectedEligibility?.qualifiesMeritScholarship
                    ? 'border-emerald-700 bg-emerald-50/70 shadow-[1.5px_2px_0_#0f172a]'
                    : 'border-slate-300 bg-slate-100 opacity-60'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div>
                    <h5 className="font-black text-xs text-slate-900">
                      Presidential Merit Scholarship (100% Free)
                    </h5>
                    <p className="text-[10px] font-bold text-slate-600">
                      Covers full ${totalTuition.toLocaleString()} tuition with $0 student debt!
                    </p>
                  </div>
                </div>
                {selectedEligibility?.qualifiesMeritScholarship ? (
                  <CartoonButton
                    variant="emerald"
                    size="sm"
                    onClick={() => handleConfirmFunding('scholarship')}
                  >
                    Accept
                  </CartoonButton>
                ) : (
                  <Badge variant="slate" size="xs">
                    Req: 90% Grades & 80 Smarts
                  </Badge>
                )}
              </div>
            </div>

            {/* OPTION 2: Ask Parents to Pay */}
            <div className="rounded-2xl border-2 border-slate-900 bg-amber-50/60 p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍👩‍👧</span>
                  <div>
                    <h5 className="font-black text-xs text-slate-900">
                      Ask Parents to Sponsor Tuition
                    </h5>
                    <p className="text-[10px] font-bold text-slate-600">
                      Family Wealth: <span className="font-black capitalize">{character.parents.wealth}</span>
                    </p>
                  </div>
                </div>
                <CartoonButton
                  variant="amber"
                  size="sm"
                  onClick={() => handleConfirmFunding('parents')}
                >
                  Ask Parents
                </CartoonButton>
              </div>
            </div>

            {/* OPTION 3: Professional Student Loan */}
            <div className="rounded-2xl border-2 border-slate-900 bg-sky-50/60 p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <div>
                    <h5 className="font-black text-xs text-slate-900">
                      Professional Student Loan (Deferred)
                    </h5>
                    <p className="text-[10px] font-bold text-slate-600">
                      ${selectedSchool.tuitionPerYear.toLocaleString()} per year added to debt. Repay after graduation!
                    </p>
                  </div>
                </div>
                <CartoonButton
                  variant="sky"
                  size="sm"
                  onClick={() => handleConfirmFunding('student_loan')}
                >
                  Take Loan
                </CartoonButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
