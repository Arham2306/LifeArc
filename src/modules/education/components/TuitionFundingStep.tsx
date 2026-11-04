import React from 'react';
import { CartoonButton } from '../../../components/ui/CartoonButton';

export type TuitionOptionMethod = 'scholarship' | 'parents' | 'student_loan';

export interface TuitionFundingStepProps {
  programTitle: string;
  degreeTitle?: string;
  icon: string;
  programTypeLabel?: string;
  durationYears: number;
  tuitionPerYear: number;
  totalTuition: number;
  familyWealth: string;
  scholarshipQualified: boolean;
  scholarshipLabel?: string;
  scholarshipNote?: string;
  onSelectFunding: (method: TuitionOptionMethod) => void;
  onBack?: () => void;
}

export const TuitionFundingStep: React.FC<TuitionFundingStepProps> = ({
  programTitle,
  degreeTitle,
  icon,
  programTypeLabel = 'Higher Education Program',
  durationYears,
  tuitionPerYear,
  totalTuition,
  familyWealth,
  scholarshipQualified,
  scholarshipLabel,
  scholarshipNote,
  onSelectFunding,
  onBack,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Program Summary Card */}
      <div className="rounded-2xl border-2 border-slate-900 bg-sky-50 p-3.5 flex items-center justify-between gap-3 shadow-[1.5px_2px_0_#0f172a]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-2xl flex-shrink-0 shadow-[1px_1px_0_#0f172a]">
            {icon}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block truncate">
              {programTypeLabel}
            </span>
            <h4 className="font-black text-slate-950 text-sm leading-tight truncate">
              {degreeTitle || programTitle}
            </h4>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              ${tuitionPerYear.toLocaleString()}/yr • {durationYears} {durationYears === 1 ? 'Year' : 'Years'}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[9px] font-black text-slate-500 uppercase block">Total Tuition</span>
          <span className="font-mono text-sm font-black text-slate-950 block">
            ${totalTuition.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">
          How would you like to finance your tuition?
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] font-black text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            ← Change Program
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* Option 1: Scholarship */}
        <div
          className={`rounded-2xl border-2 p-3 flex items-center justify-between gap-2.5 transition-all shadow-[1.5px_2px_0_#0f172a] ${
            scholarshipQualified
              ? 'border-slate-900 bg-emerald-50/80'
              : 'border-slate-300 bg-slate-100 opacity-70'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🏆</span>
              <p className="text-xs font-black text-slate-950 leading-tight">
                {scholarshipLabel || 'Apply for Full Scholarship'}
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-600 mt-0.5">
              {scholarshipNote ||
                (scholarshipQualified
                  ? '100% Tuition Covered with $0 debt!'
                  : 'Requires exceptional academic standing or athletic captaincy')}
            </p>
          </div>
          <CartoonButton
            variant={scholarshipQualified ? 'emerald' : 'slate'}
            size="sm"
            onClick={() => onSelectFunding('scholarship')}
          >
            {scholarshipQualified ? 'Claim 🏆' : 'Apply'}
          </CartoonButton>
        </div>

        {/* Option 2: Ask Parents */}
        <div className="rounded-2xl border-2 border-slate-900 bg-sky-50/70 p-3 flex items-center justify-between gap-2.5 shadow-[1.5px_2px_0_#0f172a]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">👨‍👩‍👧</span>
              <p className="text-xs font-black text-slate-950 leading-tight">
                Ask Parents to Sponsor
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-600 mt-0.5 capitalize">
              Family Wealth: {familyWealth} • No student debt
            </p>
          </div>
          <CartoonButton
            variant="sky"
            size="sm"
            onClick={() => onSelectFunding('parents')}
          >
            Ask Parents
          </CartoonButton>
        </div>

        {/* Option 3: Student Loan */}
        <div className="rounded-2xl border-2 border-slate-900 bg-amber-50/70 p-3 flex items-center justify-between gap-2.5 shadow-[1.5px_2px_0_#0f172a]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">💳</span>
              <p className="text-xs font-black text-slate-950 leading-tight">
                Student Loan ($0 Upfront)
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-600 mt-0.5">
              Guaranteed approval • Repayment deferred until graduation
            </p>
          </div>
          <CartoonButton
            variant="amber"
            size="sm"
            onClick={() => onSelectFunding('student_loan')}
          >
            Take Loan
          </CartoonButton>
        </div>
      </div>
    </div>
  );
};
