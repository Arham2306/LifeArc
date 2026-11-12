import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Stethoscope, Sparkles, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import type { DoctorOption } from '../services/doctorNameService';
import { formatMoney } from './healthcareDisplay';

interface DoctorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: DoctorOption[];
  characterAge: number;
  spendableCash: number;
  onSelectDoctor: (doctor: DoctorOption) => void;
}

export const DoctorSelectionModal: React.FC<DoctorSelectionModalProps> = ({
  isOpen,
  onClose,
  doctors,
  characterAge,
  spendableCash,
  onSelectDoctor,
}) => {
  const isChild = characterAge < 16;

  const getReputationStyling = (reputation: 'average' | 'good' | 'excellent') => {
    switch (reputation) {
      case 'excellent':
        return {
          cardBg: 'bg-amber-50/70 border-amber-400',
          badgeVariant: 'amber' as const,
          icon: <Sparkles className="w-4 h-4 text-amber-600" />,
          accentColor: 'text-amber-950',
          capabilityBadge: 'amber' as const,
        };
      case 'good':
        return {
          cardBg: 'bg-sky-50/60 border-sky-300',
          badgeVariant: 'sky' as const,
          icon: <Shield className="w-4 h-4 text-sky-600" />,
          accentColor: 'text-sky-950',
          capabilityBadge: 'sky' as const,
        };
      case 'average':
      default:
        return {
          cardBg: 'bg-slate-50 border-slate-300',
          badgeVariant: 'slate' as const,
          icon: <Stethoscope className="w-4 h-4 text-slate-600" />,
          accentColor: 'text-slate-900',
          capabilityBadge: 'slate' as const,
        };
    }
  };

  const getDiagnosticLabel = (diagnosticTier: 'basic' | 'advanced' | 'expert') => {
    switch (diagnosticTier) {
      case 'expert':
        return 'Identifies all 5 conditions (Cold, Ankle, Chest, Joints, Tired Heart)';
      case 'advanced':
        return 'Identifies Cold, Sprained Ankle, Chest Infection, and Worn Joints';
      case 'basic':
      default:
        return 'Identifies everyday concerns (Lingering Cold, Sprained Ankle)';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isChild ? 'Select Doctor for Checkup' : 'Choose Your Attending Physician'}
      icon={<Stethoscope className="w-5 h-5 text-emerald-600" />}
      maxWidth="lg"
    >
      <div className="flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto cartoon-scrollbar pr-1">
        {/* Guidance Header */}
        <div className="rounded-2xl border-2 border-slate-900 bg-emerald-50 p-3 shadow-[2px_2px_0_#0f172a] text-xs font-bold text-emerald-950 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-black text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              {isChild
                ? 'Childhood Checkup: All Doctors Complimentary ($0)'
                : 'Select from 3 Available Physicians'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-emerald-900/90">
            {isChild
              ? 'Routine examinations are free before age 16. Physician reputation determines which underlying conditions they have the expertise to diagnose.'
              : 'Physician reputation determines diagnostic breadth and consultation fee. Doctors identify medical conditions without treating them. Fees draw wallet cash only.'}
          </p>
        </div>

        {/* Doctor Cards List */}
        <div className="flex flex-col gap-3">
          {doctors.map((doctor) => {
            const styling = getReputationStyling(doctor.reputation);
            const fee = isChild ? 0 : doctor.consultPrice;
            const canAfford = isChild || spendableCash >= doctor.consultPrice;

            return (
              <div
                key={doctor.id}
                className={`rounded-2xl border-2 p-3.5 shadow-[2px_3px_0_#0f172a] flex flex-col gap-2.5 transition-all ${styling.cardBg}`}
              >
                {/* Header row: Doctor name & reputation */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-center shadow-[1px_1px_0_#0f172a]">
                      {styling.icon}
                    </div>
                    <div>
                      <h3 className={`text-sm font-black leading-tight ${styling.accentColor}`}>
                        {doctor.doctorName}
                      </h3>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {doctor.diagnosticTier} Diagnostic Capability
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={styling.badgeVariant} size="xs">
                      {doctor.reputationLabel}
                    </Badge>
                    <span className="text-xs font-black text-slate-900">
                      {isChild ? 'Free ($0)' : formatMoney(fee)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] font-medium text-slate-700 italic leading-snug">
                  "{doctor.description}"
                </p>

                {/* Diagnostic Scope */}
                <div className="rounded-xl border border-slate-900/20 bg-white/80 p-2 text-[10px] font-bold text-slate-700 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-black">
                    Diagnostic Scope
                  </span>
                  <span>{getDiagnosticLabel(doctor.diagnosticTier)}</span>
                </div>

                {/* Affordability & Selection */}
                <div className="flex flex-col gap-1 pt-1">
                  {!canAfford && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        Need {formatMoney(doctor.consultPrice)} cash. You have {formatMoney(spendableCash)} (bank unused).
                      </span>
                    </div>
                  )}

                  <CartoonButton
                    variant={canAfford ? (doctor.reputation === 'excellent' ? 'amber' : 'emerald') : 'slate'}
                    size="sm"
                    fullWidth
                    disabled={!canAfford}
                    onClick={() => onSelectDoctor(doctor)}
                    icon={<Stethoscope className="w-3.5 h-3.5" />}
                  >
                    {isChild
                      ? `Consult ${doctor.doctorName} ($0)`
                      : canAfford
                      ? `Consult ${doctor.doctorName} (${formatMoney(doctor.consultPrice)})`
                      : `Cannot Afford (${formatMoney(doctor.consultPrice)})`}
                  </CartoonButton>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer cancel button */}
        <div className="pt-1 flex justify-end">
          <CartoonButton
            variant="slate"
            size="sm"
            onClick={onClose}
          >
            Cancel Selection
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
