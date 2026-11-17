import React from 'react';
import { Briefcase, Home } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import type { CharacterProfile } from '../../../types/game';
import { PROPERTY_CATALOG } from '../data/propertyCatalog';
import { PROPERTY_DOWN_PAYMENT_RATE } from '../services/assetService';
import { getHousingSummary } from '../services/housingService';
import type { HousingNoticeKind } from '../types';

interface HousingNoticeModalProps {
  isOpen: boolean;
  noticeKind: HousingNoticeKind | null;
  character: CharacterProfile;
  onBrowseHomes: () => void;
  onExploreCareers?: () => void;
  onDismiss: () => void;
}

function money(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

export const HousingNoticeModal: React.FC<HousingNoticeModalProps> = ({
  isOpen,
  noticeKind,
  character,
  onBrowseHomes,
  onExploreCareers,
  onDismiss,
}) => {
  if (!isOpen || !noticeKind) return null;

  const summary = getHousingSummary(character);
  const cheapestListing = PROPERTY_CATALOG[0];
  const entryDownPayment = cheapestListing
    ? Math.round(cheapestListing.purchasePrice * PROPERTY_DOWN_PAYMENT_RATE)
    : 12400;
  const cashGap = Math.max(0, entryDownPayment - Math.max(0, character.cash));

  const title =
    noticeKind === 'age18_independence'
      ? 'Time to Find Your Own Place'
      : noticeKind === 'age20_final_warning'
        ? 'One Year Remaining at Home'
        : 'Time to Move Out';

  const icon =
    noticeKind === 'age18_independence'
      ? '🏡'
      : noticeKind === 'age20_final_warning'
        ? '⚠️'
        : '📦';

  const badgeLabel =
    noticeKind === 'age18_independence'
      ? `Age ${character.age} • Adulthood Notice`
      : noticeKind === 'age20_final_warning'
        ? 'Final Warning • 1 Year Left'
        : 'Unhoused • Health & Happiness at Risk';

  const badgeVariant: 'amber' | 'rose' =
    noticeKind === 'age21_moved_out' ? 'rose' : 'amber';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      title={title}
      icon={icon}
      maxWidth="md"
      actions={
        <div className="flex flex-col gap-2 w-full">
          <CartoonButton
            variant="emerald"
            size="md"
            fullWidth
            onClick={onBrowseHomes}
            icon={<Home className="w-4 h-4 stroke-[2.5]" />}
          >
            {noticeKind === 'age21_moved_out' ? 'Browse Homes (Assets)' : 'Browse Homes'}
          </CartoonButton>

          {noticeKind !== 'age21_moved_out' && onExploreCareers && (
            <CartoonButton
              variant="sky"
              size="md"
              fullWidth
              onClick={onExploreCareers}
              icon={<Briefcase className="w-4 h-4 stroke-[2.5]" />}
            >
              Explore Careers
            </CartoonButton>
          )}

          <CartoonButton variant="white" size="md" fullWidth onClick={onDismiss}>
            {noticeKind === 'age18_independence'
              ? "I'll Prepare"
              : noticeKind === 'age20_final_warning'
                ? 'Got It'
                : 'Acknowledge'}
          </CartoonButton>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-slate-900">
        <div>
          <Badge variant={badgeVariant} size="xs">
            {badgeLabel}
          </Badge>
        </div>

        {noticeKind === 'age18_independence' && (
          <>
            <p className="text-xs font-bold leading-relaxed text-slate-700">
              Now that you&apos;ve turned 18, your parents expect you to stand on your own two feet
              by <strong>age {summary.moveOutDeadlineAge}</strong>. Until then, you can live at home
              without housing penalties while you build your career and savings.
            </p>
            <p className="text-xs font-bold leading-relaxed text-slate-700">
              Right now, securing independent housing requires buying a home in{' '}
              <strong>Menu → Assets &amp; Real Estate</strong> (in cash or with a 20% mortgage down
              payment). If you reach age {summary.moveOutDeadlineAge} without owning a place, living
              unhoused will steadily reduce your Health and Happiness each year.
            </p>
          </>
        )}

        {noticeKind === 'age20_final_warning' && (
          <p className="text-xs font-bold leading-relaxed text-slate-700">
            You have <strong>1 year left</strong> before your parents expect you to move out at{' '}
            <strong>age {summary.moveOutDeadlineAge}</strong>. Visit{' '}
            <strong>Menu → Assets &amp; Real Estate</strong> to purchase an entry property before
            turning {summary.moveOutDeadlineAge} and avoid yearly Health and Happiness penalties.
          </p>
        )}

        {noticeKind === 'age21_moved_out' && (
          <>
            <p className="text-xs font-bold leading-relaxed text-slate-700">
              You&apos;ve reached age {character.age} without owning a home, and your parents have
              asked you to move out. Without stable housing, your <strong>Health</strong> and{' '}
              <strong>Happiness</strong> will decline each year and worsen the longer you remain
              unhoused.
            </p>
            <p className="text-xs font-bold leading-relaxed text-slate-700">
              Purchase any home in <strong>Menu → Assets &amp; Real Estate</strong> to secure
              shelter and stop future penalties.
            </p>
          </>
        )}

        <div className="rounded-2xl border-2 border-slate-900 bg-sky-50 p-3 shadow-[2px_2px_0_#0f172a] space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-700">
            <span>Current cash</span>
            <span className="font-mono font-black text-slate-950">{money(character.cash)}</span>
          </div>
          <div className="flex items-center justify-between font-bold text-slate-700">
            <span>Est. entry down payment (20%)</span>
            <span className="font-mono font-black text-slate-950">{money(entryDownPayment)}</span>
          </div>
          {cashGap > 0 ? (
            <div className="flex items-center justify-between font-bold text-amber-800 pt-1 border-t border-sky-200">
              <span>Est. additional cash needed</span>
              <span className="font-mono font-black">{money(cashGap)}</span>
            </div>
          ) : (
            <div className="text-[11px] font-black text-emerald-800 pt-1 border-t border-sky-200">
              ✓ You currently have enough cash for an entry mortgage down payment.
            </div>
          )}
          <p className="text-[10px] font-bold text-slate-500 pt-0.5">
            Estimates exclude future ongoing upkeep/mortgage payments, tax withholding, loan
            installments, and optional spending.
          </p>
        </div>
      </div>
    </Modal>
  );
};
