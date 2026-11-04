import React, { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import type { CharacterProfile } from '../../../types/game'
import type { ActiveSchoolStage, ActivityCategory } from '../types'
import {
  MAX_CONCURRENT_ACTIVITIES,
  getActivitiesForStage,
} from '../data/activities'

interface ActivityDirectoryModalProps {
  isOpen: boolean;
  character: CharacterProfile;
  onSelectActivity: (templateId: string) => void;
  onClose: () => void;
}

type FilterTab = 'all' | ActivityCategory;

const FILTER_TABS: { id: FilterTab; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'athletics', label: 'Athletics', icon: '🏃' },
  { id: 'academics', label: 'Academics', icon: '📚' },
  { id: 'arts', label: 'Arts', icon: '🎨' },
];

export const ActivityDirectoryModal: React.FC<ActivityDirectoryModalProps> = ({
  isOpen,
  character,
  onSelectActivity,
  onClose,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('all');

  if (!isOpen) return null;

  const { education } = character;
  const stage: ActiveSchoolStage | 'university' =
    education.currentStage === 'elementary' ||
    education.currentStage === 'middle_school' ||
    education.currentStage === 'high_school' ||
    education.currentStage === 'university'
      ? education.currentStage
      : 'elementary';

  const stageActivities = getActivitiesForStage(stage);
  const filteredActivities =
    selectedFilter === 'all'
      ? stageActivities
      : stageActivities.filter((item) => item.category === selectedFilter);

  const isScheduleFull = education.activities.length >= MAX_CONCURRENT_ACTIVITIES;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clubs & Athletics Directory"
      icon="🏆"
      actions={
        <CartoonButton variant="white" size="md" fullWidth onClick={onClose}>
          Close Directory
        </CartoonButton>
      }
    >
      {/* Header Status */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-600">
          {education.schoolName || 'School Extracurriculars'}
        </span>
        <Badge
          variant={isScheduleFull ? 'amber' : 'emerald'}
          size="xs"
        >
          {education.activities.length} / {MAX_CONCURRENT_ACTIVITIES} Active
        </Badge>
      </div>

      {/* Category Filter Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {FILTER_TABS.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`
                py-1.5 px-1.5 rounded-xl border-2 font-black text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer
                ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 border-slate-900 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Activities List */}
      <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5">
        {filteredActivities.map((item) => {
          const isAlreadyJoined = education.activities.some(
            (a) => a.activityId === item.id || a.disciplineId === item.disciplineId
          );
          const disciplineRec = education.disciplines[item.disciplineId];
          const priorYears = disciplineRec?.totalYears ?? 0;

          return (
            <div
              key={item.id}
              className={`
                rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all
                ${
                  isAlreadyJoined
                    ? 'bg-emerald-50/70 border-slate-900'
                    : priorYears > 0
                    ? 'bg-amber-50/70 border-slate-900 shadow-[1.5px_2px_0_#0f172a]'
                    : 'bg-slate-50 border-slate-900'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-xl shadow-[1.5px_1.5px_0_#0f172a] flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-950 text-xs leading-tight truncate">
                      {item.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge
                        variant={item.requiresTryout ? 'sky' : 'emerald'}
                        size="xs"
                      >
                        {item.requiresTryout
                          ? `Tryout (${item.requiredStat?.toUpperCase()} ${item.minStatValue}+)`
                          : 'Open Enrollment'}
                      </Badge>
                      {priorYears > 0 && (
                        <Badge variant="amber" size="xs">
                          ⭐ {priorYears} yr Exp (+Scouting)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <CartoonButton
                  variant={
                    isAlreadyJoined
                      ? 'slate'
                      : item.requiresTryout
                      ? 'sky'
                      : 'emerald'
                  }
                  size="sm"
                  disabled={isAlreadyJoined || isScheduleFull}
                  onClick={() => onSelectActivity(item.id)}
                >
                  {isAlreadyJoined
                    ? 'Joined'
                    : isScheduleFull
                    ? 'Full'
                    : item.requiresTryout
                    ? 'Try Out'
                    : 'Join'}
                </CartoonButton>
              </div>

              <p className="text-[11px] font-bold text-slate-600 leading-snug">
                {item.description}
              </p>

              <div className="rounded-xl bg-white/80 border border-slate-300 px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span className="truncate">
                  🎯 <span className="font-black text-slate-700">Path:</span>{' '}
                  {item.careerPipelineLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

