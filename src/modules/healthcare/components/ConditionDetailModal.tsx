import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Badge } from '../../../components/ui/Badge';
import { AlertCircle, CheckCircle2, Clock, Heart, ShieldAlert, Sparkles } from 'lucide-react';
import type { CharacterProfile } from '../../../types/game';
import type { ConditionRecord } from '../types';
import { getConditionListing } from '../data/conditionCatalog';
import { chestCourseAwaitingClose } from '../services/healthcareService';
import {
  formatMoney,
  getConditionEmoji,
  getConditionTitle,
  resolveCareStatus,
  resolveTemporaryStatus,
} from './healthcareDisplay';

interface ConditionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  condition: ConditionRecord | null;
  character: CharacterProfile;
  onStartTreatment: (condition: ConditionRecord) => void;
  onEnrollCare: (condition: ConditionRecord) => void;
  onCancelEnrollment: (condition: ConditionRecord) => void;
  onDeclineTreatment: (condition: ConditionRecord) => void;
}

export const ConditionDetailModal: React.FC<ConditionDetailModalProps> = ({
  isOpen,
  onClose,
  condition,
  character,
  onStartTreatment,
  onEnrollCare,
  onCancelEnrollment,
  onDeclineTreatment,
}) => {
  if (!condition) return null;

  const listing = getConditionListing(condition.catalogId);
  const isDiagnosed = condition.status === 'known';
  const isClosed = condition.status === 'closed';
  const cash = typeof character.cash === 'number' && Number.isFinite(character.cash) ? Math.max(0, character.cash) : 0;
  const isTemporary = listing?.temporary ?? false;

  const temporaryStatus = isTemporary ? resolveTemporaryStatus(condition, character.age) : null;
  const careStatus = !isTemporary ? resolveCareStatus(condition, character.age) : null;

  // Affordability checks
  const remedyPrice = listing?.remedyPrice ?? null;
  const procedurePrice = listing?.procedurePrice ?? null;
  const enrollPrice = listing?.enrollPrice ?? null;

  const canAffordRemedy = remedyPrice !== null && cash >= remedyPrice;
  const canAffordProcedure = procedurePrice !== null && cash >= procedurePrice;
  const canAffordEnroll = enrollPrice !== null && cash >= enrollPrice;

  const chestUnderway = condition.catalogId === 'chest' && chestCourseAwaitingClose(condition);
  const alreadyDeclinedThisYear = condition.declinedAtAge === character.age;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getConditionTitle(condition.catalogId)}
      icon={<span className="text-xl">{getConditionEmoji(condition.catalogId)}</span>}
    >
      <div className="flex flex-col gap-4 py-1 text-slate-900">
        {/* Status Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {isClosed ? (
            <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              Closed: {condition.closure || 'resolved'}
            </Badge>
          ) : isDiagnosed ? (
            <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              Diagnosed
            </Badge>
          ) : (
            <Badge variant="amber" size="sm" icon={<Clock className="w-3.5 h-3.5" />}>
              Undiagnosed Concern
            </Badge>
          )}

          <Badge variant="slate" size="sm">
            Acquired at Age {condition.acquiredAtAge}
          </Badge>

          {temporaryStatus ? (
            <Badge variant={temporaryStatus.badgeVariant} size="sm">
              {temporaryStatus.label}
            </Badge>
          ) : null}

          {careStatus ? (
            <Badge variant={careStatus.badgeVariant} size="sm">
              {careStatus.label}
            </Badge>
          ) : null}
        </div>

        {/* Symptoms Card */}
        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3.5 shadow-[2px_2px_0_#0f172a]">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
            Recorded Symptoms
          </div>
          <p className="text-sm font-bold text-slate-800 italic">
            "{condition.symptom || listing?.symptom || 'No detailed symptoms recorded.'}"
          </p>
        </div>

        {/* Clinical Overview / Description */}
        <div className="rounded-2xl border-2 border-slate-900 bg-amber-50/60 p-3.5 shadow-[2px_2px_0_#0f172a] flex flex-col gap-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-950">
            Medical Assessment
          </div>

          {!isDiagnosed ? (
            <p className="text-xs font-bold leading-relaxed text-slate-800">
              The doctor has not evaluated this concern yet. Consult the clinic to obtain a confirmed medical diagnosis and unlock appropriate treatments.
            </p>
          ) : isTemporary ? (
            <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-800">
              <p>{temporaryStatus?.description}</p>
              {condition.catalogId === 'cold' && (
                <p className="text-slate-600">
                  • <strong>Remedy ($25):</strong> Restores +8 Health and clears the cold immediately.
                  <br />
                  • <strong>Untreated:</strong> Causes -6 Health penalty on your next birthday before clearing.
                </p>
              )}
              {condition.catalogId === 'ankle' && (
                <p className="text-slate-600">
                  • <strong>Treatment ($40):</strong> Restores +4 Health and resolves the sprain immediately (happiness unaffected).
                  <br />
                  • <strong>Untreated:</strong> Causes -4 Health and -2 Happiness penalty on your next birthday.
                </p>
              )}
              {condition.catalogId === 'chest' && (
                <p className="text-slate-600">
                  • <strong>Antibiotic Course ($120):</strong> Restores +10 Health immediately. The infection remains known and safely clears on your next birthday with no further penalty.
                  <br />
                  • <strong>Untreated:</strong> Inflicts -12 Health per year for up to 2 years before clearing.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-800">
              <p>{careStatus?.description}</p>
              {condition.catalogId === 'joints' && (
                <p className="text-slate-600">
                  • <strong>Annual Therapy ($80/yr):</strong> Covers physical therapy and reduces annual health decline from -6 to -2.
                  <br />
                  • <strong>Renewal:</strong> Automatically renews on your birthday if sufficient cash is on hand.
                </p>
              )}
              {condition.catalogId === 'heart' && (
                <p className="text-slate-600">
                  • <strong>Procedure ($400):</strong> Stabilises cardiovascular condition. Does <em>not</em> restore health or enroll follow-up care.
                  <br />
                  • <strong>Follow-up Care ($60/yr):</strong> Available after procedure. Reduces annual health loss from -15 to -4.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Insufficient Cash Warning if applicable */}
        {isDiagnosed && (
          <>
            {remedyPrice !== null && !canAffordRemedy && !chestUnderway && (
              <div className="rounded-xl border-2 border-rose-900 bg-rose-50 p-2.5 flex items-start gap-2 text-xs font-bold text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  Insufficient cash: Remedy costs {formatMoney(remedyPrice)}. You have {formatMoney(cash)}. Bank balance is not used for medical care.
                </div>
              </div>
            )}
            {procedurePrice !== null && !condition.procedureCompleted && !canAffordProcedure && (
              <div className="rounded-xl border-2 border-rose-900 bg-rose-50 p-2.5 flex items-start gap-2 text-xs font-bold text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  Insufficient cash: Surgical procedure costs {formatMoney(procedurePrice)}. You have {formatMoney(cash)}. Bank balance is not used.
                </div>
              </div>
            )}
            {enrollPrice !== null && !condition.enrolled && !canAffordEnroll && (
              <div className="rounded-xl border-2 border-rose-900 bg-rose-50 p-2.5 flex items-start gap-2 text-xs font-bold text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  Insufficient cash: Annual care costs {formatMoney(enrollPrice)}. You have {formatMoney(cash)}. Bank balance is not used.
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t-2 border-slate-900">
          {!isDiagnosed ? (
            <CartoonButton
              variant="white"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Close
            </CartoonButton>
          ) : isClosed ? (
            <CartoonButton
              variant="white"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Close
            </CartoonButton>
          ) : (
            <>
              {/* Cold Treatment */}
              {condition.catalogId === 'cold' && (
                <CartoonButton
                  variant="emerald"
                  size="md"
                  fullWidth
                  disabled={!canAffordRemedy}
                  onClick={() => onStartTreatment(condition)}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Buy Cold Remedy ($25) • +8 Health
                </CartoonButton>
              )}

              {/* Ankle Treatment */}
              {condition.catalogId === 'ankle' && (
                <CartoonButton
                  variant="emerald"
                  size="md"
                  fullWidth
                  disabled={!canAffordRemedy}
                  onClick={() => onStartTreatment(condition)}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Treat Sprained Ankle ($40) • +4 Health
                </CartoonButton>
              )}

              {/* Chest Infection Treatment */}
              {condition.catalogId === 'chest' && (
                chestUnderway ? (
                  <CartoonButton
                    variant="white"
                    size="md"
                    fullWidth
                    disabled
                    icon={<Clock className="w-4 h-4 text-emerald-600" />}
                  >
                    Course Underway (Clears on next birthday)
                  </CartoonButton>
                ) : (
                  <CartoonButton
                    variant="emerald"
                    size="md"
                    fullWidth
                    disabled={!canAffordRemedy}
                    onClick={() => onStartTreatment(condition)}
                    icon={<Sparkles className="w-4 h-4" />}
                  >
                    Take Antibiotic Course ($120) • +10 Health
                  </CartoonButton>
                )
              )}

              {/* Heart Procedure & Follow-up */}
              {condition.catalogId === 'heart' && (
                <>
                  {!condition.procedureCompleted ? (
                    <CartoonButton
                      variant="emerald"
                      size="md"
                      fullWidth
                      disabled={!canAffordProcedure}
                      onClick={() => onStartTreatment(condition)}
                      icon={<Heart className="w-4 h-4" />}
                    >
                      Undergo Heart Procedure ($400)
                    </CartoonButton>
                  ) : (
                    <>
                      {!condition.enrolled ? (
                        <CartoonButton
                          variant="emerald"
                          size="md"
                          fullWidth
                          disabled={!canAffordEnroll}
                          onClick={() => onEnrollCare(condition)}
                          icon={<ShieldAlert className="w-4 h-4" />}
                        >
                          Enroll in Heart Follow-up ($60/yr)
                        </CartoonButton>
                      ) : (
                        <CartoonButton
                          variant="rose"
                          size="md"
                          fullWidth
                          onClick={() => onCancelEnrollment(condition)}
                        >
                          Cancel Annual Renewal
                        </CartoonButton>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Worn Joints Enrollment */}
              {condition.catalogId === 'joints' && (
                <>
                  {!condition.enrolled ? (
                    <CartoonButton
                      variant="emerald"
                      size="md"
                      fullWidth
                      disabled={!canAffordEnroll}
                      onClick={() => onEnrollCare(condition)}
                      icon={<ShieldAlert className="w-4 h-4" />}
                    >
                      Enroll in Joint Therapy ($80/yr)
                    </CartoonButton>
                  ) : (
                    <CartoonButton
                      variant="rose"
                      size="md"
                      fullWidth
                      onClick={() => onCancelEnrollment(condition)}
                    >
                      Cancel Annual Renewal
                    </CartoonButton>
                  )}
                </>
              )}

              {/* Decline Treatment Option (for untreated conditions not yet declined this year) */}
              {isTemporary && !chestUnderway && (
                <CartoonButton
                  variant="slate"
                  size="sm"
                  fullWidth
                  disabled={alreadyDeclinedThisYear}
                  onClick={() => onDeclineTreatment(condition)}
                >
                  {alreadyDeclinedThisYear ? 'Declined this year' : 'Wait on Treatment (Free)'}
                </CartoonButton>
              )}

              <CartoonButton
                variant="white"
                size="sm"
                fullWidth
                onClick={onClose}
              >
                Close
              </CartoonButton>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
