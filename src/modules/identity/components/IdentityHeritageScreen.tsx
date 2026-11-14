import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  ChevronRight,
  Coins,
  FileText,
  GitBranch,
  GraduationCap,
  Heart,
  Landmark,
  PawPrint,
  ScrollText,
  Skull,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import type { CharacterProfile } from '../../../types/game';
import {
  selectFamilyGraph,
  selectFamilyMemberDetail,
} from '../services/familyGraphSelectors';
import { buildIdentityReadModel } from '../services/identitySelectors';
import { selectRecordedFamilyEstates } from '../services/recordedEstateSelectors';
import type { IdentityFamilyMember } from '../types';
import { FamilyMemberDetailModal } from './FamilyMemberDetailModal';
import {
  EMPLOYMENT_STATUS_META,
  ESTATE_STATUS_META,
  LIFE_STAGE_META,
  formatFamilySourceLabel,
  formatFamilyWealthLabel,
  formatGenderLabel,
  formatIdentityMoney,
  formatLeavingReason,
  formatPetSpeciesLabel,
  formatSchoolStageLabel,
} from './identityDisplay';

export type IdentityTabId = 'identity' | 'records' | 'family' | 'estates';

export interface IdentityHeritageScreenProps {
  character: CharacterProfile;
  onBackToMenu: () => void;
  backLabel?: string;
  initialTab?: IdentityTabId;
}

const TABS: Array<{ id: IdentityTabId; label: string; icon: React.ReactNode }> = [
  { id: 'identity', label: 'Identity', icon: <User className="w-3.5 h-3.5 stroke-[2.5]" /> },
  { id: 'records', label: 'Records', icon: <FileText className="w-3.5 h-3.5 stroke-[2.5]" /> },
  { id: 'family', label: 'Family', icon: <GitBranch className="w-3.5 h-3.5 stroke-[2.5]" /> },
  { id: 'estates', label: 'Estates', icon: <Landmark className="w-3.5 h-3.5 stroke-[2.5]" /> },
];

export const IdentityHeritageScreen: React.FC<IdentityHeritageScreenProps> = ({
  character,
  onBackToMenu,
  backLabel = 'Menu',
  initialTab = 'identity',
}) => {
  const [activeTab, setActiveTab] = useState<IdentityTabId>(initialTab);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Build read-model snapshots once per character input change rather than per tab switch.
  const snapshot = useMemo(
    () => ({
      heritage: buildIdentityReadModel(character),
      familyGraph: selectFamilyGraph(character),
      estates: selectRecordedFamilyEstates(character),
    }),
    [character]
  );

  const selectedMember = useMemo(
    () => (selectedMemberId ? selectFamilyMemberDetail(character, selectedMemberId) : null),
    [character, selectedMemberId]
  );

  const handleSelectTab = (tab: IdentityTabId) => {
    setActiveTab(tab);
    setSelectedMemberId(null);
  };

  const { heritage, familyGraph, estates } = snapshot;
  const { core, financial, education, career, business, timeline } = heritage;
  const stageMeta = core.lifeStage ? LIFE_STAGE_META[core.lifeStage] : null;
  const employmentMeta = EMPLOYMENT_STATUS_META[career.employmentStatus];

  const birthplaceLabel =
    core.birthplace.city && core.birthplace.country
      ? `${core.birthplace.flag ? `${core.birthplace.flag} ` : ''}${core.birthplace.city}, ${core.birthplace.country}`
      : core.birthplace.country ?? core.birthplace.city ?? 'Unavailable';

  return (
    <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px]">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>{backLabel}</span>
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-black text-slate-900 truncate">Identity & Heritage</span>
          {!core.isAlive ? (
            <Badge variant="slate" size="xs" icon={<Skull className="w-3 h-3" />}>
              Deceased
            </Badge>
          ) : stageMeta ? (
            <Badge variant="amber" size="xs">
              {stageMeta.icon} {stageMeta.label}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* 4-Tab Navigation Strip */}
      <div
        role="tablist"
        aria-label="Identity and Heritage sections"
        className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl border-2 border-slate-900 bg-slate-100 shadow-[2px_2px_0_#0f172a]"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelectTab(tab.id)}
              className={`
                flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl text-[11px] font-black transition-all cursor-pointer min-w-0
                ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a]'
                    : 'bg-transparent text-slate-600 border-2 border-transparent hover:bg-white/70 hover:text-slate-900'
                }
              `}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* TAB 1: IDENTITY                                                  */}
      {/* ================================================================ */}
      {activeTab === 'identity' && (
        <div role="tabpanel" aria-label="Identity overview" className="flex flex-col gap-3">
          {/* Biography Card */}
          <section className="rounded-2xl border-2 border-slate-900 bg-amber-50/70 p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                  Biography
                </div>
                <h2 className="text-base font-black text-slate-950 break-words leading-snug">
                  {core.fullName}
                </h2>
              </div>
              <Badge variant={core.isAlive ? 'emerald' : 'slate'} size="xs">
                {core.isAlive ? 'Living' : 'Deceased'}
              </Badge>
            </div>

            {!core.isAlive && core.causeOfDeath && (
              <div className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 break-words">
                Cause of Death: {core.causeOfDeath}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-500">Age</div>
                <div className="font-black text-slate-900">
                  {core.ageValid ? `Age ${core.age}` : 'Unavailable'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">Life Stage</div>
                <div className="font-black text-slate-900">
                  {stageMeta ? `${stageMeta.icon} ${stageMeta.label}` : 'Unavailable'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">Birth Year</div>
                <div className="font-black font-mono text-slate-900">
                  {core.birthYear !== null ? core.birthYear : 'Unavailable'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">Gender</div>
                <div className="font-black text-slate-900">{formatGenderLabel(core.gender)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] font-bold text-slate-500">Birthplace</div>
                <div className="font-black text-slate-900 break-words">{birthplaceLabel}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">Occupation</div>
                <div className="font-black text-slate-900 break-words">{core.occupation}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">Family Background</div>
                <div className="font-black text-slate-900">
                  {formatFamilyWealthLabel(core.familyWealth)}
                </div>
              </div>
            </div>
          </section>

          {/* Financial Overview Card */}
          <section className="rounded-2xl border-2 border-slate-900 bg-sky-50/70 p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-900">
                <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Personal Financial Overview</span>
              </div>
              <span className="text-sm font-black font-mono text-emerald-800 break-all text-right">
                {formatIdentityMoney(financial.personalNetWorth)}
              </span>
            </div>

            <p className="text-[10px] font-bold text-slate-600">
              Personal net worth includes personal cash, savings, and residential real estate minus
              debts. Business assets are shown separately below.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-300 bg-white p-2">
                <div className="text-[10px] font-bold text-slate-500">Cash</div>
                <div className="font-black font-mono text-slate-950 break-all">
                  {formatIdentityMoney(financial.cash)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-2">
                <div className="text-[10px] font-bold text-slate-500">Bank Balance</div>
                <div className="font-black font-mono text-slate-950 break-all">
                  {formatIdentityMoney(financial.bankBalance)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-2">
                <div className="text-[10px] font-bold text-slate-500">
                  Real Estate ({financial.realEstateCount})
                </div>
                <div className="font-black font-mono text-slate-950 break-all">
                  {formatIdentityMoney(financial.realEstateValue)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-300 bg-white p-2">
                <div className="text-[10px] font-bold text-slate-500">Mortgage Debt</div>
                <div className="font-black font-mono text-slate-950 break-all">
                  {formatIdentityMoney(financial.realEstateMortgageDebt)}
                </div>
              </div>
            </div>

            {/* Separate Business Equity Summary */}
            <div className="rounded-xl border-2 border-purple-900/30 bg-purple-50/80 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-900">
                <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Business Equity (Separate from Personal Net Worth)</span>
              </div>
              {financial.activeBusinessValuation !== null ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">Valuation</div>
                    <div className="font-black font-mono text-purple-950 break-all">
                      {formatIdentityMoney(financial.activeBusinessValuation)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">Stake %</div>
                    <div className="font-black font-mono text-purple-950">
                      {financial.activeBusinessOwnershipPct !== null
                        ? `${Math.round(financial.activeBusinessOwnershipPct)}%`
                        : 'Unavailable'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">Stake Value</div>
                    <div className="font-black font-mono text-purple-950 break-all">
                      {formatIdentityMoney(financial.activeBusinessOwnershipStakeValue)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-600">
                  No active business ownership recorded.
                </div>
              )}
            </div>
          </section>

          {/* Life Highlights Card */}
          <section className="rounded-2xl border-2 border-slate-900 bg-white p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5] text-amber-600" />
                <span>Life Highlights</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {timeline.highlights.length} shown ({timeline.totalEventsScanned} scanned)
              </span>
            </div>

            {timeline.highlights.length > 0 ? (
              <ol className="space-y-2">
                {timeline.highlights.map((evt) => (
                  <li
                    key={evt.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500">
                      <span className="truncate">
                        {evt.icon ? `${evt.icon} ` : ''}
                        {evt.title ?? evt.category}
                      </span>
                      <span className="font-mono shrink-0">
                        Age {evt.age} • {evt.year}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 mt-0.5 break-words">{evt.message}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs font-bold text-slate-500">
                No milestone highlights recorded yet. Age up to build your story.
              </p>
            )}
          </section>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: RECORDS                                                   */}
      {/* ================================================================ */}
      {activeTab === 'records' && (
        <div role="tabpanel" aria-label="Historical records" className="flex flex-col gap-3">
          {/* Education Section */}
          <section className="rounded-2xl border-2 border-slate-900 bg-sky-50/50 p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-900">
                <GraduationCap className="w-4 h-4 stroke-[2.5]" />
                <span>Education Records</span>
              </div>
              <Badge variant="sky" size="xs" wrap>
                {formatSchoolStageLabel(education.currentStage)}
              </Badge>
            </div>

            {education.hasData ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">Current Institution</div>
                    <div className="font-black text-slate-900 break-words">
                      {education.schoolName ?? 'Not currently enrolled'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500">Academic Standing</div>
                    <div className="font-black text-slate-900">
                      {education.grades !== null ? `${Math.round(education.grades)}% Avg` : 'Unavailable'}
                    </div>
                  </div>
                </div>

                {/* Ongoing Higher Ed (In Progress) */}
                {education.activeUniversity && (
                  <div className="rounded-xl border border-sky-300 bg-white p-2.5 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-950 break-words">
                        {education.activeUniversity.degreeTitle} — {education.activeUniversity.majorName}
                      </span>
                      <Badge variant="amber" size="xs">
                        In Progress
                      </Badge>
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 break-words">
                      {education.activeUniversity.universityName} (Year {education.activeUniversity.year}{' '}
                      of {education.activeUniversity.totalYears})
                    </div>
                  </div>
                )}

                {education.activeProfessionalSchool && (
                  <div className="rounded-xl border border-sky-300 bg-white p-2.5 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-950 break-words">
                        {education.activeProfessionalSchool.degreeAwarded} —{' '}
                        {education.activeProfessionalSchool.programName}
                      </span>
                      <Badge variant="amber" size="xs">
                        In Progress
                      </Badge>
                    </div>
                    <div className="text-[11px] font-bold text-slate-600 break-words">
                      {education.activeProfessionalSchool.schoolName} (Year{' '}
                      {education.activeProfessionalSchool.year} of{' '}
                      {education.activeProfessionalSchool.totalYears})
                    </div>
                  </div>
                )}

                {/* Completed Qualifications */}
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Completed Qualifications ({education.diplomas.length})
                  </div>
                  {education.diplomas.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {education.diplomas.map((diploma, idx) => (
                        <Badge key={`${diploma}-${idx}`} variant="emerald" size="xs" wrap>
                          {diploma}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="font-bold text-slate-500">No completed diplomas or degrees yet.</p>
                  )}
                </div>

                {/* School History */}
                {education.history.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Education History
                    </div>
                    <ul className="space-y-1.5">
                      {education.history.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 break-words">
                              {entry.stageLabel} — {entry.schoolName}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500">
                              Ages {entry.startAge}–{entry.endAge} • Final Grade{' '}
                              {Math.round(entry.finalGrades)}%
                            </div>
                          </div>
                          <Badge
                            variant={entry.status === 'graduated' ? 'emerald' : 'rose'}
                            size="xs"
                          >
                            {entry.status === 'graduated' ? 'Completed' : 'Dropped Out'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extracurricular Disciplines */}
                {education.disciplines.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Activities & Disciplines
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {education.disciplines.map((disc) => (
                        <div
                          key={disc.disciplineId}
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 flex items-center justify-between gap-2"
                        >
                          <span className="font-black text-slate-900 break-words">
                            {disc.icon} {disc.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 shrink-0">
                            {disc.totalYears}y • {disc.highestRole}
                            {disc.trophiesWon > 0 ? ` • 🏆 ${disc.trophiesWon}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {education.studentDebt > 0 && (
                  <div className="text-[11px] font-black text-rose-700">
                    Outstanding Student Debt: {formatIdentityMoney(education.studentDebt)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500">
                No education record available for this character.
              </p>
            )}
          </section>

          {/* Career Section */}
          <section className="rounded-2xl border-2 border-slate-900 bg-emerald-50/50 p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-900">
                <Briefcase className="w-4 h-4 stroke-[2.5]" />
                <span>Career Records</span>
              </div>
              <Badge variant={employmentMeta.variant} size="xs">
                {employmentMeta.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-500">Current Occupation</div>
                <div className="font-black text-slate-900 break-words">{career.occupation}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">Total Career Earnings</div>
                <div className="font-black font-mono text-slate-900 break-all">
                  {career.totalCareerEarnings !== null
                    ? formatIdentityMoney(career.totalCareerEarnings)
                    : 'Unavailable'}
                </div>
              </div>
            </div>

            {career.currentJob && (
              <div className="rounded-xl border border-emerald-300 bg-white p-2.5 text-xs space-y-0.5">
                <div className="font-black text-slate-950 break-words">
                  {career.currentJob.title} at {career.currentJob.companyName}
                </div>
                <div className="text-[11px] font-bold text-slate-600">
                  Salary {formatIdentityMoney(career.currentJob.salary)}/yr • Hired Age{' '}
                  {career.currentJob.hiredAge} ({career.currentJob.yearsInJob}y in role)
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Past Positions ({career.history.length})
              </div>
              {career.history.length > 0 ? (
                <ul className="space-y-1.5">
                  {career.history.map((job) => (
                    <li
                      key={job.id}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 break-words">
                          {job.title} — {job.companyName}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          Ages {job.startAge}–{job.endAge} • Final Salary{' '}
                          {formatIdentityMoney(job.finalSalary)}
                        </div>
                      </div>
                      <Badge variant="slate" size="xs">
                        {formatLeavingReason(job.reasonForLeaving)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-bold text-slate-500">
                  No past career history recorded.
                </p>
              )}
            </div>
          </section>

          {/* Business Section */}
          <section className="rounded-2xl border-2 border-slate-900 bg-purple-50/50 p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-900">
              <Building2 className="w-4 h-4 stroke-[2.5]" />
              <span>Business Records</span>
            </div>

            {business.activeBusiness ? (
              <div className="rounded-xl border border-purple-300 bg-white p-2.5 text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-slate-950 break-words">
                      {business.activeBusiness.name}
                      {business.activeBusiness.tickerSymbol
                        ? ` (${business.activeBusiness.tickerSymbol})`
                        : ''}
                    </div>
                    {business.activeBusiness.slogan && (
                      <div className="text-[10px] font-bold text-slate-500 italic break-words">
                        "{business.activeBusiness.slogan}"
                      </div>
                    )}
                  </div>
                  <Badge variant="purple" size="xs">
                    Active
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-bold">Valuation: </span>
                    <span className="font-black font-mono text-slate-900">
                      {formatIdentityMoney(business.activeBusiness.valuation)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Ownership: </span>
                    <span className="font-black font-mono text-slate-900">
                      {Math.round(business.activeBusiness.equityPct)}% (
                      {formatIdentityMoney(business.activeBusiness.ownershipStakeValue)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Founded: </span>
                    <span className="font-black text-slate-900">
                      Age {business.activeBusiness.foundedAge} ({business.activeBusiness.foundedYear})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Lifetime Profit: </span>
                    <span className="font-black font-mono text-slate-900">
                      {formatIdentityMoney(business.activeBusiness.lifetimeProfit)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500">No active company owned.</p>
            )}

            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Historical Business Exits ({business.timelineDerivedExits.length})
              </div>
              {business.timelineDerivedExits.length > 0 ? (
                <ul className="space-y-1.5">
                  {business.timelineDerivedExits.map((exit) => (
                    <li
                      key={exit.eventId}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-black text-slate-950 break-words">
                          {exit.businessName}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={exit.exitType === 'acquisition' ? 'emerald' : 'amber'}
                            size="xs"
                          >
                            {exit.exitType === 'acquisition' ? 'Acquired' : 'Liquidated'}
                          </Badge>
                          <Badge variant="sky" size="xs">
                            Timeline-Derived
                          </Badge>
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-slate-500 font-mono">
                        Age {exit.age} • {exit.year}
                      </div>
                      <p className="text-[11px] font-bold text-slate-700 break-words">
                        {exit.message}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs font-bold text-slate-500">
                  No historical business exits recorded in timeline events.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: FAMILY TREE                                               */}
      {/* ================================================================ */}
      {activeTab === 'family' && (
        <div role="tabpanel" aria-label="Family tree" className="flex flex-col gap-3">
          {/* Parents (Above Player Anchor) */}
          {familyGraph.parents.length > 0 && (
            <FamilyGroupSection
              title="Parents"
              icon={<Users className="w-3.5 h-3.5 stroke-[2.5]" />}
              members={familyGraph.parents}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {/* Central Player Anchor */}
          <div className="rounded-2xl border-[2.5px] border-slate-900 bg-amber-300/80 p-3 shadow-[2px_3px_0_#0f172a] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4 stroke-[2.5] text-amber-700" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                  Family Tree Anchor (You)
                </div>
                <div className="text-sm font-black text-slate-950 break-words">
                  {core.fullName}
                </div>
              </div>
            </div>
            <Badge variant={core.isAlive ? 'emerald' : 'slate'} size="xs">
              {core.isAlive ? `Age ${core.age}` : `Deceased (${core.age})`}
            </Badge>
          </div>

          {/* Current Partner & Siblings (Player Generation) */}
          {familyGraph.currentPartner && (
            <FamilyGroupSection
              title="Current Partner"
              icon={<Heart className="w-3.5 h-3.5 stroke-[2.5] text-rose-700" />}
              members={[familyGraph.currentPartner]}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {familyGraph.siblings.length > 0 && (
            <FamilyGroupSection
              title="Siblings"
              icon={<Users className="w-3.5 h-3.5 stroke-[2.5]" />}
              members={familyGraph.siblings}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {familyGraph.formerPartners.length > 0 && (
            <FamilyGroupSection
              title="Former Partners & Spouses"
              icon={<Heart className="w-3.5 h-3.5 stroke-[2.5] text-slate-600" />}
              members={familyGraph.formerPartners}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {/* Descendants */}
          {familyGraph.children.length > 0 && (
            <FamilyGroupSection
              title="Children"
              icon={<Users className="w-3.5 h-3.5 stroke-[2.5]" />}
              members={familyGraph.children}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {familyGraph.grandchildren.length > 0 && (
            <FamilyGroupSection
              title="Grandchildren"
              icon={<Users className="w-3.5 h-3.5 stroke-[2.5]" />}
              members={familyGraph.grandchildren}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {/* Extended Relatives */}
          {familyGraph.niecesAndNephews.length > 0 && (
            <FamilyGroupSection
              title="Nieces & Nephews"
              icon={<Users className="w-3.5 h-3.5 stroke-[2.5]" />}
              members={familyGraph.niecesAndNephews}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {familyGraph.extendedFamily.length > 0 && (
            <FamilyGroupSection
              title="Extended Relatives (In-Laws)"
              icon={<Users className="w-3.5 h-3.5 stroke-[2.5]" />}
              members={familyGraph.extendedFamily}
              onSelectMember={setSelectedMemberId}
            />
          )}

          {familyGraph.allMembers.length === 0 && (
            <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-3.5 text-xs font-bold text-slate-600">
              No recorded human family members are present for this character.
            </div>
          )}

          {/* Pet Memorials (Strictly Separate from Human Family) */}
          <section className="rounded-2xl border-2 border-dashed border-slate-500 bg-slate-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                <PawPrint className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Pet Memorials</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">Separate from human tree</span>
            </div>

            {familyGraph.petMemorials.length > 0 ? (
              <ul className="space-y-1.5">
                {familyGraph.petMemorials.map((pet) => (
                  <li
                    key={pet.id}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900 break-words">
                        {pet.name} ({formatPetSpeciesLabel(pet.species)})
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">
                        Lived {pet.petAge}y
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 break-words">
                      {pet.closingLine}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-bold text-slate-500">No pet memorials recorded.</p>
            )}
          </section>

          <FamilyMemberDetailModal
            isOpen={selectedMember !== null}
            member={selectedMember}
            onClose={() => setSelectedMemberId(null)}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 4: ESTATES                                                   */}
      {/* ================================================================ */}
      {activeTab === 'estates' && (
        <div role="tabpanel" aria-label="Recorded family estates" className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3 text-[11px] font-bold text-slate-700 flex items-start gap-2 shadow-[2px_2px_0_#0f172a]">
            <ScrollText className="w-4 h-4 stroke-[2.5] text-indigo-700 shrink-0 mt-0.5" />
            <span>
              Actual historical NPC estate settlements for verified family members only. Player
              distributions shown here reflect recorded estate allocations and do not project
              future inheritances or credit personal cash.
            </span>
          </div>

          {!estates.canonicalStateAvailable ? (
            <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-center text-xs font-bold text-slate-600">
              No recorded family estate settlements are available for this life yet.
            </div>
          ) : estates.records.length === 0 ? (
            <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-center text-xs font-bold text-slate-600">
              No recorded family estate settlements found for verified relatives.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {estates.records.map((record) => {
                const statusMeta = ESTATE_STATUS_META[record.status];
                return (
                  <article
                    key={record.recordId}
                    className="rounded-2xl border-2 border-slate-900 bg-white p-3.5 shadow-[2px_3px_0_#0f172a] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-950 break-words">
                          {record.deceasedOwnerName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="amber" size="xs" wrap>
                            {record.relationshipToPlayerLabel}
                          </Badge>
                          <Badge variant={statusMeta.variant} size="xs">
                            {statusMeta.label}
                          </Badge>
                          {record.hasMalformedFields && (
                            <Badge variant="rose" size="xs">
                              Partial Data
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-black font-mono text-slate-600 shrink-0">
                        {record.settlementYear !== null
                          ? `Year ${record.settlementYear}`
                          : 'Year unavailable'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-bold text-slate-500">Gross Assets</div>
                        <div className="font-black font-mono text-slate-900 break-all">
                          {formatIdentityMoney(record.grossAssets, record.currency)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-bold text-slate-500">Total Liabilities</div>
                        <div className="font-black font-mono text-slate-900 break-all">
                          {formatIdentityMoney(record.totalLiabilities, record.currency)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="text-[10px] font-bold text-slate-500">Liabilities Paid</div>
                        <div className="font-black font-mono text-slate-900 break-all">
                          {formatIdentityMoney(record.liabilitiesPaid, record.currency)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-emerald-50/70 p-2">
                        <div className="text-[10px] font-bold text-emerald-900">
                          Net Distributable
                        </div>
                        <div className="font-black font-mono text-emerald-950 break-all">
                          {formatIdentityMoney(record.netDistributableEstate, record.currency)}
                        </div>
                      </div>
                    </div>

                    {record.unpaidLiabilities !== null && record.unpaidLiabilities > 0 && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-950">
                        Unpaid Liabilities Written Off:{' '}
                        <span className="font-mono">
                          {formatIdentityMoney(record.unpaidLiabilities, record.currency)}
                        </span>
                      </div>
                    )}

                    {record.escheatedToState && (
                      <div className="rounded-xl border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-800">
                        Escheated to State:{' '}
                        <span className="font-mono">
                          {formatIdentityMoney(record.escheatedAmount, record.currency)}
                        </span>
                      </div>
                    )}

                    {/* Beneficiary Distributions */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        Recorded Distributions ({record.distributions.length})
                      </div>
                      {record.distributions.length > 0 ? (
                        <ul className="space-y-1.5">
                          {record.distributions.map((share, idx) => (
                            <li
                              key={`${share.beneficiaryId}-${idx}`}
                              className={`rounded-xl border px-2.5 py-2 text-xs flex items-center justify-between gap-2 ${
                                share.isPlayer
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 break-words">
                                  {share.beneficiaryName ?? share.beneficiaryId}
                                  {share.isPlayer ? ' (Player Allocation)' : ''}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500">
                                  {share.relationshipToDeceased ?? 'Beneficiary'}
                                  {share.isPlayer ? ' • Historical record only' : ''}
                                </div>
                              </div>
                              <div className="text-right font-mono font-black text-slate-950 shrink-0">
                                {formatIdentityMoney(
                                  share.amountAwardedInTargetCurrency ?? share.amountInSourceCurrency,
                                  share.targetCurrency ?? share.sourceCurrency ?? record.currency
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs font-bold text-slate-500">
                          No beneficiary distributions recorded for this estate.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface FamilyGroupSectionProps {
  title: string;
  icon: React.ReactNode;
  members: IdentityFamilyMember[];
  onSelectMember: (memberId: string) => void;
}

const FamilyGroupSection: React.FC<FamilyGroupSectionProps> = ({
  title,
  icon,
  members,
  onSelectMember,
}) => {
  return (
    <section className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[2px_3px_0_#0f172a] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
          {icon}
          <span>{title}</span>
        </div>
        <span className="text-[10px] font-bold text-slate-500">{members.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelectMember(member.id)}
            className="w-full text-left rounded-xl border-2 border-slate-900 bg-slate-50 hover:bg-amber-50/70 px-3 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-950 break-words">
                  {member.fullName}
                </span>
                <Badge variant={member.isAlive ? 'emerald' : 'slate'} size="xs">
                  {member.isAlive ? 'Living' : 'Deceased'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <Badge variant="amber" size="xs" wrap>
                  {member.relationLabel}
                </Badge>
                <span>
                  {member.isAlive
                    ? member.age !== null
                      ? `Age ${member.age}`
                      : 'Age unavailable'
                    : member.deathYear !== null
                      ? `Died ${member.deathYear}`
                      : 'Deceased'}
                </span>
                <span>• {formatFamilySourceLabel(member.source)}</span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 stroke-[3] text-slate-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ))}
      </div>
    </section>
  );
};
