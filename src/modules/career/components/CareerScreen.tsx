import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Lock,
  Sparkles,
  CheckCircle2,
  Clock,
  LogOut,
  TrendingUp,
  Crown,
  DollarSign,
  Coffee,
  Moon,
  Flame,
  Palmtree,
  GraduationCap,
} from 'lucide-react';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { ActionOutcomeModal } from '../../../components/ui/ActionOutcomeModal';
import type { CharacterProfile } from '../../../types/game';
import type {
  EmploymentType,
  JobTemplate,
  WorkplaceActionOutcome,
} from '../types';
import {
  CAREER_FIELD_LABELS,
  EMPLOYMENT_TYPE_META,
  generateCompanyName,
} from '../data/jobCatalog';
import {
  applyForJob,
  getSortedJobListings,
  resignFromJob,
  performWorkHarder,
  performSlackOff,
  performAskForRaise,
  performAskForPromotion,
  performSocializeWithCoworkers,
  performRetire,
  checkPromotionEligibility,
  type JobApplicationOutcome,
} from '../services/careerService';
import { JobInterviewModal } from './JobInterviewModal';

interface CareerScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onOpenSchoolTab?: () => void;
}

type FilterOption = 'all' | 'recommended' | EmploymentType;

export const CareerScreen: React.FC<CareerScreenProps> = ({
  character,
  onUpdateCharacter,
  onOpenSchoolTab,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [selectedJobForInterview, setSelectedJobForInterview] =
    useState<JobTemplate | null>(null);
  const [interviewOutcome, setInterviewOutcome] =
    useState<JobApplicationOutcome | null>(null);
  const [interviewCompanyName, setInterviewCompanyName] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionOutcome, setActionOutcome] =
    useState<WorkplaceActionOutcome | null>(null);

  const currentJob = character.career?.currentJob ?? null;
  const yearActions = character.career?.yearActions;
  const promoCheck = useMemo(
    () => checkPromotionEligibility(character),
    [character]
  );

  const sortedListings = useMemo(
    () => getSortedJobListings(character, activeFilter),
    [character, activeFilter]
  );

  const degreeMatchedCount = useMemo(
    () =>
      getSortedJobListings(character, 'all').filter(
        (item) => item.eligibility.isDegreeMatch && item.eligibility.isAdmissible
      ).length,
    [character]
  );

  const handleOpenInterview = (job: JobTemplate) => {
    setStatusBanner(null);
    setInterviewOutcome(null);
    setSelectedJobForInterview(job);
    setInterviewCompanyName(generateCompanyName(character.city, job));
  };

  const handleAnswerInterview = (optionIndex: number) => {
    if (!selectedJobForInterview) return;
    const result = applyForJob(
      character,
      selectedJobForInterview.id,
      optionIndex,
      interviewCompanyName
    );
    onUpdateCharacter(result.character);
    setInterviewOutcome(result);
  };

  const handleCloseInterviewModal = () => {
    setSelectedJobForInterview(null);
    setInterviewOutcome(null);
    setInterviewCompanyName('');
  };

  const handleWorkHarder = () => {
    const res = performWorkHarder(character);
    onUpdateCharacter(res.character);
    setActionOutcome(res);
  };

  const handleSlackOff = () => {
    const res = performSlackOff(character);
    onUpdateCharacter(res.character);
    setActionOutcome(res);
  };

  const handleAskForRaise = () => {
    const res = performAskForRaise(character);
    onUpdateCharacter(res.character);
    setActionOutcome(res);
  };

  const handleAskForPromotion = () => {
    const res = performAskForPromotion(character);
    onUpdateCharacter(res.character);
    setActionOutcome(res);
  };

  const handleSocialize = () => {
    const res = performSocializeWithCoworkers(character);
    onUpdateCharacter(res.character);
    setActionOutcome(res);
  };

  const handleRetire = () => {
    const res = performRetire(character);
    onUpdateCharacter(res.character);
    setActionOutcome(res);
  };

  const handleResign = () => {
    const result = resignFromJob(character);
    onUpdateCharacter(result.character);
    setStatusBanner(result.message);
  };

  // ==========================================================================
  // VIEW 1: UNDER AGE 16 — CAREERS LOCKED (YOUTH / EARLY SCHOOLING)
  // ==========================================================================
  if (character.age < 16) {
    const yearsToPartTime = 16 - character.age;
    const yearsToFullTime = 18 - character.age;

    return (
      <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px]">
        <div className="rounded-3xl bg-amber-50 border-[2.5px] border-slate-900 p-5 flex flex-col items-center text-center gap-3 shadow-[3px_4px_0_#0f172a]">
          <div className="w-16 h-16 rounded-3xl bg-amber-300 border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_3px_0_#0f172a]">
            💼
          </div>
          <div>
            <Badge variant="amber" size="xs">
              Age {character.age} • Youth Labor Laws
            </Badge>
            <h3 className="font-black text-slate-950 text-lg mt-1.5">
              Too Young to Work Yet!
            </h3>
            <p className="text-xs font-bold text-slate-600 mt-1 leading-relaxed">
              Focus on your school grades and clubs for now. Your first job
              opportunities unlock as you grow older!
            </p>
          </div>

          {/* Unlock Roadmap */}
          <div className="w-full flex flex-col gap-2 mt-1 text-left">
            <div className="rounded-2xl bg-white border-2 border-slate-900 p-3 flex items-start gap-2.5 shadow-[1.5px_2px_0_#0f172a]">
              <span className="text-2xl shrink-0 mt-0.5">🍔</span>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 truncate">
                    Part-Time Small Gigs
                  </span>
                  <Badge variant="amber" size="xs">
                    Age 16 (in {yearsToPartTime} {yearsToPartTime === 1 ? 'yr' : 'yrs'})
                  </Badge>
                </div>
                <p className="text-[11px] font-bold text-slate-500 leading-snug">
                  Barista, Dog Walker, Grocery Bagger, Tutor
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border-2 border-slate-900 p-3 flex items-start gap-2.5 shadow-[1.5px_2px_0_#0f172a]">
              <span className="text-2xl shrink-0 mt-0.5">🏢</span>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 truncate">
                    Full-Time & Freelance
                  </span>
                  <Badge variant="sky" size="xs">
                    Age 18 (in {yearsToFullTime} {yearsToFullTime === 1 ? 'yr' : 'yrs'})
                  </Badge>
                </div>
                <p className="text-[11px] font-bold text-slate-500 leading-snug">
                  Entry-Level, Degree Careers & Freelancing
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: AGE 16+ ACTIVE JOB MARKET & CAREER DASHBOARD
  // ==========================================================================
  return (
    <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px] max-h-[600px] overflow-y-auto">
      {/* Status Toast if just resigned */}
      {statusBanner && (
        <div className="rounded-2xl bg-amber-100 border-2 border-slate-900 px-3.5 py-2.5 text-xs font-black text-slate-900 flex items-center justify-between shadow-[2px_2px_0_#0f172a]">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-600 hover:text-slate-950 font-black ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. ACTIVE JOB DASHBOARD BANNER (IF EMPLOYED) */}
      {currentJob ? (
        <div className="rounded-3xl bg-emerald-50 border-[2.5px] border-slate-900 p-4 flex flex-col gap-3 shadow-[3px_4px_0_#0f172a]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-300 border-[2.5px] border-slate-900 flex items-center justify-center text-2xl shadow-[2px_2.5px_0_#0f172a] flex-shrink-0">
                {currentJob.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="emerald" size="xs">
                    Employed • {EMPLOYMENT_TYPE_META[currentJob.type].label}
                  </Badge>
                  <span className="text-[11px] font-black text-slate-500">
                    {currentJob.yearsInJob}{' '}
                    {currentJob.yearsInJob === 1 ? 'yr' : 'yrs'} tenure
                  </span>
                </div>
                <h3 className="font-black text-slate-950 text-base leading-tight truncate mt-0.5">
                  {currentJob.title}
                </h3>
                <p className="text-xs font-bold text-slate-600 truncate">
                  {currentJob.companyName}
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-[10px] font-black uppercase text-emerald-900">
                Salary
              </div>
              <div className="text-sm font-black font-mono text-emerald-700">
                ${currentJob.salary.toLocaleString()}/yr
              </div>
            </div>
          </div>

          {/* Job Performance Bar */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-slate-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                Job Performance
              </span>
              <span className="font-mono text-emerald-700">
                {currentJob.performance}%
              </span>
            </div>
            <ProgressBar
              value={currentJob.performance}
              color="emerald"
              size="sm"
            />
          </div>

          {character.education.studentDebt > 0 && (
            <div className="rounded-xl bg-amber-100/80 border border-amber-800/30 px-3 py-1.5 flex items-center justify-between text-[11px] font-extrabold text-amber-950">
              <span>🎓 Student Loan Balance:</span>
              <span className="font-mono">
                ${character.education.studentDebt.toLocaleString()} (Auto-paying
                yearly)
              </span>
            </div>
          )}

          {/* Next Promotion Ladder Status */}
          {promoCheck.nextTier ? (
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
                  <span>Next Promotion: {promoCheck.nextTier.title}</span>
                </span>
                <span className="text-xs font-mono font-black text-emerald-700">
                  ${promoCheck.nextTier.salary.toLocaleString()}/yr
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                {promoCheck.missingDegree ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-800/30 px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3 stroke-[2.5]" />
                    <span>Requires {promoCheck.missingDegreeName}</span>
                  </span>
                ) : promoCheck.isEligible ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-900 bg-emerald-100 border border-emerald-800/30 px-2 py-0.5 rounded-lg">
                    <Sparkles className="w-3 h-3 stroke-[2.5]" />
                    <span>Ready for Promotion Review!</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500">
                    {promoCheck.reason}
                  </span>
                )}
                {promoCheck.missingDegree && onOpenSchoolTab && (
                  <button
                    type="button"
                    onClick={onOpenSchoolTab}
                    className="text-[11px] font-black text-sky-700 hover:text-sky-900 underline cursor-pointer"
                  >
                    View Degree in School ➔
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-300 bg-white/80 px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
              <Crown className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
              <span>You have reached the highest executive rank in this career path!</span>
            </div>
          )}

          {/* Workplace Action Buttons Grid */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-0.5">
              Workplace Actions (1x per year):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <CartoonButton
                variant={yearActions?.workedHarder ? 'slate' : 'sky'}
                size="sm"
                onClick={handleWorkHarder}
                disabled={Boolean(yearActions?.workedHarder)}
                icon={<Flame className="w-3.5 h-3.5 stroke-[2.5]" />}
              >
                {yearActions?.workedHarder ? 'Worked Harder' : 'Work Harder'}
              </CartoonButton>

              <CartoonButton
                variant={yearActions?.slackedOff ? 'slate' : 'amber'}
                size="sm"
                onClick={handleSlackOff}
                disabled={Boolean(yearActions?.slackedOff)}
                icon={<Moon className="w-3.5 h-3.5 stroke-[2.5]" />}
              >
                {yearActions?.slackedOff ? 'Slacked Off' : 'Slack Off'}
              </CartoonButton>

              <CartoonButton
                variant={
                  yearActions?.askedForRaise || currentJob.yearsInJob < 1
                    ? 'slate'
                    : 'emerald'
                }
                size="sm"
                onClick={handleAskForRaise}
                disabled={Boolean(
                  yearActions?.askedForRaise || currentJob.yearsInJob < 1
                )}
                icon={<DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />}
              >
                {yearActions?.askedForRaise
                  ? 'Asked for Raise'
                  : currentJob.yearsInJob < 1
                  ? 'Raise (Need 1 Yr)'
                  : 'Ask for a Raise'}
              </CartoonButton>

              <CartoonButton
                variant={
                  yearActions?.askedForPromotion || !promoCheck.nextTier
                    ? 'slate'
                    : 'purple'
                }
                size="sm"
                onClick={handleAskForPromotion}
                disabled={Boolean(
                  yearActions?.askedForPromotion || !promoCheck.nextTier
                )}
                icon={<Crown className="w-3.5 h-3.5 stroke-[2.5]" />}
              >
                {yearActions?.askedForPromotion
                  ? 'Asked Promotion'
                  : !promoCheck.nextTier
                  ? 'Max Rank Reached'
                  : 'Ask for Promotion'}
              </CartoonButton>

              <CartoonButton
                variant={yearActions?.socializedWithCoworkers ? 'slate' : 'white'}
                size="sm"
                onClick={handleSocialize}
                disabled={Boolean(yearActions?.socializedWithCoworkers)}
                icon={<Coffee className="w-3.5 h-3.5 stroke-[2.5]" />}
              >
                {yearActions?.socializedWithCoworkers
                  ? 'Socialized'
                  : character.age >= 18
                  ? 'Socialize ($35)'
                  : 'Socialize ($15)'}
              </CartoonButton>

              {character.age >= 60 ? (
                <CartoonButton
                  variant="amber"
                  size="sm"
                  onClick={handleRetire}
                  icon={<Palmtree className="w-3.5 h-3.5 stroke-[2.5]" />}
                >
                  Retire from Work
                </CartoonButton>
              ) : (
                <CartoonButton
                  variant="rose"
                  size="sm"
                  onClick={handleResign}
                  icon={<LogOut className="w-3.5 h-3.5 stroke-[2.5]" />}
                >
                  Resign / Quit Job
                </CartoonButton>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-emerald-200">
            <span className="text-[11px] font-bold text-slate-600">
              Paychecks deposit automatically when you Age Up.
            </span>
            {character.age >= 60 && (
              <button
                type="button"
                onClick={handleResign}
                className="text-[11px] font-black text-rose-700 hover:text-rose-900 underline cursor-pointer"
              >
                Resign instead
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Unemployed Header Card */
        <div className="rounded-2xl bg-slate-50 border-[2.5px] border-slate-900 p-3.5 flex items-center justify-between gap-3 shadow-[2px_3px_0_#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-200 border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1.5px_2px_0_#0f172a]">
              🔍
            </div>
            <div>
              <h3 className="font-black text-slate-950 text-sm">
                {character.age < 18
                  ? 'Teen Part-Time Job Board'
                  : 'Career & Job Market'}
              </h3>
              <p className="text-[11px] font-bold text-slate-600">
                {character.age < 18
                  ? 'Work a part-time gig after school! Full-time jobs unlock at Age 18.'
                  : degreeMatchedCount > 0
                  ? `${degreeMatchedCount} high-paying careers match your earned degree(s)!`
                  : 'Apply for open entry-level roles or earn a degree to unlock top careers.'}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* 3. FILTER TABS (AGE 18+ HAS ALL TABS; AGE 16-17 SHOWS PART-TIME NOTICE) */}
      {character.age >= 18 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {(
            [
              { id: 'all', label: 'All Jobs' },
              { id: 'recommended', label: '⭐ Eligible / Match' },
              { id: 'full_time', label: 'Full-Time' },
              { id: 'part_time', label: 'Part-Time' },
              { id: 'freelance', label: 'Freelance' },
            ] as { id: FilterOption; label: string }[]
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-amber-100 border-2 border-slate-900 px-3 py-2 flex items-center justify-between text-xs font-black text-slate-900">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-800 stroke-[2.5]" />
            <span>Part-Time Small Gigs (Age 16+)</span>
          </span>
          <span className="text-[11px] font-bold text-amber-900">
            Full-Time unlocks at 18
          </span>
        </div>
      )}

      {/* 4. SORTED JOB LISTINGS */}
      <div className="flex flex-col gap-2.5">
        {sortedListings.map(({ job, eligibility }) => {
          const typeMeta = EMPLOYMENT_TYPE_META[job.type];
          const companyPreview = (job.companyNameTemplates[0] || `${character.city} Corp`).replace('{city}', character.city || 'Metro');
          const isTopDegreeMatch =
            eligibility.isDegreeMatch && eligibility.isAdmissible;

          return (
            <div
              key={job.id}
              className={`rounded-2xl border-[2.5px] border-slate-900 p-3.5 flex flex-col gap-2.5 transition-all ${
                eligibility.isCurrentJob
                  ? 'bg-emerald-50 shadow-[2px_3px_0_#0f172a]'
                  : isTopDegreeMatch
                  ? 'bg-amber-50/70 shadow-[2.5px_3.5px_0_#0f172a]'
                  : eligibility.isAdmissible
                  ? 'bg-white shadow-[2px_3px_0_#0f172a]'
                  : 'bg-slate-50 opacity-90 shadow-[1.5px_2px_0_#0f172a]'
              }`}
            >
              {/* Degree Match Priority Ribbon */}
              {isTopDegreeMatch && (
                <div className="flex items-center justify-between bg-amber-300/90 border-2 border-slate-900 rounded-xl px-2.5 py-1 text-[11px] font-black text-slate-950 shadow-[1px_1.5px_0_#0f172a]">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Matches Your {eligibility.matchedDegreeTitle}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider bg-white px-1.5 py-0.2 rounded-md border border-slate-900">
                    Top Pick
                  </span>
                </div>
              )}

              {/* Main Row: Icon + Title + Salary */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1.5px_2px_0_#0f172a] flex-shrink-0 mt-0.5">
                    {job.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={typeMeta.badgeVariant} size="xs">
                        {typeMeta.label}
                      </Badge>
                      <span className="text-[10px] font-bold text-slate-500 truncate">
                        {CAREER_FIELD_LABELS[job.field]}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-950 text-sm leading-snug mt-0.5">
                      {job.title}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 truncate">
                      {companyPreview}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black font-mono text-emerald-700">
                    ${job.baseSalary.toLocaleString()}
                    <span className="text-[10px] font-bold text-slate-500">
                      /yr
                    </span>
                  </div>
                  {job.hourlyRateLabel && (
                    <div className="text-[10px] font-bold text-slate-500">
                      {job.hourlyRateLabel}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                {job.description}
              </p>

              {/* Bottom Row: Eligibility Pill & Apply Button */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {eligibility.isCurrentJob ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-200 border border-slate-900 rounded-lg px-2 py-0.5">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      Current Position
                    </span>
                  ) : eligibility.isAdmissible ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-800/40 rounded-lg px-2 py-0.5">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      {job.credentialTier === 'open_entry'
                        ? 'Open to Everyone'
                        : 'Eligible to Apply'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-900 bg-rose-100 border border-rose-800/40 rounded-lg px-2 py-0.5">
                      <Lock className="w-3 h-3 stroke-[2.5] flex-shrink-0" />
                      <span className="truncate">
                        {eligibility.missingRequirementLabel}
                      </span>
                    </span>
                  )}
                </div>

                {eligibility.isCurrentJob ? (
                  <Badge variant="emerald" size="xs">
                    Employed
                  </Badge>
                ) : eligibility.alreadyRejectedThisYear ? (
                  <CartoonButton variant="slate" size="sm" disabled>
                    Try Next Year
                  </CartoonButton>
                ) : eligibility.isAdmissible ? (
                  <CartoonButton
                    variant={isTopDegreeMatch ? 'amber' : 'emerald'}
                    size="sm"
                    onClick={() => handleOpenInterview(job)}
                    icon={<Briefcase className="w-3.5 h-3.5 stroke-[2.5]" />}
                  >
                    Interview
                  </CartoonButton>
                ) : (
                  <CartoonButton
                    variant="slate"
                    size="sm"
                    disabled
                    icon={<Lock className="w-3.5 h-3.5 stroke-[2.5]" />}
                  >
                    Locked
                  </CartoonButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Job Interview Modal */}
      <JobInterviewModal
        isOpen={Boolean(selectedJobForInterview)}
        job={selectedJobForInterview}
        city={character.city}
        companyNameOverride={interviewCompanyName}
        outcome={interviewOutcome}
        onSelectAnswer={handleAnswerInterview}
        onClose={handleCloseInterviewModal}
      />

      {/* Workplace Action Outcome Modal */}
      {actionOutcome && (
        <ActionOutcomeModal
          isOpen={Boolean(actionOutcome)}
          onClose={() => setActionOutcome(null)}
          title={actionOutcome.title}
          icon={actionOutcome.icon}
          subtitle={
            actionOutcome.newSalary
              ? `${actionOutcome.subtitle} • $${actionOutcome.newSalary.toLocaleString()} / year`
              : actionOutcome.subtitle
          }
          message={actionOutcome.message}
          statEffects={actionOutcome.appliedEffects}
          continueVariant={actionOutcome.isSuccess ? 'emerald' : 'slate'}
          continueLabel="Continue"
          alertCallout={
            actionOutcome.missingDegreeRequirement
              ? {
                  title: 'Degree Gate Locked',
                  message: `To unlock this promotion, complete a ${actionOutcome.missingDegreeRequirement} at University or Professional School.`,
                  icon: <GraduationCap className="w-4 h-4 text-amber-800 stroke-[2.5]" />,
                  variant: 'amber',
                }
              : undefined
          }
          secondaryAction={
            actionOutcome.missingDegreeRequirement && onOpenSchoolTab
              ? {
                  label: 'Enroll in Higher Education',
                  icon: <GraduationCap className="w-4 h-4 stroke-[2.5]" />,
                  variant: 'purple',
                  onClick: () => {
                    setActionOutcome(null);
                    onOpenSchoolTab();
                  },
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

