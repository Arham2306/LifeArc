import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Sliders,
  Bell,
  Coins,
  Users,
  Sparkles,
  Zap,
  Store,
  MapPin,
  ShieldCheck,
  Landmark,
} from 'lucide-react';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { CharacterProfile } from '../../../types/game';
import type {
  ActiveBusinessProfile,
  ExecutiveActionType,
  FundingMethod,
  MarketingLevel,
  PayrollTier,
  PricingStrategy,
  RnDInvestment,
} from '../types';
import { BUSINESS_SECTOR_META } from '../data/businessCatalog';
import {
  executeBusinessAction,
  exitBusiness,
  foundBusiness,
  injectCapitalIntoBusiness,
  payOffLoanEarly,
  rebrandBusiness,
  updateBusinessLevers,
} from '../services/businessService';
import { BusinessIncorporationModal } from './BusinessIncorporationModal';

interface BusinessScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
}

type BoardroomTab = 'overview' | 'actions' | 'exit';

export const BusinessScreen: React.FC<BusinessScreenProps> = ({
  character,
  onUpdateCharacter,
}) => {
  const [boardroomTab, setBoardroomTab] = useState<BoardroomTab>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showInjectModal, setShowInjectModal] = useState<boolean>(false);
  const [injectAmount, setInjectAmount] = useState<number>(10000);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Executive Modals State
  const [showHireModal, setShowHireModal] = useState<boolean>(false);
  const [hireCount, setHireCount] = useState<number>(1);
  const [isDownsizing, setIsDownsizing] = useState<boolean>(false);

  const [showPayDebtModal, setShowPayDebtModal] = useState<boolean>(false);
  const [debtPayoffAmount, setDebtPayoffAmount] = useState<number>(10000);
  const [debtPayoffSource, setDebtPayoffSource] = useState<'treasury' | 'personal'>('treasury');

  const [showRebrandModal, setShowRebrandModal] = useState<boolean>(false);
  const [newRebrandName, setNewRebrandName] = useState<string>('');
  const [newRebrandLogo, setNewRebrandLogo] = useState<string>('🏢');
  const [newRebrandSlogan, setNewRebrandSlogan] = useState<string>('');

  const [showSalaryModal, setShowSalaryModal] = useState<boolean>(false);
  const [targetSalary, setTargetSalary] = useState<number>(0);

  const business = character.business ?? null;
  const currentYear = character.birthYear + character.age;
  const cooldowns = business?.actionCooldowns || {};

  const handleIncorporate = (params: {
    templateId: string;
    customName: string;
    icon: string;
    slogan?: string;
    fundingMethod: FundingMethod;
    customInvestmentAmount?: number;
    angelEquityDilutionPct?: number;
  }) => {
    const result = foundBusiness(character, params);
    onUpdateCharacter(result.character);
    setIsModalOpen(false);
    setStatusMessage(`Successfully founded ${result.business.name}!`);
  };

  const handleUpdateLevers = (
    updates: Partial<
      Pick<
        ActiveBusinessProfile,
        | 'pricing'
        | 'marketing'
        | 'payroll'
        | 'rnd'
        | 'ownerSalary'
        | 'dividendRatePct'
      >
    >
  ) => {
    if (!business) return;
    const updatedBiz = updateBusinessLevers(business, updates);
    onUpdateCharacter({
      ...character,
      business: updatedBiz,
    });
  };

  const handleRunAction = (actionType: ExecutiveActionType, params: Record<string, any> = {}) => {
    if (!business) return;
    const result = executeBusinessAction(business, character, actionType, params);
    if (result.success) {
      onUpdateCharacter(result.character);
    }
    setStatusMessage(result.message);
  };

  const handleExecuteHireOrDownsize = () => {
    if (!business) return;
    const actionType = isDownsizing ? 'downsize_workers' : 'hire_workers';
    handleRunAction(actionType, { count: hireCount });
    setShowHireModal(false);
  };

  const handleExecuteDebtPayoff = () => {
    if (!business) return;
    const result = payOffLoanEarly(business, character, debtPayoffAmount, debtPayoffSource);
    if (result.success) {
      onUpdateCharacter(result.character);
    }
    setStatusMessage(result.message);
    setShowPayDebtModal(false);
  };

  const handleExecuteRebrand = () => {
    if (!business) return;
    const result = rebrandBusiness(
      business,
      character,
      newRebrandName,
      newRebrandLogo,
      newRebrandSlogan
    );
    if (result.success) {
      onUpdateCharacter(result.character);
    }
    setStatusMessage(result.message);
    setShowRebrandModal(false);
  };

  const handleExecuteSalary = () => {
    if (!business) return;
    handleRunAction('set_owner_salary', { newSalary: targetSalary });
    setShowSalaryModal(false);
  };

  const handleInjectCash = () => {
    if (!business) return;
    const result = injectCapitalIntoBusiness(business, character, injectAmount);
    onUpdateCharacter(result.character);
    setShowInjectModal(false);
    setStatusMessage(
      `Injected $${injectAmount.toLocaleString()} into corporate treasury.`
    );
  };

  const handleExit = (type: 'acquisition' | 'ipo' | 'liquidation') => {
    if (!business) return;
    const result = exitBusiness(business, character, type);
    onUpdateCharacter(result.character);
    setStatusMessage(result.message);
  };

  // ==========================================================================
  // VIEW 1: ACTIVE BUSINESS EXECUTIVE BOARDROOM DASHBOARD
  // ==========================================================================
  if (business) {
    const canIPO =
      !business.isPubliclyTraded &&
      business.valuation >= 5000000 &&
      business.yearsInOperation >= 3;

    const locations = business.locationsCount || 1;
    const equipTier = business.equipmentTier || 0;
    const hasAudit = business.hasAuditCompleted || false;

    // Costs for current actions
    const retreatCost = Math.max(3000, 1200 * business.employeeCount);
    const bonusCost = Math.max(4000, 1500 * business.employeeCount);
    const viralCost = Math.max(
      5000,
      Math.round((business.lastFiscalReport?.grossRevenue || 100000) * 0.05)
    );
    const sponsorCost = Math.max(
      4000,
      Math.round((business.lastFiscalReport?.grossRevenue || 100000) * 0.03)
    );
    const upgradeCost = Math.max(
      10000,
      Math.round((business.lastFiscalReport?.grossRevenue || 120000) * 0.12)
    );

    return (
      <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px] max-h-[640px] overflow-y-auto">
        {/* Status Toast */}
        {statusMessage && (
          <div className="rounded-2xl bg-emerald-100 border-2 border-slate-900 px-3.5 py-2 text-xs font-black text-slate-900 flex items-center justify-between shadow-[2px_2px_0_#0f172a] animate-in fade-in">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-600 hover:text-slate-950 font-black cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Corporate Header Card */}
        <div className="rounded-3xl bg-amber-50 border-[2.5px] border-slate-900 p-4 flex flex-col gap-3 shadow-[3px_4px_0_#0f172a]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-300 border-[2.5px] border-slate-900 flex items-center justify-center text-2xl shadow-[2px_2.5px_0_#0f172a] shrink-0">
                {business.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="amber" size="xs">
                    {BUSINESS_SECTOR_META[business.sector].label}
                  </Badge>
                  {business.isPubliclyTraded && (
                    <Badge variant="sky" size="xs">
                      NYSE: ${business.tickerSymbol}
                    </Badge>
                  )}
                  <span className="text-[11px] font-black text-slate-500">
                    Yr {business.yearsInOperation + 1}
                  </span>
                </div>
                <h3 className="font-black text-slate-950 text-base leading-tight truncate mt-0.5">
                  {business.name}
                </h3>
                {business.slogan && (
                  <p className="text-[11px] font-bold text-slate-600 truncate italic">
                    "{business.slogan}"
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] font-black uppercase text-amber-900">
                Enterprise Value
              </div>
              <div className="text-sm font-black font-mono text-emerald-700">
                ${business.valuation.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold text-slate-600">
                Your Stake: {business.equityPct}%
              </div>
            </div>
          </div>

          {/* Operational Footprint Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5 border-t border-amber-200/60 text-[10px] font-extrabold text-slate-700">
            <span className="flex items-center gap-1 bg-white border border-slate-900 px-2 py-0.5 rounded-lg shadow-[1px_1px_0_#0f172a]">
              <MapPin className="w-3 h-3 text-rose-500 stroke-[2.5]" />
              <span>{locations} {locations === 1 ? 'Location' : 'Locations'}</span>
            </span>
            <span className="flex items-center gap-1 bg-white border border-slate-900 px-2 py-0.5 rounded-lg shadow-[1px_1px_0_#0f172a]">
              <Zap className="w-3 h-3 text-amber-500 stroke-[2.5]" />
              <span>Tier {equipTier} Tech & Equipment</span>
            </span>
            {hasAudit && (
              <span className="flex items-center gap-1 bg-emerald-100 border border-slate-900 px-2 py-0.5 rounded-lg text-emerald-900 shadow-[1px_1px_0_#0f172a]">
                <ShieldCheck className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                <span>Audit Certified (+3% Margin)</span>
              </span>
            )}
          </div>

          {/* Financial Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-2xl bg-white border-2 border-slate-900 p-2.5 flex flex-col gap-1 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-600">
                <span>Corporate Treasury</span>
                <Coins className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />
              </div>
              <div
                className={`text-base font-black font-mono ${
                  business.treasury < 0 ? 'text-rose-600' : 'text-slate-950'
                }`}
              >
                ${business.treasury.toLocaleString()}
              </div>
              <button
                type="button"
                onClick={() => setShowInjectModal(true)}
                className="text-[10px] font-black text-sky-700 hover:text-sky-900 underline text-left cursor-pointer"
              >
                + Inject Personal Cash
              </button>
            </div>

            <div className="rounded-2xl bg-white border-2 border-slate-900 p-2.5 flex flex-col gap-1 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-600">
                <span>Commercial Debt</span>
                <DollarSign className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
              </div>
              <div className="text-base font-black font-mono text-slate-950">
                ${business.outstandingLoan.toLocaleString()}
              </div>
              {business.outstandingLoan > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowPayDebtModal(true)}
                  className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 underline text-left cursor-pointer"
                >
                  Pay Down Early (${business.annualLoanPayment.toLocaleString()}/yr)
                </button>
              ) : (
                <span className="text-[10px] font-bold text-slate-500">
                  Debt-Free Company
                </span>
              )}
            </div>
          </div>

          {/* Vitality Gauges */}
          <div className="rounded-2xl bg-white border-2 border-slate-900 p-3 flex flex-col gap-2 shadow-[1.5px_2px_0_#0f172a]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-500">
                Corporate Vitality & Headcount ({business.employeeCount} Employees):
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsDownsizing(false);
                  setShowHireModal(true);
                }}
                className="text-[10px] font-black text-sky-700 hover:text-sky-900 underline cursor-pointer"
              >
                Manage Staff
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-700">👥 Team Morale</span>
                <span className="font-mono text-slate-900">{business.morale}%</span>
              </div>
              <ProgressBar value={business.morale} color="emerald" size="xs" />

              <div className="flex items-center justify-between text-xs font-black mt-0.5">
                <span className="text-slate-700">⭐ Brand Reputation</span>
                <span className="font-mono text-slate-900">
                  {business.brandReputation}%
                </span>
              </div>
              <ProgressBar
                value={business.brandReputation}
                color="amber"
                size="xs"
              />

              <div className="flex items-center justify-between text-xs font-black mt-0.5">
                <span className="text-slate-700">⚙️ Product Quality</span>
                <span className="font-mono text-slate-900">
                  {business.qualityScore}%
                </span>
              </div>
              <ProgressBar value={business.qualityScore} color="sky" size="xs" />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEGMENTED BOARDROOM TAB SWITCHER */}
        {/* ================================================================= */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border-2 border-slate-900">
          <button
            type="button"
            onClick={() => setBoardroomTab('overview')}
            className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              boardroomTab === 'overview'
                ? 'bg-amber-400 text-slate-950 border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a]'
                : 'text-slate-600 hover:text-slate-950 border-2 border-transparent'
            }`}
          >
            📊 Levers
          </button>
          <button
            type="button"
            onClick={() => setBoardroomTab('actions')}
            className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
              boardroomTab === 'actions'
                ? 'bg-amber-400 text-slate-950 border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a]'
                : 'text-slate-600 hover:text-slate-950 border-2 border-transparent'
            }`}
          >
            <span>⚡ Actions</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setBoardroomTab('exit')}
            className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              boardroomTab === 'exit'
                ? 'bg-amber-400 text-slate-950 border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a]'
                : 'text-slate-600 hover:text-slate-950 border-2 border-transparent'
            }`}
          >
            🏛️ Exits
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: OPERATIONAL STRATEGY LEVERS */}
        {/* ================================================================= */}
        {boardroomTab === 'overview' && (
          <div className="rounded-3xl bg-slate-50 border-[2.5px] border-slate-900 p-3.5 flex flex-col gap-3 shadow-[2.5px_3.5px_0_#0f172a]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
                <span>Operational Levers (Applies on Age Up)</span>
              </span>
            </div>

            {/* Lever 1: Pricing */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">Pricing Strategy</div>
                <div className="text-[10px] font-bold text-slate-500">
                  {business.pricing === 'budget'
                    ? 'High volume (+25% sales)'
                    : business.pricing === 'premium'
                    ? 'Luxury high margin markup'
                    : 'Competitive standard'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(['budget', 'standard', 'premium'] as PricingStrategy[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleUpdateLevers({ pricing: p })}
                    className={`px-2 py-1 rounded-lg border-2 border-slate-900 text-[10px] font-black capitalize transition-all cursor-pointer ${
                      business.pricing === p
                        ? 'bg-amber-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Lever 2: Marketing */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">Marketing Spend</div>
                <div className="text-[10px] font-bold text-slate-500">
                  {business.marketing === 'organic'
                    ? 'Word-of-mouth ($0)'
                    : business.marketing === 'aggressive'
                    ? 'Growth blitz (8% rev)'
                    : 'Balanced ads (4% rev)'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(['organic', 'moderate', 'aggressive'] as MarketingLevel[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleUpdateLevers({ marketing: m })}
                    className={`px-2 py-1 rounded-lg border-2 border-slate-900 text-[10px] font-black capitalize transition-all cursor-pointer ${
                      business.marketing === m
                        ? 'bg-sky-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Lever 3: Payroll */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">Workforce & Pay</div>
                <div className="text-[10px] font-bold text-slate-500">
                  {business.payroll === 'frugal'
                    ? '22% payroll savings (-Morale)'
                    : business.payroll === 'generous'
                    ? 'Above-market pay (+Morale)'
                    : 'Standard market rate'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(['frugal', 'standard', 'generous'] as PayrollTier[]).map((pr) => (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => handleUpdateLevers({ payroll: pr })}
                    className={`px-2 py-1 rounded-lg border-2 border-slate-900 text-[10px] font-black capitalize transition-all cursor-pointer ${
                      business.payroll === pr
                        ? 'bg-emerald-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>

            {/* Lever 4: R&D */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">R&D / Innovation</div>
                <div className="text-[10px] font-bold text-slate-500">
                  {business.rnd === 'minimal'
                    ? 'Minimal maintenance (1% rev)'
                    : business.rnd === 'breakthrough'
                    ? 'Rapid research (7% rev)'
                    : 'Balanced updates (3% rev)'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(['minimal', 'balanced', 'breakthrough'] as RnDInvestment[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleUpdateLevers({ rnd: r })}
                    className={`px-2 py-1 rounded-lg border-2 border-slate-900 text-[10px] font-black capitalize transition-all cursor-pointer ${
                      business.rnd === r
                        ? 'bg-purple-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Lever 5: Owner Dividend Rate */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">Profit Dividend</div>
                <div className="text-[10px] font-bold text-slate-500">
                  Transfers {business.dividendRatePct}% of profits to wallet
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[0, 15, 30, 50].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleUpdateLevers({ dividendRatePct: rate })}
                    className={`px-2 py-1 rounded-lg border-2 border-slate-900 text-[10px] font-black transition-all cursor-pointer ${
                      business.dividendRatePct === rate
                        ? 'bg-emerald-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: INTERACTIVE EXECUTIVE ACTIONS HUB */}
        {/* ================================================================= */}
        {boardroomTab === 'actions' && (
          <div className="flex flex-col gap-3">
            {/* Category A: Workforce & Talent */}
            <div className="rounded-3xl bg-slate-50 border-[2.5px] border-slate-900 p-3.5 flex flex-col gap-2.5 shadow-[2px_3px_0_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>Workforce & Culture</span>
                </span>
                <span className="text-[10px] font-mono font-black text-slate-600">
                  {business.employeeCount} Staff
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDownsizing(false);
                    setShowHireModal(true);
                  }}
                  className="p-2.5 rounded-2xl bg-white border-2 border-slate-900 text-left hover:bg-emerald-50 transition-all cursor-pointer shadow-[1.5px_2px_0_#0f172a]"
                >
                  <div className="text-xs font-black text-slate-950">Hire Workforce</div>
                  <div className="text-[10px] font-bold text-slate-500">$3,500 / worker</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDownsizing(true);
                    setShowHireModal(true);
                  }}
                  className="p-2.5 rounded-2xl bg-white border-2 border-slate-900 text-left hover:bg-rose-50 transition-all cursor-pointer shadow-[1.5px_2px_0_#0f172a]"
                >
                  <div className="text-xs font-black text-slate-950">Downsize Staff</div>
                  <div className="text-[10px] font-bold text-slate-500">$2,000 severance</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAction('company_retreat')}
                  disabled={cooldowns.retreatYear === currentYear || business.treasury < retreatCost}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    cooldowns.retreatYear === currentYear
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">Company Retreat</span>
                    {cooldowns.retreatYear === currentYear && (
                      <span className="text-[9px] font-black text-slate-500">Used</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    ${retreatCost.toLocaleString()} (+18% Morale)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAction('staff_bonus')}
                  disabled={cooldowns.bonusYear === currentYear || business.treasury < bonusCost}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    cooldowns.bonusYear === currentYear
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-amber-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">Spot Bonuses</span>
                    {cooldowns.bonusYear === currentYear && (
                      <span className="text-[9px] font-black text-slate-500">Used</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    ${bonusCost.toLocaleString()} (+22% Morale)
                  </div>
                </button>
              </div>
            </div>

            {/* Category B: Growth & Public Relations */}
            <div className="rounded-3xl bg-slate-50 border-[2.5px] border-slate-900 p-3.5 flex flex-col gap-2.5 shadow-[2px_3px_0_#0f172a]">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
                <span>Growth & Public Relations</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRunAction('viral_blitz')}
                  disabled={cooldowns.viralAdYear === currentYear || business.treasury < viralCost}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    cooldowns.viralAdYear === currentYear
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-sky-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">Viral Ad Blitz</span>
                    {cooldowns.viralAdYear === currentYear && (
                      <span className="text-[9px] font-black text-slate-500">Used</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    ${viralCost.toLocaleString()} (+14% Brand)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAction('community_sponsorship')}
                  disabled={cooldowns.sponsorshipYear === currentYear || business.treasury < sponsorCost}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    cooldowns.sponsorshipYear === currentYear
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-purple-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">Philanthropy</span>
                    {cooldowns.sponsorshipYear === currentYear && (
                      <span className="text-[9px] font-black text-slate-500">Used</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    ${sponsorCost.toLocaleString()} (+8 Karma)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewRebrandName(business.name);
                    setNewRebrandLogo(business.icon);
                    setNewRebrandSlogan(business.slogan || '');
                    setShowRebrandModal(true);
                  }}
                  className="col-span-2 p-2.5 rounded-2xl bg-white border-2 border-slate-900 text-left hover:bg-amber-50 transition-all cursor-pointer shadow-[1.5px_2px_0_#0f172a] flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-black text-slate-950">Rebrand & Rename Company</div>
                    <div className="text-[10px] font-bold text-slate-500">Change name, logo, or slogan ($2,500)</div>
                  </div>
                  <span className="text-base">🎨</span>
                </button>
              </div>
            </div>

            {/* Category C: Operations & Expansion */}
            <div className="rounded-3xl bg-slate-50 border-[2.5px] border-slate-900 p-3.5 flex flex-col gap-2.5 shadow-[2px_3px_0_#0f172a]">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                <span>Operations & Expansion</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRunAction('upgrade_equipment')}
                  disabled={equipTier >= 2 || business.treasury < upgradeCost}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    equipTier >= 2
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-amber-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">Upgrade Tech</span>
                    {equipTier >= 2 && <span className="text-[9px] font-black text-slate-500">Max</span>}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {equipTier >= 2 ? 'Tier 2 Max' : `$${upgradeCost.toLocaleString()} (+12% Qlty)`}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAction('operations_audit')}
                  disabled={hasAudit || business.treasury < 8000}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    hasAudit
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-950">Operations Audit</span>
                    {hasAudit && <span className="text-[9px] font-black text-emerald-700">Done</span>}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {hasAudit ? '+3% Margin Active' : '$8,000 (+3% Margin)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunAction('open_branch')}
                  disabled={locations >= 5 || business.yearsInOperation < 1}
                  className={`col-span-2 p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all flex items-center justify-between ${
                    locations >= 5 || business.yearsInOperation < 1
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-slate-950">Open New Branch / Location</div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {locations >= 5
                        ? 'Max 5 locations reached'
                        : business.yearsInOperation < 1
                        ? 'Unlocked after 1 year in business'
                        : `Launch Location #${locations + 1} (+40% Revenue)`}
                    </div>
                  </div>
                  <Store className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Category D: Financing & Compensation */}
            <div className="rounded-3xl bg-slate-50 border-[2.5px] border-slate-900 p-3.5 flex flex-col gap-2.5 shadow-[2px_3px_0_#0f172a]">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
                <span>Financing & Compensation</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDebtPayoffAmount(Math.min(business.outstandingLoan, 10000));
                    setShowPayDebtModal(true);
                  }}
                  disabled={business.outstandingLoan <= 0}
                  className={`p-2.5 rounded-2xl border-2 border-slate-900 text-left transition-all ${
                    business.outstandingLoan <= 0
                      ? 'bg-slate-100 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-emerald-50 cursor-pointer shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="text-xs font-black text-slate-950">Pay Debt Early</div>
                  <div className="text-[10px] font-bold text-slate-500">
                    {business.outstandingLoan > 0
                      ? `$${business.outstandingLoan.toLocaleString()} owed`
                      : 'Zero Debt!'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTargetSalary(business.ownerSalary || 0);
                    setShowSalaryModal(true);
                  }}
                  className="p-2.5 rounded-2xl bg-white border-2 border-slate-900 text-left hover:bg-amber-50 transition-all cursor-pointer shadow-[1.5px_2px_0_#0f172a]"
                >
                  <div className="text-xs font-black text-slate-950">Set CEO Salary</div>
                  <div className="text-[10px] font-bold text-slate-500">
                    ${(business.ownerSalary || 0).toLocaleString()}/yr guaranteed
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: EXIT STRATEGY & LIQUIDATION */}
        {/* ================================================================= */}
        {boardroomTab === 'exit' && (
          <div className="rounded-3xl bg-slate-50 border-[2.5px] border-slate-900 p-4 flex flex-col gap-3 shadow-[2.5px_3.5px_0_#0f172a]">
            <span className="text-xs font-black uppercase text-slate-600">
              Exit Strategy & Capital Events
            </span>

            <div className="rounded-2xl bg-white border-2 border-slate-900 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-950">Private Acquisition</div>
                  <div className="text-[11px] font-bold text-slate-500">
                    Cash out your {business.equityPct}% equity stake immediately
                  </div>
                </div>
                <CartoonButton
                  variant="emerald"
                  size="sm"
                  onClick={() => handleExit('acquisition')}
                  icon={<DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />}
                >
                  Sell
                </CartoonButton>
              </div>
            </div>

            <div className="rounded-2xl bg-white border-2 border-slate-900 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-950">Initial Public Offering (IPO)</div>
                  <div className="text-[11px] font-bold text-slate-500">
                    {business.isPubliclyTraded
                      ? 'Already publicly traded on NYSE'
                      : canIPO
                      ? 'Ring NYSE bell & trade publicly!'
                      : 'Requires $5M+ valuation & 3+ years'}
                  </div>
                </div>
                {business.isPubliclyTraded ? (
                  <Badge variant="sky" size="xs">Listed</Badge>
                ) : canIPO ? (
                  <CartoonButton
                    variant="sky"
                    size="sm"
                    onClick={() => handleExit('ipo')}
                    icon={<Bell className="w-3.5 h-3.5 stroke-[2.5]" />}
                  >
                    IPO
                  </CartoonButton>
                ) : (
                  <CartoonButton variant="slate" size="sm" disabled>
                    Locked
                  </CartoonButton>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => handleExit('liquidation')}
                className="text-xs font-black text-rose-600 hover:text-rose-800 underline cursor-pointer"
              >
                Shut Down Company & Liquidate Assets
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL 1: HIRE OR DOWNSIZE STAFF */}
        {/* ================================================================= */}
        {showHireModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[360px] rounded-3xl bg-white border-[3px] border-slate-900 p-4 flex flex-col gap-3 shadow-[6px_8px_0_#0f172a]">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <h4 className="font-black text-slate-950 text-base">
                  {isDownsizing ? 'Downsize Workforce' : 'Hire Employees'}
                </h4>
                <button
                  onClick={() => setShowHireModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-bold text-slate-600">
                {isDownsizing
                  ? 'Lay off workers to cut annual payroll overhead. Costs $2,000 severance per person and temporarily dips morale.'
                  : 'Onboard new staff to expand corporate capacity. Costs $3,500 per worker from corporate treasury.'}
              </p>

              <div className="flex items-center justify-between text-xs font-black text-slate-900 bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5">
                <span>Current Workforce:</span>
                <span className="font-mono text-emerald-700">{business.employeeCount} staff</span>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setHireCount(num)}
                    className={`flex-1 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-black cursor-pointer ${
                      hireCount === num
                        ? 'bg-amber-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    {isDownsizing ? `-${num}` : `+${num}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Total Treasury Cost:</span>
                <span className="font-mono font-black text-slate-950">
                  ${(hireCount * (isDownsizing ? 2000 : 3500)).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <CartoonButton variant="white" size="sm" onClick={() => setShowHireModal(false)}>
                  Cancel
                </CartoonButton>
                <CartoonButton
                  variant={isDownsizing ? 'rose' : 'emerald'}
                  size="sm"
                  onClick={handleExecuteHireOrDownsize}
                  disabled={
                    business.treasury < hireCount * (isDownsizing ? 2000 : 3500) ||
                    (isDownsizing && business.employeeCount <= hireCount)
                  }
                >
                  Confirm {isDownsizing ? 'Downsize' : 'Hire'}
                </CartoonButton>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL 2: PAY OFF LOAN EARLY */}
        {/* ================================================================= */}
        {showPayDebtModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[360px] rounded-3xl bg-white border-[3px] border-slate-900 p-4 flex flex-col gap-3 shadow-[6px_8px_0_#0f172a]">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <h4 className="font-black text-slate-950 text-base">
                  Pay Off Bank Loan Early
                </h4>
                <button
                  onClick={() => setShowPayDebtModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-bold text-slate-600">
                Lump-sum principal payment eliminates annual debt interest payments.
                Outstanding balance: <strong>${business.outstandingLoan.toLocaleString()}</strong>.
              </p>

              {/* Payment Source Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border-2 border-slate-900">
                <button
                  type="button"
                  onClick={() => setDebtPayoffSource('treasury')}
                  className={`py-1 rounded-lg text-xs font-black cursor-pointer ${
                    debtPayoffSource === 'treasury'
                      ? 'bg-amber-400 text-slate-950 border border-slate-900'
                      : 'text-slate-600'
                  }`}
                >
                  Treasury (${business.treasury.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setDebtPayoffSource('personal')}
                  className={`py-1 rounded-lg text-xs font-black cursor-pointer ${
                    debtPayoffSource === 'personal'
                      ? 'bg-amber-400 text-slate-950 border border-slate-900'
                      : 'text-slate-600'
                  }`}
                >
                  Personal (${character.cash.toLocaleString()})
                </button>
              </div>

              {/* Payoff Amount Presets */}
              <div className="flex items-center gap-1.5">
                {[10000, 25000, 50000, business.outstandingLoan].map((amt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDebtPayoffAmount(Math.min(business.outstandingLoan, amt))}
                    className={`flex-1 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-black cursor-pointer ${
                      debtPayoffAmount === Math.min(business.outstandingLoan, amt)
                        ? 'bg-emerald-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    {amt === business.outstandingLoan ? 'Full' : `$${amt / 1000}k`}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <CartoonButton variant="white" size="sm" onClick={() => setShowPayDebtModal(false)}>
                  Cancel
                </CartoonButton>
                <CartoonButton
                  variant="emerald"
                  size="sm"
                  onClick={handleExecuteDebtPayoff}
                  disabled={
                    debtPayoffSource === 'treasury'
                      ? business.treasury < debtPayoffAmount
                      : character.cash < debtPayoffAmount
                  }
                >
                  Pay ${debtPayoffAmount.toLocaleString()}
                </CartoonButton>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL 3: REBRAND & RENAME COMPANY */}
        {/* ================================================================= */}
        {showRebrandModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[360px] rounded-3xl bg-white border-[3px] border-slate-900 p-4 flex flex-col gap-3 shadow-[6px_8px_0_#0f172a]">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <h4 className="font-black text-slate-950 text-base">
                  Rebrand & Rename
                </h4>
                <button
                  onClick={() => setShowRebrandModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-slate-600">Company Name:</span>
                <input
                  type="text"
                  value={newRebrandName}
                  onChange={(e) => setNewRebrandName(e.target.value)}
                  maxLength={34}
                  className="bg-white border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-black text-slate-950"
                />

                <span className="text-[10px] font-black uppercase text-slate-600">Slogan / Tagline:</span>
                <input
                  type="text"
                  value={newRebrandSlogan}
                  onChange={(e) => setNewRebrandSlogan(e.target.value)}
                  maxLength={45}
                  placeholder="Optional brand slogan..."
                  className="bg-white border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                />

                <span className="text-[10px] font-black uppercase text-slate-600">Logo Icon:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {['🏢', '🚀', '⚡', '☕', '💡', '🌟', '💻', '🍔', '📦', '🚚', '🤖', '🧬'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewRebrandLogo(emoji)}
                      className={`w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center text-sm cursor-pointer ${
                        newRebrandLogo === emoji ? 'bg-amber-400 scale-105' : 'bg-white'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200">
                <span>Legal Filing Fee:</span>
                <span className="font-mono font-black text-slate-950">$2,500</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <CartoonButton variant="white" size="sm" onClick={() => setShowRebrandModal(false)}>
                  Cancel
                </CartoonButton>
                <CartoonButton
                  variant="amber"
                  size="sm"
                  onClick={handleExecuteRebrand}
                  disabled={!newRebrandName.trim() || business.treasury < 2500}
                >
                  Save Rebrand
                </CartoonButton>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL 4: SET CEO SALARY */}
        {/* ================================================================= */}
        {showSalaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[360px] rounded-3xl bg-white border-[3px] border-slate-900 p-4 flex flex-col gap-3 shadow-[6px_8px_0_#0f172a]">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <h4 className="font-black text-slate-950 text-base">
                  Set Executive CEO Salary
                </h4>
                <button
                  onClick={() => setShowSalaryModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-bold text-slate-600">
                Your guaranteed executive annual salary paid from corporate earnings directly into your personal wallet upon age-up.
              </p>

              <div className="grid grid-cols-3 gap-1.5">
                {[0, 35000, 75000, 150000, 300000, 500000].map((sal) => (
                  <button
                    key={sal}
                    type="button"
                    onClick={() => setTargetSalary(sal)}
                    className={`py-2 px-1 rounded-xl border-2 border-slate-900 text-xs font-black text-center cursor-pointer ${
                      targetSalary === sal
                        ? 'bg-amber-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    {sal === 0 ? '$0 (Reinvest)' : `$${sal / 1000}k/yr`}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <CartoonButton variant="white" size="sm" onClick={() => setShowSalaryModal(false)}>
                  Cancel
                </CartoonButton>
                <CartoonButton variant="emerald" size="sm" onClick={handleExecuteSalary}>
                  Confirm Salary
                </CartoonButton>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL 5: INJECT CAPITAL */}
        {/* ================================================================= */}
        {showInjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-[360px] rounded-3xl bg-white border-[3px] border-slate-900 p-4 flex flex-col gap-3 shadow-[6px_8px_0_#0f172a]">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <h4 className="font-black text-slate-950 text-base">
                  Inject Personal Capital
                </h4>
                <button
                  onClick={() => setShowInjectModal(false)}
                  className="w-7 h-7 rounded-xl bg-slate-100 border-2 border-slate-900 flex items-center justify-center font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs font-bold text-slate-600">
                Transfer cash from your personal savings into {business.name}'s corporate
                treasury. Available: ${character.cash.toLocaleString()}
              </p>

              <div className="flex items-center gap-1.5">
                {[5000, 15000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInjectAmount(amt)}
                    className={`flex-1 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-black cursor-pointer ${
                      injectAmount === amt
                        ? 'bg-amber-400 text-slate-950 shadow-[1px_1.5px_0_#0f172a]'
                        : 'bg-white text-slate-700'
                    }`}
                  >
                    ${amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <CartoonButton
                  variant="white"
                  size="sm"
                  onClick={() => setShowInjectModal(false)}
                >
                  Cancel
                </CartoonButton>
                <CartoonButton
                  variant="emerald"
                  size="sm"
                  onClick={handleInjectCash}
                  disabled={character.cash < injectAmount}
                >
                  Inject ${injectAmount.toLocaleString()}
                </CartoonButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: UNDER AGE 18 — BUSINESS INCUBATION LOCKED
  // ==========================================================================
  if (character.age < 18) {
    const yearsRemaining = 18 - character.age;
    return (
      <div className="p-4 flex flex-col gap-3.5 bg-white min-h-[480px]">
        <div className="rounded-3xl bg-amber-50 border-[2.5px] border-slate-900 p-5 flex flex-col items-center text-center gap-3 shadow-[3px_4px_0_#0f172a]">
          <div className="w-16 h-16 rounded-3xl bg-amber-300 border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_3px_0_#0f172a]">
            🏪
          </div>
          <div>
            <Badge variant="amber" size="xs">
              Age {character.age} • Unlocks in {yearsRemaining} {yearsRemaining === 1 ? 'yr' : 'yrs'}
            </Badge>
            <h3 className="font-black text-slate-950 text-lg mt-1.5">
              Founding Companies Unlocks at Age 18!
            </h3>
            <p className="text-xs font-bold text-slate-600 mt-1 leading-relaxed max-w-xs">
              You must be a legal adult to sign incorporation paperwork, lease commercial
              real estate, and open corporate bank accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW 3: FOUNDER HUB — LAUNCH A NEW VENTURE
  // ==========================================================================
  return (
    <div className="p-4 flex flex-col items-center justify-center text-center gap-4 bg-white min-h-[480px]">
      <div className="w-20 h-20 rounded-3xl bg-amber-300 border-[3px] border-slate-900 flex items-center justify-center text-4xl shadow-[3px_4px_0_#0f172a]">
        🚀
      </div>

      <div className="max-w-xs">
        <h3 className="font-black text-slate-950 text-xl leading-tight">
          Entrepreneurship & Ventures
        </h3>
        <p className="text-xs font-bold text-slate-600 mt-1.5 leading-relaxed">
          Incorporate an enterprise, scale corporate valuation, manage workforce talent,
          and build generational wealth.
        </p>
      </div>

      <CartoonButton
        variant="emerald"
        size="lg"
        onClick={() => setIsModalOpen(true)}
        icon={<Building2 className="w-5 h-5 stroke-[2.5]" />}
      >
        Start a new Business
      </CartoonButton>

      {/* Interactive Business Incorporation Modal */}
      <BusinessIncorporationModal
        isOpen={isModalOpen}
        character={character}
        onIncorporate={handleIncorporate}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
