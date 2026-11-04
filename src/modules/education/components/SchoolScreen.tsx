import React, { useState } from 'react'
import {
  Clock,
  Award,
  BookOpen,
  AlertTriangle,
  XCircle,
  Trophy,
  GraduationCap,
} from 'lucide-react'
import type { CharacterProfile } from '../../../types/game'
import type { ActionOutcomeNotice, ActiveSchoolStage } from '../types'
import { SCHOOL_STAGE_CONFIG, getLetterGradeMeta } from '../data/schools'
import { getTuitionFundingMeta, UNIVERSITY_YEAR_LABELS } from '../data/majors'
import { getProfessionalSchoolById } from '../data/professionalSchools'
import {
  enrollInProfessionalSchool,
  enrollInUniversity,
  joinOrTryoutActivity,
  performAskForTutor,
  performDropOut,
  performSlackOff,
  performStudyHarder,
  practiceActivity,
  quitActivity,
} from '../services/educationService'
import { CartoonCard } from '../../../components/ui/CartoonCard'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import { StatBar } from '../../../components/ui/StatBar'
import { ActionOutcomeModal } from './ActionOutcomeModal'
import { DropOutConfirmModal } from './DropOutConfirmModal'
import { ActivityDirectoryModal } from './ActivityDirectoryModal'
import { SchoolActivitiesModal } from './SchoolActivitiesModal'
import { UniversityApplicationModal } from './UniversityApplicationModal'
import { ProfessionalSchoolModal } from './ProfessionalSchoolModal'

interface SchoolScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (character: CharacterProfile) => void;
  isUniversityModalOpen?: boolean;
  onSetUniversityModalOpen?: (open: boolean) => void;
  isProfessionalModalOpen?: boolean;
  onSetProfessionalModalOpen?: (open: boolean) => void;
}

export const SchoolScreen: React.FC<SchoolScreenProps> = ({
  character,
  onUpdateCharacter,
  isUniversityModalOpen = false,
  onSetUniversityModalOpen,
  isProfessionalModalOpen = false,
  onSetProfessionalModalOpen,
}) => {
  const [outcomeNotice, setOutcomeNotice] = useState<ActionOutcomeNotice | null>(null);
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [isDropOutModalOpen, setIsDropOutModalOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [localUniModalOpen, setLocalUniModalOpen] = useState(false);
  const [localProfModalOpen, setLocalProfModalOpen] = useState(false);

  const uniModalOpen = isUniversityModalOpen || localUniModalOpen;
  const setUniModalOpen = (open: boolean) => {
    setLocalUniModalOpen(open);
    onSetUniversityModalOpen?.(open);
  };

  const profModalOpen = isProfessionalModalOpen || localProfModalOpen;
  const setProfModalOpen = (open: boolean) => {
    setLocalProfModalOpen(open);
    onSetProfessionalModalOpen?.(open);
  };

  const { education, age, city } = character;
  const isPreSchool = education.currentStage === 'none' && age < 5;
  const isK12Student =
    education.currentStage === 'elementary' ||
    education.currentStage === 'middle_school' ||
    education.currentStage === 'high_school';
  const isUniversityStudent =
    education.currentStage === 'university' && !!education.university;
  const isProfessionalStudent =
    education.currentStage === 'professional_school' && !!education.professionalSchool;
  const isActiveStudent = isK12Student || isUniversityStudent || isProfessionalStudent;

  const activeStageConfig = isK12Student
    ? SCHOOL_STAGE_CONFIG[education.currentStage as ActiveSchoolStage]
    : null;

  const gradeMeta = getLetterGradeMeta(education.grades);
  const stageProgressPercent =
    education.totalYearsInStage > 0
      ? Math.round((education.yearInStage / education.totalYearsInStage) * 100)
      : 0;

  const canDropOut =
    (education.currentStage === 'high_school' && age >= 16) ||
    isUniversityStudent ||
    isProfessionalStudent;

  const hasUniversityDegree = education.history.some(
    (h) => h.stage === 'university' && h.status === 'graduated'
  );
  const hasProfessionalDegree = education.history.some(
    (h) => h.stage === 'professional_school' && h.status === 'graduated'
  );

  const handleStudyHarder = () => {
    if (!isActiveStudent || education.yearActions.studiedHard) return;
    const result = performStudyHarder(character);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handleSlackOff = () => {
    if (!isActiveStudent || education.yearActions.slackedOff) return;
    const result = performSlackOff(character);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handleAskForTutor = () => {
    if (!isActiveStudent || education.yearActions.askedForTutor) return;
    const result = performAskForTutor(character);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handleConfirmDropOut = () => {
    setIsDropOutModalOpen(false);
    setIsActivitiesModalOpen(false);
    if (!canDropOut) return;
    const result = performDropOut(character);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handleSelectActivityFromDirectory = (templateId: string) => {
    setIsDirectoryOpen(false);
    const result = joinOrTryoutActivity(character, templateId);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handlePracticeActivity = (activityId: string) => {
    const result = practiceActivity(character, activityId);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handleQuitActivity = (activityId: string) => {
    const result = quitActivity(character, activityId);
    onUpdateCharacter(result.character);
    setOutcomeNotice(result.outcome);
  };

  const handleEnrollUniversity = (
    majorId: string,
    fundingMethod: 'scholarship' | 'parents' | 'student_loan'
  ) => {
    const result = enrollInUniversity(character, majorId, fundingMethod);
    onUpdateCharacter(result.character);
    if (result.enrolled) {
      setUniModalOpen(false);
    }
    setOutcomeNotice(result.outcome);
  };

  const handleEnrollProfessionalSchool = (
    schoolId: string,
    fundingMethod: 'scholarship' | 'parents' | 'student_loan'
  ) => {
    const result = enrollInProfessionalSchool(character, schoolId, fundingMethod);
    onUpdateCharacter(result.character);
    if (result.enrolled) {
      setProfModalOpen(false);
    }
    setOutcomeNotice(result.outcome);
  };

  const uniFundingMeta = education.university
    ? getTuitionFundingMeta(education.university.fundingType)
    : null;

  const profFundingMeta = education.professionalSchool
    ? getTuitionFundingMeta(education.professionalSchool.fundingType)
    : null;

  return (
    <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px]">
      {/* STATE 1: Too Young for School (Ages 0 - 4) */}
      {isPreSchool && (
        <CartoonCard variant="amber" borderSize="sm" className="p-4 flex flex-col items-center text-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-white border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_2.5px_0_#0f172a]">
            🧸
          </div>
          <div>
            <h3 className="font-black text-slate-950 text-base">Pre-School Years</h3>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              You will automatically enroll in a local elementary school in{' '}
              <span className="text-slate-900 font-black">{city}</span> at{' '}
              <span className="text-slate-900 font-black">Age 5</span>.
            </p>
          </div>
          <Badge variant="slate" size="xs" icon={<Clock className="w-3 h-3" />}>
            Starts in {5 - age} {5 - age === 1 ? 'Year' : 'Years'}
          </Badge>
        </CartoonCard>
      )}

      {/* STATE 2: Active K-12, University, or Professional Student */}
      {isActiveStudent && (
        <>
          {/* Current School / University / Professional School Banner */}
          <CartoonCard
            variant={
              isProfessionalStudent
                ? 'purple'
                : isUniversityStudent
                ? 'sky'
                : 'amber'
            }
            borderSize="sm"
            className="p-3.5 flex flex-col gap-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[2px_2px_0_#0f172a] flex-shrink-0">
                  {isProfessionalStudent
                    ? getProfessionalSchoolById(
                        education.professionalSchool?.schoolId || ''
                      )?.icon || '🏛️'
                    : isUniversityStudent
                    ? '🏛️'
                    : activeStageConfig?.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="slate" size="xs">
                      {isProfessionalStudent
                        ? 'Professional School'
                        : isUniversityStudent
                        ? 'University'
                        : activeStageConfig?.shortLabel}
                    </Badge>
                    <span className="text-[11px] font-black text-slate-800 truncate">
                      {isProfessionalStudent && education.professionalSchool
                        ? `Year ${education.professionalSchool.year} of ${education.professionalSchool.totalYears}`
                        : isUniversityStudent && education.university
                        ? UNIVERSITY_YEAR_LABELS[education.university.year]
                        : education.gradeLevelLabel}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-950 text-sm leading-tight truncate mt-1">
                    {education.schoolName}
                  </h3>
                  {isProfessionalStudent && education.professionalSchool && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="purple" size="xs">
                        {education.professionalSchool.degreeAwarded}
                      </Badge>
                      {profFundingMeta && (
                        <Badge variant={profFundingMeta.badgeVariant} size="xs">
                          {profFundingMeta.label}
                        </Badge>
                      )}
                    </div>
                  )}
                  {isUniversityStudent && education.university && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="amber" size="xs">
                        {education.university.degreeTitle}
                      </Badge>
                      {uniFundingMeta && (
                        <Badge variant={uniFundingMeta.badgeVariant} size="xs">
                          {uniFundingMeta.label}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stage Year Progress */}
            <div className="bg-white/80 rounded-xl border-2 border-slate-900 px-3 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                <span>
                  {isProfessionalStudent
                    ? 'Program Progress'
                    : isUniversityStudent
                    ? 'Degree Progress'
                    : 'Stage Progress'}
                </span>
                <span className="font-mono text-slate-900">
                  Year {education.yearInStage} of {education.totalYearsInStage}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-300"
                  style={{ width: `${stageProgressPercent}%` }}
                />
              </div>
            </div>
          </CartoonCard>

          {/* Failing Grades Alert Banner (< 50%) */}
          {education.grades < 50 && (
            <div className="rounded-2xl border-2 border-rose-800 bg-rose-50 px-3.5 py-2.5 flex items-center gap-2.5 shadow-[2px_2px_0_#881337]">
              <AlertTriangle className="w-5 h-5 text-rose-600 stroke-[2.5] flex-shrink-0" />
              <p className="text-[11px] font-bold text-rose-950 leading-snug">
                <span className="font-black">Academic Warning:</span> You are failing your classes! Open School Activities to study or request a tutor before the year ends.
              </p>
            </div>
          )}

          {/* Academic Standing & Social Popularity */}
          <CartoonCard variant="slate" borderSize="sm" className="p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-600 stroke-[2.5]" />
                <span>Academic Standing</span>
              </span>
              <Badge variant={gradeMeta.badgeVariant} size="xs">
                Grade: {gradeMeta.letter} • {gradeMeta.standing}
              </Badge>
            </div>

            <div className="space-y-2.5">
              <StatBar
                label="Grades"
                value={education.grades}
                icon="📚"
                colorClass="bg-gradient-to-r from-emerald-500 to-teal-400"
              />
              <StatBar
                label="Popularity"
                value={education.popularity}
                icon="⭐"
                colorClass="bg-gradient-to-r from-amber-400 to-orange-400"
              />
            </div>
          </CartoonCard>

          {/* Active Extracurriculars Summary (if any) */}
          {education.activities.length > 0 && (
            <div className="rounded-2xl border-2 border-slate-900 bg-sky-50/70 p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                  <span>Enrolled Activities</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {education.activities.length} / 2 Active
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {education.activities.map((act) => (
                  <span
                    key={act.activityId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 border-slate-900 bg-white text-xs font-black text-slate-900 shadow-[1px_1px_0_#0f172a]"
                  >
                    <span>{act.icon}</span>
                    <span>{act.name}</span>
                    {act.role !== 'member' && (
                      <span className="text-amber-600">({act.leaderTitle})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CLEAN SINGLE OPTION BUTTON: Opens all school activities & options */}
          <div className="pt-0.5">
            <CartoonButton
              variant="amber"
              size="lg"
              fullWidth
              onClick={() => setIsActivitiesModalOpen(true)}
              icon={<span className="text-xl">🎒</span>}
            >
              School Activities & Options
            </CartoonButton>
          </div>
        </>
      )}

      {/* STATE 3: High School, University, or Professional Graduate */}
      {education.currentStage === 'graduated' && (
        <CartoonCard variant="emerald" borderSize="sm" className="p-4 flex flex-col items-center text-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-white border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_2.5px_0_#0f172a]">
            🎓
          </div>
          <h3 className="font-black text-slate-950 text-base">
            {hasProfessionalDegree
              ? 'Professional Degree Holder'
              : hasUniversityDegree
              ? 'University Graduate'
              : 'High School Graduate'}
          </h3>
          <p className="text-xs font-bold text-slate-600">
            {hasProfessionalDegree
              ? 'You have completed your specialized graduate or professional studies with a final academic average of '
              : hasUniversityDegree
              ? 'You have completed your higher education with a final academic average of '
              : 'You have completed your compulsory K–12 education with a final grade average of '}
            <span className="font-black text-slate-900">
              {gradeMeta.letter} ({education.grades}%)
            </span>
            .
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {education.diplomas.map((diploma) => (
              <Badge key={diploma} variant="emerald" size="xs" icon={<Award className="w-3 h-3" />}>
                {diploma}
              </Badge>
            ))}
            {education.studentDebt > 0 && (
              <Badge variant="amber" size="xs">
                💳 Student Loan: ${education.studentDebt.toLocaleString()}
              </Badge>
            )}
          </div>

          {character.isAlive && (
            <div className="w-full pt-2 flex flex-col gap-2">
              {!hasUniversityDegree && (
                <CartoonButton
                  variant="sky"
                  size="md"
                  fullWidth
                  onClick={() => setUniModalOpen(true)}
                  icon={<GraduationCap className="w-4 h-4 stroke-[2.5]" />}
                >
                  Apply for University
                </CartoonButton>
              )}
              <CartoonButton
                variant={hasUniversityDegree ? 'purple' : 'white'}
                size="md"
                fullWidth
                onClick={() => setProfModalOpen(true)}
                icon={<span>🏛️</span>}
              >
                Professional & Graduate Schools
              </CartoonButton>
            </div>
          )}
        </CartoonCard>
      )}

      {/* STATE 4: High School Dropout */}
      {education.currentStage === 'dropped_out' && (
        <CartoonCard variant="rose" borderSize="sm" className="p-4 flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-white border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_2.5px_0_#0f172a]">
            🚪
          </div>
          <h3 className="font-black text-slate-950 text-base">High School Dropout</h3>
          <p className="text-xs font-bold text-slate-600">
            You left high school early without earning a diploma.
          </p>
          <Badge variant="rose" size="xs" icon={<XCircle className="w-3 h-3" />}>
            No High School Diploma
          </Badge>
        </CartoonCard>
      )}

      {/* School Activities & Options Modal */}
      <SchoolActivitiesModal
        isOpen={isActivitiesModalOpen}
        onClose={() => setIsActivitiesModalOpen(false)}
        character={character}
        onStudyHarder={handleStudyHarder}
        onSlackOff={handleSlackOff}
        onAskForTutor={handleAskForTutor}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        onPracticeActivity={handlePracticeActivity}
        onQuitActivity={handleQuitActivity}
        onOpenDropOut={() => setIsDropOutModalOpen(true)}
      />

      {/* Clubs & Athletics Directory Modal */}
      <ActivityDirectoryModal
        isOpen={isDirectoryOpen}
        character={character}
        onSelectActivity={handleSelectActivityFromDirectory}
        onClose={() => setIsDirectoryOpen(false)}
      />

      {/* University Application Modal */}
      <UniversityApplicationModal
        isOpen={uniModalOpen}
        character={character}
        onEnroll={handleEnrollUniversity}
        onClose={() => setUniModalOpen(false)}
      />

      {/* Professional & Graduate School Modal */}
      <ProfessionalSchoolModal
        isOpen={profModalOpen}
        character={character}
        onEnroll={handleEnrollProfessionalSchool}
        onClose={() => setProfModalOpen(false)}
      />

      {/* Action Outcome Modal */}
      <ActionOutcomeModal
        outcome={outcomeNotice}
        onClose={() => setOutcomeNotice(null)}
      />

      {/* High School / University / Professional Drop Out Confirmation Modal */}
      <DropOutConfirmModal
        isOpen={isDropOutModalOpen}
        schoolName={
          education.schoolName ||
          education.professionalSchool?.schoolName ||
          education.university?.universityName ||
          `${city} School`
        }
        onConfirmDropOut={handleConfirmDropOut}
        onCancel={() => setIsDropOutModalOpen(false)}
      />
    </div>
  );
};
