import React, { useMemo } from 'react'
import type { CharacterProfile, ChildProfile, PersonProfile, StatEffects } from '../../../types/game'
import type { EventChoice, LifeEventTemplate } from '../types'
import {
  formatEventText,
  findContextualChild,
  findContextualPeer,
  isChildTargetedEvent,
  type ChildDeltaApplied,
} from '../services/eventService'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import { StatDeltaChips } from '../../../components/ui/StatDeltaChips'

export interface EventResult {
  choice: EventChoice;
  message: string;
  applied: StatEffects;
  personIntroduced?: PersonProfile;
  childDeltaApplied?: ChildDeltaApplied;
}

interface EventModalProps {
  event: LifeEventTemplate | null;
  character: CharacterProfile;
  /** Living child bound to this event when rolled for children interaction. */
  boundChild?: ChildProfile;
  /** 1-based position within the current year's event queue. */
  eventIndex?: number;
  /** Total number of interactive events rolled for this year. */
  eventTotal?: number;
  /** True when another valid interactive event follows in this year's queue. */
  hasMoreEvents?: boolean;
  /** When set, the modal shows the outcome instead of the choices. */
  result: EventResult | null;
  onChoose: (choice: EventChoice, boundPerson?: PersonProfile, boundChild?: ChildProfile) => void;
  onContinue: () => void;
}

/**
 * Two-step event popup:
 * 1. Describe the situation and offer choices.
 * 2. Show what happened and how stats changed.
 */
export const EventModal: React.FC<EventModalProps> = ({
  event,
  character,
  boundChild,
  eventIndex,
  eventTotal,
  hasMoreEvents,
  result,
  onChoose,
  onContinue,
}) => {
  const isChildEvent = event ? isChildTargetedEvent(event) : false;

  const effectiveBoundChild = useMemo(() => {
    if (!event || !isChildEvent) return undefined;
    return findContextualChild(character, event, boundChild?.id) ?? boundChild;
  }, [event, isChildEvent, character, boundChild]);

  const boundPerson = useMemo(() => {
    if (!event || isChildEvent) return undefined;
    if (event.category === 'career' || event.requiresEmployed || event.requiredCareerField) {
      return findContextualPeer(character, 'coworker');
    }
    return findContextualPeer(character, 'classmate');
  }, [event, isChildEvent, character]);

  if (!event) return null;

  const showNextButton = hasMoreEvents ?? Boolean(eventIndex && eventTotal && eventIndex < eventTotal);

  const actions = result ? (
    <CartoonButton variant="emerald" size="md" fullWidth onClick={onContinue}>
      {showNextButton ? 'Next' : 'Continue'}
    </CartoonButton>
  ) : (
    event.choices.map((choice) => (
      <CartoonButton
        key={choice.id}
        variant="white"
        size="md"
        fullWidth
        icon={<span className="text-base leading-none">{choice.icon}</span>}
        onClick={() => onChoose(choice, boundPerson, effectiveBoundChild)}
      >
        {formatEventText(choice.label, character, boundPerson, effectiveBoundChild)}
      </CartoonButton>
    ))
  );

  const childApplied = result?.childDeltaApplied;
  const childChips: Array<{ label: string; value: number }> = [];
  if (childApplied) {
    if (childApplied.relationship) childChips.push({ label: `${childApplied.childFirstName} Bond`, value: childApplied.relationship });
    if (childApplied.happiness) childChips.push({ label: `${childApplied.childFirstName} Happy`, value: childApplied.happiness });
    if (childApplied.smarts) childChips.push({ label: `${childApplied.childFirstName} Smarts`, value: childApplied.smarts });
    if (childApplied.health) childChips.push({ label: `${childApplied.childFirstName} Health`, value: childApplied.health });
    if (childApplied.looks) childChips.push({ label: `${childApplied.childFirstName} Looks`, value: childApplied.looks });
  }
  const hasParentDeltas = Boolean(result && Object.values(result.applied).some(Boolean));

  return (
    <Modal
      isOpen
      title={formatEventText(event.title, character, boundPerson, effectiveBoundChild)}
      icon={event.icon}
      actions={actions}
    >
      {(result || (eventTotal && eventTotal > 1 && eventIndex)) && (
        <div className="flex items-center justify-between -mt-1">
          {result ? (
            <Badge variant="emerald" size="xs">
              Outcome
            </Badge>
          ) : (
            <span />
          )}
          {eventTotal && eventTotal > 1 && eventIndex && (
            <Badge variant="amber" size="xs">
              Event {eventIndex} of {eventTotal}
            </Badge>
          )}
        </div>
      )}
      {result ? (
        <>
          <Badge
            variant="sky"
            size="xs"
            wrap
            icon={<span>{result.choice.icon}</span>}
            className="py-1 px-2.5 rounded-xl text-left leading-snug"
          >
            {formatEventText(result.choice.label, character, boundPerson, effectiveBoundChild)}
          </Badge>
          <p className="text-slate-800 leading-relaxed">{result.message}</p>
          {result.personIntroduced && (
            <div className="rounded-xl border-2 border-slate-900 bg-pink-50 p-2.5 flex items-center justify-between shadow-[1.5px_2px_0_#0f172a]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {result.personIntroduced.avatarEmoji || '👤'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {result.personIntroduced.firstName} {result.personIntroduced.lastName}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">
                    {result.personIntroduced.role}
                  </p>
                </div>
              </div>
              <Badge variant="purple" size="xs">
                Relationship: {result.personIntroduced.relationship}%
              </Badge>
            </div>
          )}
          {(hasParentDeltas || childChips.length === 0) && (
            <StatDeltaChips effects={result.applied} />
          )}
          {childChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {childChips.map((chip) => {
                const positive = chip.value > 0;
                return (
                  <span
                    key={chip.label}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl border-2 border-slate-900 text-[11px] font-black shadow-[1px_1.5px_0_#0f172a] ${
                      positive ? 'bg-sky-100 text-sky-900' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <span>👶</span>
                    <span>{chip.label}</span>
                    <span className="font-mono">{positive ? `+${chip.value}` : chip.value}</span>
                  </span>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-slate-800 leading-relaxed">
            {formatEventText(event.description, character, boundPerson, effectiveBoundChild)}
          </p>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            What will you do?
          </p>
        </>
      )}
    </Modal>
  );
};

