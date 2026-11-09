import React, { useMemo } from 'react'
import type { CharacterProfile, PersonProfile, StatEffects } from '../../../types/game'
import type { EventChoice, LifeEventTemplate } from '../types'
import { formatEventText, findContextualPeer } from '../services/eventService'
import { Modal } from '../../../components/ui/Modal'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { Badge } from '../../../components/ui/Badge'
import { StatDeltaChips } from '../../../components/ui/StatDeltaChips'

export interface EventResult {
  choice: EventChoice;
  message: string;
  applied: StatEffects;
  personIntroduced?: PersonProfile;
}

interface EventModalProps {
  event: LifeEventTemplate | null;
  character: CharacterProfile;
  /** When set, the modal shows the outcome instead of the choices. */
  result: EventResult | null;
  onChoose: (choice: EventChoice, boundPerson?: PersonProfile) => void;
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
  result,
  onChoose,
  onContinue,
}) => {
  const boundPerson = useMemo(() => {
    if (!event) return undefined;
    if (event.category === 'career' || event.requiresEmployed || event.requiredCareerField) {
      return findContextualPeer(character, 'coworker');
    }
    return findContextualPeer(character, 'classmate');
  }, [event, character]);

  if (!event) return null;

  const actions = result ? (
    <CartoonButton variant="emerald" size="md" fullWidth onClick={onContinue}>
      Continue
    </CartoonButton>
  ) : (
    event.choices.map((choice) => (
      <CartoonButton
        key={choice.id}
        variant="white"
        size="md"
        fullWidth
        icon={<span className="text-base leading-none">{choice.icon}</span>}
        onClick={() => onChoose(choice, boundPerson)}
      >
        {formatEventText(choice.label, character, boundPerson)}
      </CartoonButton>
    ))
  );

  return (
    <Modal
      isOpen
      title={formatEventText(event.title, character, boundPerson)}
      icon={event.icon}
      actions={actions}
    >
      {result ? (
        <>
          <Badge
            variant="sky"
            size="xs"
            wrap
            icon={<span>{result.choice.icon}</span>}
            className="py-1 px-2.5 rounded-xl text-left leading-snug"
          >
            {formatEventText(result.choice.label, character, boundPerson)}
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
          <StatDeltaChips effects={result.applied} />
        </>
      ) : (
        <>
          <p className="text-slate-800 leading-relaxed">
            {formatEventText(event.description, character, boundPerson)}
          </p>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            What will you do?
          </p>
        </>
      )}
    </Modal>
  );
};

