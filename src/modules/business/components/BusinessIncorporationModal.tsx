import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Sparkles,
  Dices,
  Building2,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import type { CharacterProfile } from '../../../types/game';
import type { BusinessTemplate, FundingMethod } from '../types';
import {
  BUSINESS_SECTOR_META,
  BUSINESS_TEMPLATES,
  generateSuggestedBusinessName,
} from '../data/businessCatalog';
import { evaluateFundingEligibility } from '../services/businessService';

interface BusinessIncorporationModalProps {
  isOpen: boolean;
  character: CharacterProfile;
  initialTemplate?: BusinessTemplate | null;
  onIncorporate: (params: {
    templateId: string;
    customName: string;
    icon: string;
    slogan?: string;
    fundingMethod: FundingMethod;
    customInvestmentAmount?: number;
    angelEquityDilutionPct?: number;
  }) => void;
  onClose: () => void;
}

export const BusinessIncorporationModal: React.FC<
  BusinessIncorporationModalProps
> = ({ isOpen, character, initialTemplate, onIncorporate, onClose }) => {
  const [step, setStep] = useState<'select_template' | 'configure'>(
    initialTemplate ? 'configure' : 'select_template'
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<BusinessTemplate | null>(initialTemplate || null);

  // Configuration Form State
  const [customName, setCustomName] = useState<string>('');
  const [selectedLogo, setSelectedLogo] = useState<string>('🏢');
  const [slogan, setSlogan] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);
  const [selectedFunding, setSelectedFunding] =
    useState<FundingMethod>('bootstrapped');

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTemplate) {
        handleSelectTemplate(initialTemplate);
      } else {
        setStep('select_template');
        setSelectedTemplate(null);
      }
    }
  }, [isOpen, initialTemplate]);

  if (!isOpen) return null;

  const handleSelectTemplate = (tmpl: BusinessTemplate) => {
    setSelectedTemplate(tmpl);
    const suggested = generateSuggestedBusinessName(
      character.city,
      character.lastName,
      tmpl
    );
    setCustomName(suggested);
    setSelectedLogo(tmpl.suggestedLogos[0] || tmpl.icon);
    setSlogan('');
    setInvestmentAmount(tmpl.minSeedCapital);

    const fundingCheck = evaluateFundingEligibility(character, tmpl);
    if (fundingCheck.canBootstrapped) {
      setSelectedFunding('bootstrapped');
    } else if (fundingCheck.canBankLoan) {
      setSelectedFunding('bank_loan');
    } else {
      setSelectedFunding('angel_investors');
    }

    setStep('configure');
  };

  const handleRandomizeName = () => {
    if (!selectedTemplate) return;
    const newName = generateSuggestedBusinessName(
      character.city,
      character.lastName,
      selectedTemplate
    );
    setCustomName(newName);
  };

  // Slider bounds calculation
  const minSlider = selectedTemplate ? selectedTemplate.minSeedCapital : 10000;
  const maxSlider = selectedTemplate ? selectedTemplate.minSeedCapital * 4 : 50000;
  const sliderStep = minSlider >= 100000 ? 10000 : minSlider >= 50000 ? 5000 : 2500;

  const funding = selectedTemplate
    ? evaluateFundingEligibility(character, selectedTemplate)
    : null;

  // Real-time financial calculations based on the interactive investment amount
  const downPayment = Math.round(investmentAmount * 0.25);
  const loanBalance = investmentAmount - downPayment;
  const annualLoanService = Math.round(loanBalance * 0.145);

  const netWorth = character.cash + (character.bankBalance || 0);
  const hasCreditWorthiness =
    character.stats.karma >= 40 && netWorth >= downPayment * 1.5;

  const canAffordBootstrapped = character.cash >= investmentAmount;
  const canAffordBankLoan = character.cash >= downPayment && hasCreditWorthiness;
  const canPitchAngels = funding?.canPitchAngels ?? false;

  const angelEquityPct = funding?.angelOfferedEquityPct || 70;
  const angelDilutionPct = 100 - angelEquityPct;

  // Initial employee headcount scaling with capital investment
  const headcount =
    investmentAmount < 50000
      ? '3 employees'
      : investmentAmount < 100000
      ? '6 employees'
      : investmentAmount < 300000
      ? '12 employees'
      : '24 employees';

  // Capitalize risk rating
  const riskLabel =
    selectedTemplate?.volatility === 'extreme'
      ? 'Extreme Risk'
      : selectedTemplate?.volatility === 'high'
      ? 'High Risk'
      : selectedTemplate?.volatility === 'medium'
      ? 'Medium Risk'
      : 'Low Risk';

  const riskVariant: 'rose' | 'amber' | 'sky' | 'emerald' =
    selectedTemplate?.volatility === 'extreme'
      ? 'rose'
      : selectedTemplate?.volatility === 'high'
      ? 'amber'
      : selectedTemplate?.volatility === 'medium'
      ? 'sky'
      : 'emerald';

  // Cash out-of-pocket required now
  const cashDueNow =
    selectedFunding === 'bootstrapped'
      ? investmentAmount
      : selectedFunding === 'bank_loan'
      ? downPayment
      : 0;

  // Launch validation & button label
  const isLaunchDisabled =
    !customName.trim() ||
    (selectedFunding === 'bootstrapped' && !canAffordBootstrapped) ||
    (selectedFunding === 'bank_loan' && !canAffordBankLoan) ||
    (selectedFunding === 'angel_investors' && !canPitchAngels);

  const launchButtonLabel =
    selectedFunding === 'bootstrapped'
      ? `Launch ($${investmentAmount.toLocaleString()})`
      : selectedFunding === 'bank_loan'
      ? `Launch ($${downPayment.toLocaleString()} Down)`
      : 'Pitch Angels & Launch ($0)';

  const handleLaunch = () => {
    if (!selectedTemplate || !customName.trim() || isLaunchDisabled) return;

    onIncorporate({
      templateId: selectedTemplate.id,
      customName: customName.trim(),
      icon: selectedLogo,
      slogan: slogan.trim() || undefined,
      fundingMethod: selectedFunding,
      customInvestmentAmount: investmentAmount,
      angelEquityDilutionPct: angelEquityPct,
    });
  };

  const diplomas = character.education?.diplomas || [];
  const hasMatchingDegree = selectedTemplate?.recommendedDegrees
    ? selectedTemplate.recommendedDegrees.some((d) => diplomas.includes(d))
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[460px] rounded-[28px] bg-white border-[3px] border-slate-900 shadow-[6px_8px_0_#0f172a] overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================= */}
        {/* MODAL HEADER */}
        {/* ================================================================= */}
        <div className="bg-amber-400 border-b-[3px] border-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {step === 'configure' ? (
              <button
                type="button"
                onClick={() => setStep('select_template')}
                className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1px_1.5px_0_#0f172a] active:translate-y-0.5 cursor-pointer shrink-0 hover:bg-amber-100 transition-all"
                title="Back to Business Types"
              >
                <ArrowLeft className="w-4 h-4 stroke-[3]" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-lg shadow-[1px_1.5px_0_#0f172a] shrink-0">
                🚀
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-black text-slate-950 text-base leading-tight truncate">
                {step === 'select_template'
                  ? 'Start a New Business'
                  : selectedTemplate?.title || 'Configure Business'}
              </h3>
              <p className="text-[11px] font-extrabold text-slate-800">
                {step === 'select_template'
                  ? 'Select an industry venture to open'
                  : selectedTemplate
                  ? BUSINESS_SECTOR_META[selectedTemplate.sector].label
                  : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* STEP 1: SCROLLABLE LIST OF BUSINESS TYPES */}
        {/* ================================================================= */}
        {step === 'select_template' && (
          <div className="p-3.5 overflow-y-auto flex flex-col gap-2.5 max-h-[72vh]">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-700">
                12 Available Ventures:
              </span>
              <span className="text-xs font-black font-mono text-emerald-700">
                Your Wallet: ${character.cash.toLocaleString()}
              </span>
            </div>

            {BUSINESS_TEMPLATES.map((tmpl) => {
              const sectorMeta = BUSINESS_SECTOR_META[tmpl.sector];
              const isAffordable = character.cash >= tmpl.minSeedCapital;
              const matchesDegree = tmpl.recommendedDegrees?.some((d) =>
                diplomas.includes(d)
              );

              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`rounded-2xl border-2 border-slate-900 p-3 flex items-center justify-between gap-3 transition-all cursor-pointer hover:translate-x-0.5 ${
                    matchesDegree
                      ? 'bg-amber-50 hover:bg-amber-100/80 shadow-[2px_2.5px_0_#0f172a]'
                      : 'bg-white hover:bg-slate-50 shadow-[1.5px_2px_0_#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[1.5px_1.5px_0_#0f172a] shrink-0">
                      {tmpl.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={sectorMeta.badgeVariant} size="xs">
                          {sectorMeta.label}
                        </Badge>
                        {matchesDegree && (
                          <Badge variant="amber" size="xs">
                            <Sparkles className="w-3 h-3 stroke-[2.5]" />
                            <span>Degree Advantage</span>
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-black text-slate-950 text-sm mt-0.5 truncate">
                        {tmpl.title}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 line-clamp-1 leading-tight">
                        {tmpl.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-500">
                        Min Capital
                      </div>
                      <div
                        className={`text-xs font-black font-mono ${
                          isAffordable ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        ${tmpl.minSeedCapital.toLocaleString()}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 stroke-[3]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2: IN-PLACE CONFIGURATION, SLIDER & DETAILS TABLE */}
        {/* ================================================================= */}
        {step === 'configure' && selectedTemplate && (
          <div className="p-4 overflow-y-auto flex flex-col gap-3.5 max-h-[72vh]">
            {/* 1. Custom Business Name & Logo Picker */}
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-900 p-3 flex flex-col gap-2.5 shadow-[1.5px_2px_0_#0f172a]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                1. Set Business Name & Branding
              </span>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={34}
                  placeholder="Enter business name..."
                  className="flex-1 bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-sm font-black text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-[1px_1.5px_0_#0f172a]"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  title="Randomize Business Name"
                  className="w-10 h-10 rounded-xl bg-amber-300 hover:bg-amber-400 border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 cursor-pointer shrink-0 transition-all"
                >
                  <Dices className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Logo Palette */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-bold text-slate-500 shrink-0">
                  Logo:
                </span>
                {selectedTemplate.suggestedLogos.map((emoji) => {
                  const isSelected = selectedLogo === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedLogo(emoji)}
                      className={`w-8 h-8 rounded-xl border-2 border-slate-900 flex items-center justify-center text-base transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 scale-105 shadow-[1px_1.5px_0_#0f172a]'
                          : 'bg-white hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>

              {/* Optional Slogan */}
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                maxLength={45}
                placeholder="Optional slogan / tagline..."
                className="bg-white border-2 border-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* 2. Capital Investment Slider */}
            <div className="rounded-2xl bg-emerald-50/70 border-2 border-slate-900 p-3.5 flex flex-col gap-2 shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  <span>Capital Investment</span>
                </span>
                <span className="text-sm font-black font-mono text-emerald-700">
                  ${investmentAmount.toLocaleString()}
                </span>
              </div>

              {/* Interactive Range Slider */}
              <input
                type="range"
                min={minSlider}
                max={maxSlider}
                step={sliderStep}
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                <span>Min: ${minSlider.toLocaleString()}</span>
                <span>Max: ${maxSlider.toLocaleString()}</span>
              </div>

              <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between pt-1 border-t border-emerald-200/70">
                <span>Your Personal Cash:</span>
                <span className="font-mono font-black text-slate-950">
                  ${character.cash.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Funding Method Selector: Uniform 3-Column Grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFunding('bootstrapped')}
                disabled={character.cash < selectedTemplate.minSeedCapital}
                className={`py-2 px-1.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  selectedFunding === 'bootstrapped'
                    ? 'bg-emerald-400 text-slate-950 border-slate-900 shadow-[2px_2px_0_#0f172a]'
                    : character.cash >= selectedTemplate.minSeedCapital
                    ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-900 shadow-[1px_1.5px_0_#0f172a]'
                    : 'bg-slate-100 text-slate-400 border-slate-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-black whitespace-nowrap">💵 Self-Fund</span>
                <span className="text-[10px] font-bold opacity-80 whitespace-nowrap mt-0.5">
                  100% Cash
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFunding('bank_loan')}
                disabled={!funding?.canBankLoan}
                className={`py-2 px-1.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  selectedFunding === 'bank_loan'
                    ? 'bg-sky-400 text-slate-950 border-slate-900 shadow-[2px_2px_0_#0f172a]'
                    : funding?.canBankLoan
                    ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-900 shadow-[1px_1.5px_0_#0f172a]'
                    : 'bg-slate-100 text-slate-400 border-slate-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-black whitespace-nowrap">🏦 Bank Loan</span>
                <span className="text-[10px] font-bold opacity-80 whitespace-nowrap mt-0.5">
                  25% Down
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFunding('angel_investors')}
                disabled={!canPitchAngels}
                className={`py-2 px-1.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  selectedFunding === 'angel_investors'
                    ? 'bg-purple-400 text-slate-950 border-slate-900 shadow-[2px_2px_0_#0f172a]'
                    : canPitchAngels
                    ? 'bg-white text-slate-700 hover:bg-slate-50 border-slate-900 shadow-[1px_1.5px_0_#0f172a]'
                    : 'bg-slate-100 text-slate-400 border-slate-300 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-black whitespace-nowrap">🤝 Angel Pitch</span>
                <span className="text-[10px] font-bold opacity-80 whitespace-nowrap mt-0.5">
                  $0 Down
                </span>
              </button>
            </div>

            {/* Validation / Affordability Alerts */}
            {selectedFunding === 'bootstrapped' && !canAffordBootstrapped && (
              <div className="rounded-xl bg-amber-100 border border-amber-900/30 p-2 text-[11px] font-extrabold text-amber-950 flex items-center justify-between">
                <span>⚠️ Need ${investmentAmount.toLocaleString()} to self-fund</span>
                <span className="font-mono font-black text-rose-700">
                  -${(investmentAmount - character.cash).toLocaleString()}
                </span>
              </div>
            )}

            {selectedFunding === 'bank_loan' && !canAffordBankLoan && (
              <div className="rounded-xl bg-amber-100 border border-amber-900/30 p-2 text-[11px] font-extrabold text-amber-950 flex items-center justify-between">
                {character.cash < downPayment ? (
                  <>
                    <span>⚠️ Need ${downPayment.toLocaleString()} for 25% down payment</span>
                    <span className="font-mono font-black text-rose-700">
                      -${(downPayment - character.cash).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span>⚠️ Bank requires higher Karma (min 40) or greater net worth to issue commercial loan.</span>
                )}
              </div>
            )}

            {selectedFunding === 'angel_investors' && !canPitchAngels && (
              <div className="rounded-xl bg-amber-100 border border-amber-900/30 p-2 text-[11px] font-extrabold text-amber-950">
                ⚠️ Angel investors require at least 55 Smarts or a relevant degree to accept a pitch.
              </div>
            )}

            {/* 3. Small Details Table Below (Dynamically Updates with Funding Selection) */}
            <div className="rounded-2xl border-2 border-slate-900 bg-white overflow-hidden shadow-[1.5px_2px_0_#0f172a]">
              <div className="bg-slate-100 px-3.5 py-2 border-b-2 border-slate-900 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-700">
                  Business Economics & Details
                </span>
                <Badge variant={riskVariant} size="xs">
                  {riskLabel}
                </Badge>
              </div>

              <div className="p-3 flex flex-col divide-y divide-slate-100 text-xs">
                {/* Industry Sector */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Industry Sector</span>
                  <span className="text-slate-950 font-black text-right truncate">
                    {BUSINESS_SECTOR_META[selectedTemplate.sector].label}
                  </span>
                </div>

                {/* Funding Method */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Funding Method</span>
                  <span
                    className={`font-black text-right ${
                      selectedFunding === 'bootstrapped'
                        ? 'text-emerald-700'
                        : selectedFunding === 'bank_loan'
                        ? 'text-sky-700'
                        : 'text-purple-700'
                    }`}
                  >
                    {selectedFunding === 'bootstrapped'
                      ? '100% Self-Funded'
                      : selectedFunding === 'bank_loan'
                      ? 'Bank Loan (25% Down)'
                      : 'Angel Syndicate ($0 Down)'}
                  </span>
                </div>

                {/* Cash Out-of-Pocket / Down Payment */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">
                    {selectedFunding === 'bank_loan'
                      ? 'Cash Down Payment (25%)'
                      : selectedFunding === 'angel_investors'
                      ? 'Cash Out-of-Pocket'
                      : 'Cash Investment'}
                  </span>
                  <span
                    className={`font-mono font-black text-right ${
                      (selectedFunding === 'bootstrapped' && !canAffordBootstrapped) ||
                      (selectedFunding === 'bank_loan' && !canAffordBankLoan)
                        ? 'text-rose-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    ${cashDueNow.toLocaleString()}
                  </span>
                </div>

                {/* Starting Treasury */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Starting Treasury</span>
                  <span className="font-mono text-slate-950 font-black text-right">
                    ${investmentAmount.toLocaleString()}
                  </span>
                </div>

                {/* Loan & Debt Service (if bank loan) */}
                {selectedFunding === 'bank_loan' && (
                  <div className="flex items-center justify-between py-1.5 gap-2">
                    <span className="text-slate-600 font-bold shrink-0">Loan & Debt Service</span>
                    <span className="font-mono text-sky-800 font-black text-right text-[11px]">
                      ${loanBalance.toLocaleString()} (~${annualLoanService.toLocaleString()}/yr)
                    </span>
                  </div>
                )}

                {/* Equity Stake */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Your Equity Ownership</span>
                  <span className="font-mono text-slate-950 font-black text-right">
                    {selectedFunding === 'angel_investors'
                      ? `${angelEquityPct}% (Investors: ${angelDilutionPct}%)`
                      : '100% (Full Ownership)'}
                  </span>
                </div>

                {/* Base Annual Revenue */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Base Annual Revenue</span>
                  <span className="font-mono text-slate-950 font-black text-right">
                    ${selectedTemplate.baseAnnualRevenue.toLocaleString()}/yr
                  </span>
                </div>

                {/* Expected Profit Margin */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Expected Profit Margin</span>
                  <span className="font-mono text-slate-950 font-black text-right">
                    ~{Math.round(selectedTemplate.baseMarginPct * 100)}%
                  </span>
                </div>

                {/* Initial Headcount */}
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-600 font-bold shrink-0">Initial Headcount</span>
                  <span className="text-slate-950 font-black text-right">
                    {headcount}
                  </span>
                </div>

                {/* Degree Advantage */}
                {hasMatchingDegree && (
                  <div className="flex items-center justify-between py-1.5 gap-2 text-amber-900 font-black">
                    <span className="flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Degree Advantage</span>
                    </span>
                    <span className="text-right text-[11px]">+15% Valuation & Lower Risk</span>
                  </div>
                )}
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-1 flex items-center justify-between gap-2">
              <CartoonButton
                variant="white"
                size="sm"
                onClick={() => setStep('select_template')}
              >
                Back to List
              </CartoonButton>

              <CartoonButton
                variant="emerald"
                size="md"
                onClick={handleLaunch}
                disabled={isLaunchDisabled}
                icon={<Building2 className="w-4 h-4 stroke-[2.5]" />}
              >
                {launchButtonLabel}
              </CartoonButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
