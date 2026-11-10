import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { PropertyArtwork } from './PropertyArtwork';

interface PropertyListingCardProps {
  name: string;
  city: string;
  typeLabel: string;
  price: string;
  upkeep: string;
  imageSrc: string | null;
  onOpen: () => void;
}

export const PropertyListingCard: React.FC<PropertyListingCardProps> = ({
  name,
  city,
  typeLabel,
  price,
  upkeep,
  imageSrc,
  onOpen,
}) => {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2px_0_#0f172a] overflow-hidden flex cursor-pointer hover:bg-sky-50/60"
    >
      <PropertyArtwork src={imageSrc} name={name} loading="lazy" className="w-28 h-[4.5rem] flex-shrink-0 border-r-2 border-slate-900" />
      <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-black text-slate-950 leading-tight">{name}</span>
          <span className="text-xs font-black font-mono text-slate-950 flex-shrink-0">{price}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500">{city}</span>
          <Badge variant="sky" size="xs">{typeLabel}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-600">Upkeep {upkeep} / year</span>
          <span className="text-[10px] font-black text-sky-800">View</span>
        </div>
      </div>
    </button>
  );
};
