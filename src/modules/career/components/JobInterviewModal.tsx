import React, { useMemo } from 'react';
import { X, CheckCircle2, XCircle, Briefcase } from 'lucide-react';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import type { JobTemplate } from '../types';
import type { JobApplicationOutcome } from '../services/careerService';
import { EMPLOYMENT_TYPE_META, generateCompanyName } from '../data/jobCatalog';

interface JobInterviewModalProps {
  isOpen: boolean;
  job: JobTemplate | null;
  city: string;
  companyNameOverride?: string;
  outcome: JobApplicationOutcome | null;
  onSelectAnswer: (optionIndex: number) => void;
  onClose: () => void;
}

export const JobInterviewModal: React.FC<JobInterviewModalProps> = ({
  isOpen,
  job,
  city,
  companyNameOverride,
  outcome,
  onSelectAnswer,
  onClose,
}) => {
  const companyName = useMemo(() => {
    if (!job) return '';
    return outcome?.companyName || companyNameOverride || generateCompanyName(city, job);
  }, [job, city, outcome, companyNameOverride]);

  if (!isOpen || !job) return null;

  const typeMeta = EMPLOYMENT_TYPE_META[job.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[400px] rounded-[28px] bg-white border-[3px] border-slate-900 shadow-[6px_8px_0_#0f172a] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`${
            outcome
              ? outcome.hired
                ? 'bg-emerald-400'
                : 'bg-rose-400'
              : 'bg-sky-400'
          } border-b-[3px] border-slate-900 px-5 py-3.5 flex items-center justify-between`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-lg shadow-[1.5px_2px_0_#0f172a]">
              {job.icon}
            </div>
            <div>
              <h3 className="font-black text-slate-950 text-base leading-tight">
                {outcome ? outcome.title : 'Job Interview'}
              </h3>
              <p className="text-[11px] font-extrabold text-slate-900/80">
                {companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3.5">
          {/* Job Role Summary Card */}
          <div className="rounded-2xl bg-slate-50 border-[2.5px] border-slate-900 p-3 flex items-center justify-between gap-2 shadow-[2px_2px_0_#0f172a]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant={typeMeta.badgeVariant} size="xs">
                  {typeMeta.label}
                </Badge>
                {job.hourlyRateLabel && (
                  <span className="text-[10px] font-black text-slate-500">
                    {job.hourlyRateLabel}
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-900 text-sm mt-1 truncate">
                {job.title}
              </h4>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] font-black uppercase text-slate-500">
                Annual Pay
              </div>
              <div className="text-sm font-black font-mono text-emerald-700">
                ${job.baseSalary.toLocaleString()}/yr
              </div>
            </div>
          </div>

          {!outcome ? (
            /* STEP 1: INTERVIEW QUESTION & 3 CHOICES */
            <>
              <div className="rounded-2xl bg-amber-50 border-[2.5px] border-slate-900 p-3.5 shadow-[2px_3px_0_#0f172a]">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-900 mb-1">
                  <Briefcase className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{job.interviewQuestion.interviewerRole} asks:</span>
                </div>
                <p className="text-xs font-extrabold text-slate-900 leading-relaxed">
                  “{job.interviewQuestion.question}”
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
                  Choose Your Response:
                </span>
                {job.interviewQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectAnswer(idx)}
                    className="w-full text-left p-3 rounded-2xl bg-white hover:bg-sky-50 border-[2.5px] border-slate-900 shadow-[2px_3px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-sky-200 group-hover:bg-sky-400 border-2 border-slate-900 flex items-center justify-center text-xs font-black text-slate-950 flex-shrink-0 mt-0.5">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800 leading-snug">
                        {opt.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* STEP 2: INTERVIEW OUTCOME */
            <div
              className={`rounded-2xl border-[2.5px] border-slate-900 p-4 flex flex-col items-center text-center gap-2.5 shadow-[2px_3px_0_#0f172a] ${
                outcome.hired ? 'bg-emerald-50' : 'bg-rose-50'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl border-[2.5px] border-slate-900 flex items-center justify-center shadow-[2px_2px_0_#0f172a] ${
                  outcome.hired
                    ? 'bg-emerald-300 text-slate-950'
                    : 'bg-rose-300 text-slate-950'
                }`}
              >
                {outcome.hired ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <XCircle className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>

              <div>
                <h4 className="font-black text-slate-950 text-base">
                  {outcome.hired
                    ? `Welcome to ${outcome.companyName}!`
                    : 'Application Declined'}
                </h4>
                <p className="text-xs font-bold text-slate-700 mt-1 leading-relaxed">
                  {outcome.feedbackMessage}
                </p>
              </div>

              {outcome.hired && (
                <div className="w-full mt-1 pt-2.5 border-t-2 border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-950">
                  <span>Starting Salary:</span>
                  <span className="font-mono text-emerald-700">
                    ${outcome.salary.toLocaleString()} / year
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {outcome && (
          <div className="bg-slate-50 border-t-[2.5px] border-slate-900 p-4">
            <CartoonButton
              variant={outcome.hired ? 'emerald' : 'slate'}
              size="md"
              fullWidth
              onClick={onClose}
            >
              {outcome.hired ? 'Start My New Job! 🎉' : 'Back to Job Market'}
            </CartoonButton>
          </div>
        )}
      </div>
    </div>
  );
};

