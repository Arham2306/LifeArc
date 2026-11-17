import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import type { CharacterProfile } from '../../../types/game';
import { getHousingSummary } from '../services/housingService';

interface HousingStatusBannerProps {
  character: CharacterProfile;
}

export const HousingStatusBanner: React.FC<HousingStatusBannerProps> = ({ character }) => {
  const housingSummary = getHousingSummary(character);

  return (
    <div
      className={`rounded-2xl border-2 border-slate-900 p-3 shadow-[2px_2px_0_#0f172a] flex flex-col gap-1 ${
        housingSummary.status === 'unhoused'
          ? 'bg-rose-50'
          : housingSummary.status === 'housed'
            ? 'bg-emerald-50'
            : 'bg-amber-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">
          Housing Status
        </span>
        <Badge
          variant={
            housingSummary.status === 'unhoused'
              ? 'rose'
              : housingSummary.status === 'housed'
                ? 'emerald'
                : 'amber'
          }
          size="xs"
        >
          {housingSummary.status === 'housed'
            ? 'Housed'
            : housingSummary.status === 'unhoused'
              ? `Unhoused (${housingSummary.yearsUnhoused}y)`
              : character.age < 18
                ? 'With Parents'
                : `Move Out by Age ${housingSummary.moveOutDeadlineAge}`}
        </Badge>
      </div>
      <p className="text-[11px] font-bold text-slate-700 leading-snug">
        {housingSummary.status === 'housed'
          ? housingSummary.ownedHomeCount > 0
            ? `Secured in your own home (${housingSummary.ownedHomeCount} owned). Protected from homelessness penalties.`
            : 'Independent housing secured.'
          : housingSummary.status === 'unhoused'
            ? 'Without a home, Health and Happiness decline each year on Age Up. Buy any property below to stop future penalties.'
            : character.age < 18
              ? `Living with your parents. Expect to purchase your own home by age ${housingSummary.moveOutDeadlineAge}.`
              : `Living with parents (${housingSummary.yearsUntilDeadline} year${housingSummary.yearsUntilDeadline === 1 ? '' : 's'} left). Buy any home below before age ${housingSummary.moveOutDeadlineAge}.`}
      </p>
    </div>
  );
};
