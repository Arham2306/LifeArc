import React from 'react';
import { X } from 'lucide-react';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import type { BusinessFiscalReport } from '../types';

interface FiscalYearReportModalProps {
  isOpen: boolean;
  businessName: string;
  report: BusinessFiscalReport | null;
  onClose: () => void;
}

export const FiscalYearReportModal: React.FC<FiscalYearReportModalProps> = ({
  isOpen,
  businessName,
  report,
  onClose,
}) => {
  if (!isOpen || !report) return null;

  const isProfitable = report.netProfit >= 0;
  const climateBadge =
    report.climate === 'boom'
      ? { label: '🚀 Economic Boom (+32% Sales)', variant: 'emerald' as const }
      : report.climate === 'recession'
      ? { label: '📉 Economic Recession (-28% Sales)', variant: 'rose' as const }
      : { label: '⚖️ Stable Market Economy', variant: 'slate' as const };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[400px] rounded-[28px] bg-white border-[3px] border-slate-900 shadow-[6px_8px_0_#0f172a] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`${
            isProfitable ? 'bg-emerald-400' : 'bg-rose-400'
          } border-b-[3px] border-slate-900 px-5 py-3.5 flex items-center justify-between`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-lg shadow-[1.5px_2px_0_#0f172a]">
              📊
            </div>
            <div>
              <h3 className="font-black text-slate-950 text-base leading-tight">
                Fiscal Year Financials
              </h3>
              <p className="text-[11px] font-extrabold text-slate-900/80">
                {businessName}
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

        {/* Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          {/* Market Climate Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700">Market Conditions:</span>
            <Badge variant={climateBadge.variant} size="xs">
              {climateBadge.label}
            </Badge>
          </div>

          {/* Revenue vs Expenses Highlight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-900 p-2.5 flex flex-col gap-0.5 shadow-[1.5px_2px_0_#0f172a]">
              <span className="text-[10px] font-black uppercase text-slate-500">
                Gross Revenue
              </span>
              <span className="text-sm font-black font-mono text-emerald-700">
                ${report.grossRevenue.toLocaleString()}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-50 border-2 border-slate-900 p-2.5 flex flex-col gap-0.5 shadow-[1.5px_2px_0_#0f172a]">
              <span className="text-[10px] font-black uppercase text-slate-500">
                Total Expenses
              </span>
              <span className="text-sm font-black font-mono text-rose-600">
                -${report.operatingExpenses.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Expense Breakdown Line Items */}
          <div className="rounded-2xl border-2 border-slate-900 bg-white p-3 flex flex-col gap-1.5 shadow-[1.5px_2px_0_#0f172a] text-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 mb-0.5">
              Operating Breakdown:
            </span>

            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span>Production / COGS</span>
              <span className="font-mono">-${report.cogs.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span>Workforce Payroll</span>
              <span className="font-mono">-${report.payrollExpense.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span>Marketing Campaigns</span>
              <span className="font-mono">-${report.marketingExpense.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span>Research & Quality</span>
              <span className="font-mono">-${report.rndExpense.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-700 font-bold">
              <span>Facilities & Leases</span>
              <span className="font-mono">-${report.facilityExpense.toLocaleString()}</span>
            </div>

            {report.loanPayment > 0 && (
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>Bank Loan Debt Service</span>
                <span className="font-mono">-${report.loanPayment.toLocaleString()}</span>
              </div>
            )}

            {report.taxesPaid > 0 && (
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>Corporate Tax (21%)</span>
                <span className="font-mono">-${report.taxesPaid.toLocaleString()}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 font-black text-slate-950">
              <span>Net Annual Profit</span>
              <span
                className={`font-mono ${
                  isProfitable ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {isProfitable ? '+' : ''}${report.netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Owner Payout Card */}
          {report.totalPayoutToPlayer > 0 && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-slate-900 p-2.5 flex items-center justify-between shadow-[1.5px_2px_0_#0f172a]">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-900">
                  Transferred to Your Wallet
                </span>
                <p className="text-[11px] font-bold text-emerald-800 leading-tight">
                  Dividend & CEO Salary
                </p>
              </div>
              <span className="text-base font-black font-mono text-emerald-700">
                +${report.totalPayoutToPlayer.toLocaleString()}
              </span>
            </div>
          )}

          {/* Ending Valuation & Treasury */}
          <div className="flex items-center justify-between text-xs font-black text-slate-800 px-1">
            <span>Treasury: ${report.endingTreasury.toLocaleString()}</span>
            <span>Valuation: ${report.endingValuation.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-900 bg-slate-50 p-3 flex justify-end">
          <CartoonButton variant="emerald" size="sm" onClick={onClose} fullWidth>
            Review Complete
          </CartoonButton>
        </div>
      </div>
    </div>
  );
};
