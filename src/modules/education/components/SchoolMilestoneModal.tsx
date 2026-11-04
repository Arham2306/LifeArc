import React from 'react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import { StatBar } from '../../../components/ui/StatBar'
import { getLetterGradeMeta } from '../data/schools'
import type { SchoolMilestoneNotice } from '../types'

interface SchoolMilestoneModalProps {
  notice: SchoolMilestoneNotice | null;
  onClose: () => void;
  onOpenSchoolTab: () => void;
  onApplyUniversity?: () => void;
  onApplyProfessional?: () => void;
  onOpenCareersTab?: () => void;
}

export const SchoolMilestoneModal: React.FC<SchoolMilestoneModalProps> = ({
  notice,
  onClose,
  onOpenSchoolTab,
  onApplyUniversity,
  onApplyProfessional,
  onOpenCareersTab,
}) => {
  if (!notice) return null;

  const gradeMeta = getLetterGradeMeta(notice.grades);
  const isHighSchoolGrad = notice.milestoneType === 'high_school_graduation';
  const isUniversityGrad = notice.milestoneType === 'university_graduation';
  const isProfGrad = notice.milestoneType === 'professional_graduation';

  return (
    <Modal
      isOpen={!!notice}
      onClose={onClose}
      title={notice.title}
      icon={notice.icon}
      actions={
        isHighSchoolGrad ? (
          <>
            <CartoonButton
              variant="sky"
              size="md"
              fullWidth
              onClick={onApplyUniversity || onOpenSchoolTab}
              icon={<span>🎓</span>}
            >
              Apply for University
            </CartoonButton>
            <CartoonButton
              variant="emerald"
              size="md"
              fullWidth
              onClick={onClose}
              icon={<span>🗺️</span>}
            >
              Take Some Time to Explore
            </CartoonButton>
          </>
        ) : isUniversityGrad ? (
          <>
            {onOpenCareersTab && (
              <CartoonButton
                variant="amber"
                size="md"
                fullWidth
                onClick={onOpenCareersTab}
                icon={<span>💼</span>}
              >
                Browse Degree-Matched Careers
              </CartoonButton>
            )}
            <CartoonButton
              variant="purple"
              size="md"
              fullWidth
              onClick={onApplyProfessional || onOpenSchoolTab}
              icon={<span>🏛️</span>}
            >
              Apply for Professional / Grad School
            </CartoonButton>
            <CartoonButton
              variant="emerald"
              size="md"
              fullWidth
              onClick={onClose}
              icon={<span>🗺️</span>}
            >
              Take Some Time to Explore
            </CartoonButton>
          </>
        ) : isProfGrad ? (
          <>
            <CartoonButton
              variant="amber"
              size="md"
              fullWidth
              onClick={onOpenCareersTab || onClose}
              icon={<span>💼</span>}
            >
              Browse Specialized Careers
            </CartoonButton>
            <CartoonButton
              variant="emerald"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Continue Life
            </CartoonButton>
          </>
        ) : (
          <>
            <CartoonButton
              variant="sky"
              size="md"
              fullWidth
              onClick={onOpenSchoolTab}
              icon={<span>🎒</span>}
            >
              Open School Tab
            </CartoonButton>
            <CartoonButton
              variant="emerald"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Continue Life
            </CartoonButton>
          </>
        )
      }
    >
      {/* School Banner Card */}
      <div className="rounded-2xl border-2 border-slate-900 bg-sky-50 p-3.5 flex items-center gap-3 shadow-[2px_2px_0_#0f172a]">
        <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[1.5px_2px_0_#0f172a] flex-shrink-0">
          {notice.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
            {notice.subtitle}
          </p>
          <h4 className="font-black text-slate-900 text-sm leading-tight truncate mt-0.5">
            {notice.schoolName}
          </h4>
          <div className="mt-1">
            <Badge variant={notice.isGraduation ? 'emerald' : 'amber'} size="xs">
              {notice.gradeLevel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Narrative Description */}
      <p className="text-xs font-bold text-slate-700 leading-relaxed">
        {notice.description}
      </p>

      {/* Diploma Callout if Graduation */}
      {notice.isGraduation && notice.diplomaEarned && (
        <div className="rounded-xl border-2 border-emerald-700 bg-emerald-50 px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
            <span>📜</span>
            <span>{notice.diplomaEarned}</span>
          </span>
          <Badge variant={gradeMeta.badgeVariant} size="xs">
            Final Grade: {gradeMeta.letter}
          </Badge>
        </div>
      )}

      {/* Initial / Final School Stats */}
      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {notice.isGraduation ? 'Final Academic Record' : 'Starting School Stats'}
          </span>
          <Badge variant={gradeMeta.badgeVariant} size="xs">
            Grade {gradeMeta.letter} ({gradeMeta.standing})
          </Badge>
        </div>
        <StatBar
          label="Academic Grades"
          value={notice.grades}
          icon="📝"
          colorClass="bg-sky-400"
        />
        <StatBar
          label="Popularity"
          value={notice.popularity}
          icon="⭐"
          colorClass="bg-amber-400"
        />
      </div>
    </Modal>
  );
};
