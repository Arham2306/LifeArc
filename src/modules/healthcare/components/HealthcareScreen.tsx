import React, { useState } from 'react';
import {
  ArrowLeft,
  Stethoscope,
  Heart,
  AlertCircle,
  History,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { ActionOutcomeModal, type CustomStatDelta } from '../../../components/ui/ActionOutcomeModal';
import type { CharacterProfile, StatEffects } from '../../../types/game';
import type { ConditionRecord } from '../types';
import {
  consultDoctor,
  declineTreatment,
  enrollCare,
  cancelEnrollment,
  isValidCondition,
  startTreatment,
} from '../services/healthcareService';
import { getConditionListing } from '../data/conditionCatalog';
import { ConditionDetailModal } from './ConditionDetailModal';
import { DoctorSelectionModal } from './DoctorSelectionModal';
import { generateDoctorSession, type DoctorOption } from '../services/doctorNameService';
import { isValidVisit } from '../services/healthcareService';
import {
  formatMoney,
  getConditionEmoji,
  getConditionTitle,
  resolveCareStatus,
  resolveTemporaryStatus,
} from './healthcareDisplay';

interface HealthcareScreenProps {
  character: CharacterProfile;
  onUpdateCharacter: (updated: CharacterProfile) => void;
  onBackToMenu: () => void;
}

interface OutcomeState {
  title: string;
  message: string;
  statEffects?: StatEffects;
  customDeltas?: CustomStatDelta[];
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'emerald' | 'amber' | 'rose' | 'slate';
  onConfirm: () => void;
}

export const HealthcareScreen: React.FC<HealthcareScreenProps> = ({
  character,
  onUpdateCharacter,
  onBackToMenu,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<ConditionRecord | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [outcomeModal, setOutcomeModal] = useState<OutcomeState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Doctor selection session state
  const [isDoctorSelectionOpen, setIsDoctorSelectionOpen] = useState(false);
  const [doctorSession, setDoctorSession] = useState<DoctorOption[]>([]);
  const [selectedDoctorCandidate, setSelectedDoctorCandidate] = useState<DoctorOption | null>(null);

  const rawConditions = Array.isArray(character.healthcare?.conditions)
    ? character.healthcare.conditions
    : [];

  const validConditions = rawConditions.filter(isValidCondition);
  const malformedCount = rawConditions.length - validConditions.length;

  const undiagnosedConditions = validConditions.filter((c) => c.status === 'undiagnosed');
  const diagnosedConditions = validConditions.filter((c) => c.status === 'known');
  const closedConditions = validConditions.filter((c) => c.status === 'closed');

  const rawVisits = Array.isArray(character.healthcare?.visits)
    ? character.healthcare.visits
    : [];
  const validVisits = rawVisits.filter(isValidVisit);

  const cash = typeof character.cash === 'number' && Number.isFinite(character.cash)
    ? Math.max(0, character.cash)
    : 0;

  const isFreeConsultation = character.age < 16;
  const alreadyConsultedThisYear = character.healthcare?.lastConsultAge === character.age;
  const canAffordConsult = isFreeConsultation || cash >= 40;

  const handleOpenDoctorSelection = () => {
    if (alreadyConsultedThisYear) return;
    const session = generateDoctorSession();
    setDoctorSession(session);
    setIsDoctorSelectionOpen(true);
  };

  const handleSelectDoctorCandidate = (doctor: DoctorOption) => {
    setSelectedDoctorCandidate(doctor);
    setIsDoctorSelectionOpen(false);

    const price = isFreeConsultation ? 0 : doctor.consultPrice;

    setConfirmModal({
      title: `Consult ${doctor.doctorName}`,
      message: isFreeConsultation
        ? `Confirm your complimentary childhood checkup with ${doctor.doctorName} (${doctor.reputationLabel} Reputation). Free of charge ($0).`
        : `Confirm your doctor consultation with ${doctor.doctorName} (${doctor.reputationLabel} Reputation). A fee of ${formatMoney(price)} will be deducted from your wallet cash. The bank is not used.`,
      confirmLabel: isFreeConsultation ? 'Confirm Checkup ($0)' : `Confirm & Pay ${formatMoney(price)}`,
      confirmVariant: 'emerald',
      onConfirm: () => {
        setConfirmModal(null);
        executeDoctorConsultation(doctor);
      },
    });
  };

  const handleCloseConfirmModal = () => {
    setConfirmModal(null);
    if (selectedDoctorCandidate) {
      setIsDoctorSelectionOpen(true);
      setSelectedDoctorCandidate(null);
    }
  };

  const executeDoctorConsultation = (doctor: DoctorOption) => {
    setActionError(null);
    const beforeCash = character.cash;
    const result = consultDoctor(character, {
      tierId: doctor.id,
      doctorName: doctor.doctorName,
    });

    if (!result.ok) {
      setActionError(result.reason ?? 'The doctor consultation could not be completed.');
      return;
    }

    onUpdateCharacter(result.character);
    setSelectedDoctorCandidate(null);

    const cashDelta = result.character.cash - beforeCash;
    const deltas: CustomStatDelta[] = [];
    if (cashDelta !== 0) {
      deltas.push({ label: 'Cash', delta: `-$${Math.abs(cashDelta)}`, color: 'rose' });
    }

    const latestEvent = result.character.timeline[result.character.timeline.length - 1];
    setOutcomeModal({
      title: 'Consultation Complete',
      message: latestEvent?.message ?? `You completed your consultation with ${doctor.doctorName}.`,
      customDeltas: deltas.length > 0 ? deltas : undefined,
    });
  };

  const handleStartTreatment = (condition: ConditionRecord) => {
    const listing = getConditionListing(condition.catalogId);
    if (!listing) return;

    if (condition.catalogId === 'heart') {
      const price = listing.procedurePrice ?? 400;
      setConfirmModal({
        title: 'Surgical Heart Procedure',
        message: `Undergo a surgical procedure for ${formatMoney(price)}. Note: This procedure stabilises your condition but does NOT restore health. Annual follow-up care must be enrolled separately.`,
        confirmLabel: `Undergo Procedure (${formatMoney(price)})`,
        confirmVariant: 'emerald',
        onConfirm: () => {
          setConfirmModal(null);
          executeStartTreatment(condition.id);
        },
      });
      return;
    }

    if (condition.catalogId === 'chest') {
      const price = listing.remedyPrice ?? 120;
      setConfirmModal({
        title: 'Start Antibiotic Course',
        message: `Pay ${formatMoney(price)} to begin an intensive antibiotic course. Restores +10 Health immediately. The infection stays known and clears completely on your next birthday.`,
        confirmLabel: `Take Antibiotics (${formatMoney(price)})`,
        confirmVariant: 'emerald',
        onConfirm: () => {
          setConfirmModal(null);
          executeStartTreatment(condition.id);
        },
      });
      return;
    }

    const price = listing.remedyPrice ?? 0;
    const healthGain = listing.remedyHealth;
    setConfirmModal({
      title: `Treat ${getConditionTitle(condition.catalogId)}`,
      message: `Pay ${formatMoney(price)} for treatment. Health will improve by +${healthGain} and the condition will resolve immediately.`,
      confirmLabel: `Pay ${formatMoney(price)} & Treat`,
      confirmVariant: 'emerald',
      onConfirm: () => {
        setConfirmModal(null);
        executeStartTreatment(condition.id);
      },
    });
  };

  const executeStartTreatment = (conditionId: string) => {
    setActionError(null);
    const beforeCash = character.cash;
    const beforeHealth = character.stats.health;
    const result = startTreatment(character, conditionId);

    if (!result.ok) {
      setActionError(result.reason ?? 'Treatment could not be completed.');
      return;
    }

    onUpdateCharacter(result.character);
    setSelectedCondition(null);

    const cashDelta = result.character.cash - beforeCash;
    const healthDelta = result.character.stats.health - beforeHealth;
    const deltas: CustomStatDelta[] = [];
    if (cashDelta !== 0) {
      deltas.push({ label: 'Cash', delta: `-$${Math.abs(cashDelta)}`, color: 'rose' });
    }
    if (healthDelta !== 0) {
      deltas.push({ label: 'Health', delta: `+${healthDelta}`, color: 'emerald' });
    }

    const latestEvent = result.character.timeline[result.character.timeline.length - 1];
    setOutcomeModal({
      title: 'Treatment Completed',
      message: latestEvent?.message ?? 'Your medical treatment was successfully administered.',
      customDeltas: deltas.length > 0 ? deltas : undefined,
    });
  };

  const handleEnrollCare = (condition: ConditionRecord) => {
    const listing = getConditionListing(condition.catalogId);
    if (!listing || listing.enrollPrice === null) return;

    const price = listing.enrollPrice;
    const managedReduction = condition.catalogId === 'joints' ? 'reduces loss from -6 to -2' : 'reduces loss from -15 to -4';

    setConfirmModal({
      title: `Enroll in ${getConditionTitle(condition.catalogId)} Care`,
      message: `Enroll in annual managed care for ${formatMoney(price)} per year. This covers the current year and ${managedReduction} health annually. Renews automatically on your birthday if cash is available.`,
      confirmLabel: `Enroll (${formatMoney(price)}/yr)`,
      confirmVariant: 'emerald',
      onConfirm: () => {
        setConfirmModal(null);
        executeEnrollCare(condition.id);
      },
    });
  };

  const executeEnrollCare = (conditionId: string) => {
    setActionError(null);
    const beforeCash = character.cash;
    const result = enrollCare(character, conditionId);

    if (!result.ok) {
      setActionError(result.reason ?? 'Could not enroll in care.');
      return;
    }

    onUpdateCharacter(result.character);
    setSelectedCondition(null);

    const cashDelta = result.character.cash - beforeCash;
    const deltas: CustomStatDelta[] = [];
    if (cashDelta !== 0) {
      deltas.push({ label: 'Cash', delta: `-$${Math.abs(cashDelta)}`, color: 'rose' });
    }

    const latestEvent = result.character.timeline[result.character.timeline.length - 1];
    setOutcomeModal({
      title: 'Care Enrolled',
      message: latestEvent?.message ?? 'You enrolled in ongoing managed care.',
      customDeltas: deltas.length > 0 ? deltas : undefined,
    });
  };

  const handleCancelEnrollment = (condition: ConditionRecord) => {
    setConfirmModal({
      title: 'Cancel Care Renewal',
      message: 'Stopping care renewal will prevent automatic renewal on your next birthday. No refund is issued for the current year, and benefits remain active through your next birthday.',
      confirmLabel: 'Confirm Cancellation',
      confirmVariant: 'rose',
      onConfirm: () => {
        setConfirmModal(null);
        executeCancelEnrollment(condition.id);
      },
    });
  };

  const executeCancelEnrollment = (conditionId: string) => {
    setActionError(null);
    const result = cancelEnrollment(character, conditionId);

    if (!result.ok) {
      setActionError(result.reason ?? 'Could not cancel care.');
      return;
    }

    onUpdateCharacter(result.character);
    setSelectedCondition(null);

    const latestEvent = result.character.timeline[result.character.timeline.length - 1];
    setOutcomeModal({
      title: 'Renewal Canceled',
      message: latestEvent?.message ?? 'Care renewal has been stopped. Current year remains covered.',
    });
  };

  const handleDeclineTreatment = (condition: ConditionRecord) => {
    setActionError(null);
    const result = declineTreatment(character, condition.id);

    if (!result.ok) {
      setActionError(result.reason ?? 'Could not decline treatment.');
      return;
    }

    onUpdateCharacter(result.character);
    setSelectedCondition(null);

    setOutcomeModal({
      title: 'Treatment Deferred',
      message: `You decided to wait on ${getConditionListing(condition.catalogId)?.phrase ?? 'treatment'}. You may still treat it before aging up.`,
    });
  };

  return (
    <div className="p-4 flex flex-col gap-4 bg-white min-h-[480px]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-xs font-black text-slate-950 shadow-[1.5px_1.5px_0_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          <span>Menu</span>
        </button>
        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
          <Stethoscope className="w-4 h-4 text-emerald-600" />
          <span>Doctor & Healthcare</span>
        </span>
      </div>

      {/* Global Error Banner if any */}
      {actionError && (
        <div className="rounded-2xl border-2 border-rose-900 bg-rose-50 p-3 shadow-[2px_2px_0_#0f172a] flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="text-xs font-bold text-rose-950">{actionError}</div>
        </div>
      )}

      {/* Health Overview & Financial Banner */}
      <div className="rounded-2xl border-2 border-slate-900 bg-emerald-50/70 p-3.5 shadow-[2px_3px_0_#0f172a] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-400 border-2 border-slate-900 flex items-center justify-center text-slate-950 shadow-[1px_1px_0_#0f172a]">
              <Heart className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-950">Vitality</div>
              <div className="text-lg font-black font-mono text-slate-950">{character.stats.health}% Health</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-950">Spendable Cash</div>
            <div className="text-lg font-black font-mono text-slate-950">{formatMoney(cash)}</div>
          </div>
        </div>

        <div className="text-[11px] font-bold text-emerald-950/80 leading-snug border-t border-emerald-900/20 pt-2 flex items-center justify-between">
          <span>Patient Age: <strong>{character.age}</strong></span>
          <span className="text-[10px] italic">Medical care draws cash only (bank unused).</span>
        </div>
      </div>

      {/* Doctor Consultation Action Card */}
      <section className="rounded-2xl border-2 border-slate-900 bg-white p-3.5 shadow-[2px_3px_0_#0f172a] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🩺</span>
            <div>
              <h2 className="text-sm font-black text-slate-950 leading-tight">
                {isFreeConsultation ? 'Annual Routine Checkup' : 'Doctor Consultation'}
              </h2>
              <p className="text-[11px] font-bold text-slate-600">
                {isFreeConsultation ? 'Free under age 16 • 3 physicians available' : 'Choose from 3 physician tiers ($40, $60, $120)'}
              </p>
            </div>
          </div>
          <Badge variant={alreadyConsultedThisYear ? 'slate' : 'emerald'} size="sm">
            {alreadyConsultedThisYear ? 'Visited this year' : 'Available'}
          </Badge>
        </div>

        <p className="text-xs font-bold text-slate-700 leading-relaxed">
          {isFreeConsultation
            ? 'A childhood checkup evaluates physical health and diagnoses lurking conditions without charging a fee. Choose from 3 attending physicians.'
            : 'Consult an attending physician to diagnose medical concerns. Different physicians offer different diagnostic coverage and fees.'}
        </p>

        {alreadyConsultedThisYear ? (
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Consultation complete for Age {character.age}. Next visit available next year.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {!canAffordConsult && (
              <p className="text-[11px] font-bold text-rose-700">
                A visit starts at $40. You have {formatMoney(cash)}. Bank balance is not used.
              </p>
            )}
            <CartoonButton
              variant="emerald"
              size="md"
              fullWidth
              disabled={!canAffordConsult}
              onClick={handleOpenDoctorSelection}
              icon={<Stethoscope className="w-4 h-4" />}
            >
              {isFreeConsultation ? 'Choose Doctor for Free Checkup ($0)' : 'Choose Attending Physician ($40 - $120)'}
            </CartoonButton>
          </div>
        )}
      </section>

      {/* SECTION 1: Undiagnosed Concerns */}
      {undiagnosedConditions.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>Undiagnosed Concerns ({undiagnosedConditions.length})</span>
            </h2>
          </div>

          <div className="rounded-2xl border-2 border-amber-900 bg-amber-50/80 p-3 shadow-[2px_2px_0_#0f172a] flex flex-col gap-2">
            <p className="text-xs font-bold text-amber-950 leading-relaxed">
              You are experiencing health symptoms that have not yet been evaluated by a physician. Schedule a checkup to confirm what is wrong and unlock treatment.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {undiagnosedConditions.map((cond) => (
                <div
                  key={cond.id}
                  className="rounded-xl border-2 border-slate-900 bg-white p-2.5 shadow-[1.5px_1.5px_0_#0f172a] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">❓</span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-950 truncate">Unexamined Symptom</div>
                      <div className="text-[11px] font-bold text-slate-600 italic truncate">"{cond.symptom}"</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCondition(cond)}
                    className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-amber-100 hover:bg-amber-200 text-xs font-black text-slate-950 shadow-[1px_1px_0_#0f172a] shrink-0 cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: Active Diagnosed Conditions */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-slate-600" />
            <span>Active Diagnosed Conditions ({diagnosedConditions.length})</span>
          </h2>
        </div>

        {diagnosedConditions.length === 0 ? (
          <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-4 shadow-[2px_2px_0_#0f172a] text-center flex flex-col items-center justify-center gap-1">
            <span className="text-2xl">🌱</span>
            <div className="text-xs font-black text-slate-800">No active diagnosed conditions</div>
            <p className="text-[11px] font-bold text-slate-500">
              You currently have no confirmed ongoing illnesses or injuries.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {diagnosedConditions.map((cond) => {
              const listing = getConditionListing(cond.catalogId);
              const isTemp = listing?.temporary ?? false;
              const statusInfo = isTemp
                ? resolveTemporaryStatus(cond, character.age)
                : resolveCareStatus(cond, character.age);

              return (
                <div
                  key={cond.id}
                  className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[2px_2px_0_#0f172a] flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getConditionEmoji(cond.catalogId)}</span>
                      <div>
                        <h3 className="text-sm font-black text-slate-950 leading-tight">
                          {getConditionTitle(cond.catalogId)}
                        </h3>
                        <div className="text-[10px] font-bold text-slate-500">
                          Diagnosed at Age {cond.diagnosedAtAge ?? cond.acquiredAtAge}
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusInfo.badgeVariant} size="xs">
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <p className="text-[11px] font-bold text-slate-700 italic">
                    "{cond.symptom || listing?.symptom}"
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600">
                      {listing && listing.remedyPrice !== null && `Treatment: ${formatMoney(listing.remedyPrice)}`}
                      {listing && listing.procedurePrice !== null && !cond.procedureCompleted && `Procedure: ${formatMoney(listing.procedurePrice)}`}
                      {listing && listing.enrollPrice !== null && (cond.procedureCompleted || cond.catalogId === 'joints') && `Care: ${formatMoney(listing.enrollPrice)}/yr`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCondition(cond)}
                      className="px-3 py-1 rounded-xl border-2 border-slate-900 bg-emerald-100 hover:bg-emerald-200 text-xs font-black text-slate-950 shadow-[1px_1px_0_#0f172a] cursor-pointer"
                    >
                      View & Treat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Resolved Medical History */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Medical History ({closedConditions.length})</span>
          </h2>
        </div>

        {closedConditions.length === 0 ? (
          <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3 shadow-[2px_2px_0_#0f172a] text-center text-xs font-bold text-slate-500">
            No past resolved conditions recorded.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {closedConditions.map((cond) => {
              const closureVariant = cond.closure === 'recovered' ? 'emerald' : cond.closure === 'resolved' ? 'sky' : 'slate';
              const closureText = cond.closure ? cond.closure.toUpperCase() : 'CLOSED';

              return (
                <div
                  key={cond.id}
                  className="rounded-xl border-2 border-slate-900 bg-slate-50 p-2.5 shadow-[1.5px_1.5px_0_#0f172a] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{getConditionEmoji(cond.catalogId)}</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {getConditionTitle(cond.catalogId)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        Acquired at age {cond.acquiredAtAge} • Closed at age {cond.closedAtAge ?? '?'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={closureVariant} size="xs">
                      {closureText}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedCondition(cond)}
                      className="px-2 py-0.5 rounded-lg border-2 border-slate-900 bg-white hover:bg-slate-100 text-[10px] font-black text-slate-900 shadow-[1px_1px_0_#0f172a] cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: Past Doctor Visits & Checkups */}
      {validVisits.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              <span>Doctor Visits History ({validVisits.length})</span>
            </h2>
          </div>
          <div className="flex flex-col gap-1.5">
            {validVisits.slice().reverse().map((visit) => {
              const repVariant = visit.doctorReputation === 'excellent' ? 'amber' : visit.doctorReputation === 'good' ? 'sky' : 'slate';
              const repLabel = visit.doctorReputation
                ? `${visit.doctorReputation.charAt(0).toUpperCase() + visit.doctorReputation.slice(1)} Reputation`
                : undefined;

              return (
                <div
                  key={visit.id}
                  className="rounded-xl border-2 border-slate-900 bg-white p-2.5 shadow-[1.5px_1.5px_0_#0f172a] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{visit.kind === 'treatment' ? '💊' : '🩺'}</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {visit.doctorName ? visit.doctorName : (visit.kind === 'checkup' ? 'Doctor Consultation' : 'Medical Treatment')}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
                        Age {visit.age} • {visit.complimentary ? 'Free Checkup ($0)' : `Paid ${formatMoney(visit.pricePaid)}`}
                      </div>
                    </div>
                  </div>
                  {repLabel && (
                    <Badge variant={repVariant} size="xs">
                      {repLabel}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Malformed Records Notice (if any) */}
      {malformedCount > 0 && (
        <div className="rounded-xl border border-amber-900/30 bg-amber-50/50 p-2 text-[10px] font-bold text-amber-900">
          Note: {malformedCount} medical record{malformedCount === 1 ? '' : 's'} could not be read and {malformedCount === 1 ? 'was' : 'were'} safely preserved.
        </div>
      )}

      {/* Doctor Selection Modal */}
      <DoctorSelectionModal
        isOpen={isDoctorSelectionOpen}
        onClose={() => {
          setIsDoctorSelectionOpen(false);
          setDoctorSession([]);
        }}
        doctors={doctorSession}
        characterAge={character.age}
        spendableCash={cash}
        onSelectDoctor={handleSelectDoctorCandidate}
      />

      {/* Condition Detail Modal */}
      <ConditionDetailModal
        isOpen={selectedCondition !== null}
        onClose={() => setSelectedCondition(null)}
        condition={selectedCondition}
        character={character}
        onStartTreatment={handleStartTreatment}
        onEnrollCare={handleEnrollCare}
        onCancelEnrollment={handleCancelEnrollment}
        onDeclineTreatment={handleDeclineTreatment}
      />

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          onClose={handleCloseConfirmModal}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          confirmVariant={confirmModal.confirmVariant ?? 'emerald'}
          icon={<Stethoscope className="w-5 h-5 text-emerald-600" />}
        />
      )}

      {/* Action Outcome Modal */}
      {outcomeModal && (
        <ActionOutcomeModal
          isOpen={true}
          onClose={() => setOutcomeModal(null)}
          title={outcomeModal.title}
          message={outcomeModal.message}
          statEffects={outcomeModal.statEffects}
          customDeltas={outcomeModal.customDeltas}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
        />
      )}
    </div>
  );
};
