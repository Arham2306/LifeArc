import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'

interface DropOutConfirmModalProps {
  isOpen: boolean;
  schoolName: string;
  onConfirmDropOut: () => void;
  onCancel: () => void;
}

export const DropOutConfirmModal: React.FC<DropOutConfirmModalProps> = ({
  isOpen,
  schoolName,
  onConfirmDropOut,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Drop Out of High School?"
      icon="🚪"
      actions={
        <>
          <CartoonButton
            variant="rose"
            size="md"
            fullWidth
            onClick={onConfirmDropOut}
            icon={<AlertTriangle className="w-4 h-4 stroke-[2.5]" />}
          >
            Yes, Drop Out Forever
          </CartoonButton>
          <CartoonButton variant="white" size="md" fullWidth onClick={onCancel}>
            Stay in School
          </CartoonButton>
        </>
      }
    >
      <p className="text-xs font-bold text-slate-700 leading-relaxed">
        Are you sure you want to permanently leave{' '}
        <span className="font-black text-slate-950">{schoolName}</span> without a diploma?
      </p>

      <div className="rounded-2xl border-2 border-rose-800 bg-rose-50 p-3 flex flex-col gap-1.5 text-xs font-bold text-rose-950">
        <div className="flex items-center gap-1.5 font-black text-rose-800 uppercase text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Major Consequences</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] font-bold text-rose-900">
          <li>You will not earn a High School Diploma.</li>
          <li>University & professional careers will be locked.</li>
          <li>Your parents will be devastated (severe relationship hit).</li>
        </ul>
      </div>
    </Modal>
  );
};

