import React, { useState } from 'react';
import { Sparkles, Dices, Heart } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { FEMALE_NAMES, MALE_NAMES } from '../../character/data/names';
import type { ChildProfile } from '../../../types/game';

interface BabyNamingModalProps {
  isOpen: boolean;
  baby: ChildProfile;
  playerLastName: string;
  partnerLastName?: string;
  onConfirm: (firstName: string, lastName: string) => void;
}

export const BabyNamingModal: React.FC<BabyNamingModalProps> = ({
  isOpen,
  baby,
  playerLastName,
  partnerLastName,
  onConfirm,
}) => {
  const [firstName, setFirstName] = useState<string>(baby.firstName);
  const [selectedLastName, setSelectedLastName] = useState<string>(
    playerLastName || baby.lastName
  );

  const isGirl = baby.gender === 'female';

  // Last name options: player's, partner's (if different), and optional hyphenated
  const lastNameOptions: { value: string; label: string }[] = [
    { value: playerLastName, label: `${playerLastName} (Your Family)` },
  ];

  if (partnerLastName && partnerLastName !== playerLastName) {
    lastNameOptions.push({
      value: partnerLastName,
      label: `${partnerLastName} (Partner's Family)`,
    });
    lastNameOptions.push({
      value: `${playerLastName}-${partnerLastName}`,
      label: `${playerLastName}-${partnerLastName} (Hyphenated)`,
    });
  }

  const handleRandomizeName = () => {
    const pool = isGirl ? FEMALE_NAMES : MALE_NAMES;
    const randomPick = pool[Math.floor(Math.random() * pool.length)];
    setFirstName(randomPick);
  };

  const handleConfirmNaming = () => {
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) return;
    onConfirm(trimmedFirst, selectedLastName);
  };

  return (
    <Modal
      isOpen={isOpen}
      title="A Baby is Born! 🍼"
      icon="👶"
    >
      <div className="flex flex-col gap-4 text-center items-center py-1">
        {/* Celebration Centerpiece */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-3xl border-[3px] border-slate-900 flex items-center justify-center text-4xl shadow-[3px_3px_0_#0f172a] transform -rotate-1 ${
              isGirl ? 'bg-pink-100' : 'bg-sky-100'
            }`}
          >
            {isGirl ? '👧' : '👦'}
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 rounded-full p-1 border-2 border-slate-900 text-xs shadow-[1.5px_1.5px_0_#0f172a] animate-bounce">
            🎉
          </div>
        </div>

        {/* Gender & Congratulatory Headline */}
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1 rounded-full border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a] ${
              isGirl
                ? 'bg-rose-100 text-rose-950 border-rose-900'
                : 'bg-sky-100 text-sky-950 border-sky-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGirl ? "It's a Healthy Baby Girl! 👧🎀" : "It's a Healthy Baby Boy! 👦💙"}
          </span>
          <p className="text-xs font-bold text-slate-600 mt-1.5">
            Congratulations! You welcomed a beautiful new life into the world.
          </p>
        </div>

        {/* Inherited Genetics Chips */}
        <div className="flex items-center justify-center gap-2 w-full">
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-2 shadow-[1.5px_1.5px_0_#0f172a]">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Looks</span>
            <span className="text-xs font-black text-rose-700">✨ {baby.looks}%</span>
          </div>
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-2 shadow-[1.5px_1.5px_0_#0f172a]">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Smarts</span>
            <span className="text-xs font-black text-sky-700">🧠 {baby.smarts}%</span>
          </div>
          <div className="flex-1 bg-slate-50 border-2 border-slate-900 rounded-xl p-2 shadow-[1.5px_1.5px_0_#0f172a]">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Health</span>
            <span className="text-xs font-black text-emerald-700">💚 {baby.health}%</span>
          </div>
        </div>

        {/* Naming Form */}
        <div className="w-full flex flex-col gap-3 text-left bg-amber-50/60 p-3.5 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]">
          {/* First Name Input */}
          <div>
            <label className="text-xs font-black text-slate-900 block mb-1">
              Choose First Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={20}
                placeholder="Enter baby's name"
                className="flex-1 px-3 py-2 text-xs font-black bg-white rounded-xl border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a] focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <button
                type="button"
                onClick={handleRandomizeName}
                title="Roll Random Name"
                className="px-2.5 py-2 bg-white hover:bg-slate-100 rounded-xl border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a] flex items-center gap-1 text-xs font-black text-slate-800 transition-all active:translate-y-0.5 cursor-pointer shrink-0"
              >
                <Dices className="w-4 h-4 text-purple-600" />
                <span>Roll</span>
              </button>
            </div>
          </div>

          {/* Last Name Dropdown */}
          <div>
            <label className="text-xs font-black text-slate-900 block mb-1">
              Select Last Name
            </label>
            <select
              value={selectedLastName}
              onChange={(e) => setSelectedLastName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-black bg-white rounded-xl border-2 border-slate-900 shadow-[1.5px_1.5px_0_#0f172a] focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer"
            >
              {lastNameOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Confirmation Button */}
        <div className="w-full pt-1">
          <CartoonButton
            variant="rose"
            size="md"
            disabled={!firstName.trim()}
            className={`w-full justify-center ${!firstName.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={handleConfirmNaming}
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>Welcome {firstName.trim() || 'Baby'} to the Family! ❤️</span>
          </CartoonButton>
        </div>
      </div>
    </Modal>
  );
};

