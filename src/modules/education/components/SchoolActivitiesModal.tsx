import React from 'react'
import {
  BookOpen,
  Trophy,
  Plus,
  DoorOpen,
} from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import type { CharacterProfile } from '../../../types/game'
import {
  MAX_CONCURRENT_ACTIVITIES,
  getActivityRoleDisplay,
} from '../data/activities'

interface SchoolActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterProfile;
  onStudyHarder: () => void;
  onSlackOff: () => void;
  onAskForTutor: () => void;
  onOpenDirectory: () => void;
  onPracticeActivity: (activityId: string) => void;
  onQuitActivity: (activityId: string) => void;
  onOpenDropOut: () => void;
}

export const SchoolActivitiesModal: React.FC<SchoolActivitiesModalProps> = ({
  isOpen,
  onClose,
  character,
  onStudyHarder,
  onSlackOff,
  onAskForTutor,
  onOpenDirectory,
  onPracticeActivity,
  onQuitActivity,
  onOpenDropOut,
}) => {
  if (!isOpen) return null;

  const { education, age } = character;
  const { studiedHard, slackedOff, askedForTutor } = education.yearActions;
  const isHighSchool = education.currentStage === 'high_school';
  const isUniversity = education.currentStage === 'university';
  const isProfessional = education.currentStage === 'professional_school';
  const isHigherEd = isUniversity || isProfessional;
  const canDropOut = (isHighSchool && age >= 16) || isHigherEd;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="School Activities & Options"
      icon="🎒"
      actions={
        <CartoonButton variant="white" size="md" fullWidth onClick={onClose}>
          Done / Close Menu
        </CartoonButton>
      }
    >
      {/* Subtitle / School Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-600 truncate">
          {education.schoolName || 'School'} • {education.gradeLevelLabel}
        </span>
        <Badge variant="amber" size="xs">
          Age {age}
        </Badge>
      </div>

      <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-3">
        {/* SECTION 1: Academic Actions */}
        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
              <span>Academic Actions</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              1x per year
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {/* Study Harder */}
            <div className="rounded-xl border-2 border-slate-900 bg-white p-2 flex items-center justify-between gap-2 shadow-[1px_1.5px_0_#0f172a]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📖</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    Study Harder
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">
                    +Grades & Smarts (-Happiness)
                  </p>
                </div>
              </div>
              <CartoonButton
                variant={studiedHard ? 'slate' : 'emerald'}
                size="sm"
                disabled={studiedHard || !character.isAlive}
                onClick={onStudyHarder}
              >
                {studiedHard ? 'Done' : 'Study'}
              </CartoonButton>
            </div>

            {/* Slack Off / Campus Party */}
            <div className="rounded-xl border-2 border-slate-900 bg-white p-2 flex items-center justify-between gap-2 shadow-[1px_1.5px_0_#0f172a]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{isHigherEd ? '🎉' : '😴'}</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    {isHigherEd ? 'Party & Skip Lectures' : 'Slack Off'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">
                    +Happiness & Popularity (-Grades)
                  </p>
                </div>
              </div>
              <CartoonButton
                variant={slackedOff ? 'slate' : 'amber'}
                size="sm"
                disabled={slackedOff || !character.isAlive}
                onClick={onSlackOff}
              >
                {slackedOff ? 'Done' : isHigherEd ? 'Party' : 'Slack'}
              </CartoonButton>
            </div>

            {/* Ask Parents for a Tutor */}
            <div className="rounded-xl border-2 border-slate-900 bg-white p-2 flex items-center justify-between gap-2 shadow-[1px_1.5px_0_#0f172a]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">👨‍🏫</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    Ask for a Tutor
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">
                    Funded by parents • Big grade boost
                  </p>
                </div>
              </div>
              <CartoonButton
                variant={askedForTutor ? 'slate' : 'sky'}
                size="sm"
                disabled={askedForTutor || !character.isAlive}
                onClick={onAskForTutor}
              >
                {askedForTutor ? 'Asked' : 'Ask'}
              </CartoonButton>
            </div>
          </div>
        </div>

        {/* SECTION 2: Clubs & Athletics */}
        <div className="rounded-2xl border-2 border-slate-900 bg-sky-50/70 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
              <span>Clubs & Athletics</span>
            </span>
            <Badge
              variant={
                education.activities.length >= MAX_CONCURRENT_ACTIVITIES
                  ? 'amber'
                  : 'sky'
              }
              size="xs"
            >
              {education.activities.length} / {MAX_CONCURRENT_ACTIVITIES} Active
            </Badge>
          </div>

          {education.activities.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white/90 p-2.5 text-center">
              <p className="text-[11px] font-bold text-slate-500">
                Not enrolled in any clubs or sports teams yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {education.activities.map((act) => {
                const roleDisplay = getActivityRoleDisplay(act);
                const discRecord = education.disciplines[act.disciplineId];
                const cumulativeYears =
                  (discRecord?.totalYears ?? 0) + act.yearsInClub;
                const trophies = discRecord?.trophiesWon ?? 0;

                return (
                  <div
                    key={act.activityId}
                    className="rounded-xl border-2 border-slate-900 bg-white p-2.5 flex flex-col gap-2 shadow-[1px_1.5px_0_#0f172a]"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{act.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-950 truncate leading-tight">
                            {act.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 leading-tight">
                            Track: {cumulativeYears} yr{cumulativeYears === 1 ? '' : 's'}
                            {trophies > 0 ? ` • ${trophies} 🏆` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={roleDisplay.isLeader ? 'amber' : 'slate'}
                        size="xs"
                      >
                        {roleDisplay.label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <CartoonButton
                        variant={act.practicedThisYear ? 'slate' : 'emerald'}
                        size="sm"
                        fullWidth
                        disabled={act.practicedThisYear || !character.isAlive}
                        onClick={() => onPracticeActivity(act.activityId)}
                      >
                        {act.practicedThisYear ? 'Practiced' : 'Practice'}
                      </CartoonButton>
                      <CartoonButton
                        variant="rose"
                        size="sm"
                        disabled={!character.isAlive}
                        onClick={() => onQuitActivity(act.activityId)}
                      >
                        Quit
                      </CartoonButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <CartoonButton
            variant="amber"
            size="sm"
            fullWidth
            disabled={!character.isAlive}
            onClick={onOpenDirectory}
            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            {education.activities.length >= MAX_CONCURRENT_ACTIVITIES
              ? 'Browse Activities Directory'
              : 'Join a Club or Team'}
          </CartoonButton>
        </div>

        {/* SECTION 3: High School / University / Professional School Drop Out Option */}
        {(isHighSchool || isHigherEd) && (
          <div className="rounded-2xl border-2 border-slate-900 bg-rose-50/70 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {isProfessional
                    ? 'Withdraw from Professional School'
                    : isUniversity
                    ? 'Withdraw from University'
                    : 'Drop Out Option'}
                </span>
              </span>
              <Badge variant="rose" size="xs">
                {canDropOut ? 'Available' : 'Age 16+ Only'}
              </Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-600 leading-tight">
              {isProfessional
                ? 'Leave professional school early before completing your degree.'
                : isUniversity
                ? 'Leave university early before completing your degree.'
                : 'Permanently leave high school without a diploma.'}
            </p>
            {canDropOut ? (
              <CartoonButton
                variant="rose"
                size="sm"
                fullWidth
                disabled={!character.isAlive}
                onClick={onOpenDropOut}
              >
                {isProfessional
                  ? 'Withdraw from Program'
                  : isUniversity
                  ? 'Drop Out of University'
                  : 'Drop Out of School'}
              </CartoonButton>
            ) : (
              <p className="text-[10px] font-black text-slate-400 text-center py-1">
                Compulsory schooling until Age 16
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
