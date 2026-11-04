import React, { useState } from 'react';
import { Heart, ChevronRight, ChevronLeft } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import type { DatingCandidate } from '../types';

interface DatingAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: DatingCandidate[];
  preference: 'women' | 'men' | 'everyone';
  onChangePreference: (pref: 'women' | 'men' | 'everyone') => void;
  onAskOutCandidate: (candidate: DatingCandidate) => void;
}

export const DatingAppModal: React.FC<DatingAppModalProps> = ({
  isOpen,
  onClose,
  candidates,
  preference,
  onChangePreference,
  onAskOutCandidate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!candidates || candidates.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="ArcDate — Matches"
        icon="📱"
      >
        <div className="p-4 text-center">
          <p className="text-xs font-bold text-slate-600 mb-3">No candidates found nearby. Check back soon!</p>
          <CartoonButton variant="slate" size="sm" onClick={onClose}>
            Close
          </CartoonButton>
        </div>
      </Modal>
    );
  }

  const current = candidates[currentIndex % candidates.length];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % candidates.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ArcDate 💘 Dating App"
      icon="📱"
    >
      <div className="flex flex-col gap-3">
        {/* Preference Filters */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-100 p-2 rounded-xl border border-slate-300">
          <span>Looking for:</span>
          <div className="flex items-center gap-1">
            {(['women', 'men', 'everyone'] as const).map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => onChangePreference(pref)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                  preference === pref
                    ? 'bg-rose-500 text-white shadow-[1px_1px_0_#9f1239]'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Card */}
        <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-[2px_2.5px_0_#0f172a] flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-200 border-2 border-slate-900 flex items-center justify-center text-3xl shadow-[1.5px_1.5px_0_#0f172a]">
                {current.avatarEmoji}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 leading-tight">
                  {current.firstName} {current.lastName}, {current.age}
                </h3>
                <span className="text-xs font-bold text-rose-700 block">
                  {current.occupation}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                  ${current.annualIncome.toLocaleString()}/yr
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-slate-500 font-mono">
              {currentIndex + 1} / {candidates.length}
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-700 italic bg-rose-50/60 p-2.5 rounded-xl border border-rose-200">
            "{current.bio}"
          </p>

          {/* Vitals */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between font-bold text-[10px] text-slate-600">
                <span>Looks</span>
                <span className="font-mono text-rose-600">{current.looks}%</span>
              </div>
              <ProgressBar value={current.looks} color="rose" size="xs" />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between font-bold text-[10px] text-slate-600">
                <span>Smarts</span>
                <span className="font-mono text-sky-600">{current.smarts}%</span>
              </div>
              <ProgressBar value={current.smarts} color="sky" size="xs" />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between font-bold text-[10px] text-slate-600">
                <span>Drama / Craziness</span>
                <span className="font-mono text-amber-600">{current.craziness}%</span>
              </div>
              <ProgressBar value={current.craziness} color="amber" size="xs" />
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between font-bold text-[10px] text-slate-600">
                <span>Generosity</span>
                <span className="font-mono text-emerald-600">{current.generosity}%</span>
              </div>
              <ProgressBar value={current.generosity} color="emerald" size="xs" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          <CartoonButton variant="white" size="sm" onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4" />
            Previous
          </CartoonButton>

          <CartoonButton
            variant="rose"
            size="sm"
            onClick={() => onAskOutCandidate(current)}
          >
            <Heart className="w-4 h-4 fill-white" />
            Date {current.firstName}
          </CartoonButton>

          <CartoonButton variant="white" size="sm" onClick={handleNext}>
            Next
            <ChevronRight className="w-4 h-4" />
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};
