import React, { useEffect } from 'react';
import { Briefcase, GraduationCap, Heart, History, Skull, User } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { CartoonButton } from '../../../components/ui/CartoonButton';
import { Modal } from '../../../components/ui/Modal';
import type { IdentityFamilyMember } from '../types';
import {
  formatFamilySourceLabel,
  formatGenderLabel,
  formatSchoolStageLabel,
} from './identityDisplay';

interface FamilyMemberDetailModalProps {
  isOpen: boolean;
  member: IdentityFamilyMember | null;
  onClose: () => void;
}

export const FamilyMemberDetailModal: React.FC<FamilyMemberDetailModalProps> = ({
  isOpen,
  member,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!member) return null;

  const statusBadge = member.isAlive ? (
    <Badge variant="emerald" size="xs">
      Living
    </Badge>
  ) : (
    <Badge variant="slate" size="xs" icon={<Skull className="w-3 h-3" />}>
      Deceased
    </Badge>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member.fullName}
      icon={<User className="w-4 h-4 stroke-[2.5] text-slate-950" />}
      maxWidth="sm"
      actions={
        <CartoonButton variant="white" size="md" fullWidth onClick={onClose}>
          Close
        </CartoonButton>
      }
    >
      <div className="flex flex-col gap-3 text-slate-900">
        {/* Relationship & Vital Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="amber" size="xs" wrap>
            {member.relationLabel}
          </Badge>
          {statusBadge}
          {member.lineageRelation !== 'none' && member.lineageRelation !== 'biological' && (
            <Badge variant="purple" size="xs">
              {member.lineageRelation === 'adoptive'
                ? 'Adoptive'
                : member.lineageRelation === 'step'
                  ? 'Step'
                  : 'In-Law'}
            </Badge>
          )}
          <Badge variant="sky" size="xs">
            {formatFamilySourceLabel(member.source)}
          </Badge>
        </div>

        {/* Vital Profile */}
        <div className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3 shadow-[2px_2px_0_#0f172a] space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Biographical Summary
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-500">Age</div>
              <div className="font-black text-slate-900">
                {member.age !== null ? `Age ${member.age}` : 'Unavailable'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500">Gender</div>
              <div className="font-black text-slate-900">{formatGenderLabel(member.gender)}</div>
            </div>
            {member.birthYear !== null && (
              <div>
                <div className="text-[10px] font-bold text-slate-500">Birth Year</div>
                <div className="font-black text-slate-900 font-mono">{member.birthYear}</div>
              </div>
            )}
            {member.occupation && (
              <div className="col-span-2">
                <div className="text-[10px] font-bold text-slate-500">Occupation</div>
                <div className="font-black text-slate-900 break-words">{member.occupation}</div>
              </div>
            )}
            {!member.isAlive && (
              <div className="col-span-2 pt-1 border-t border-slate-200 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wide text-rose-800">
                  Death Record
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Year: {member.deathYear !== null ? member.deathYear : 'Not recorded'}
                </div>
                {member.causeOfDeath && (
                  <div className="text-xs font-bold text-slate-700 break-words">
                    Cause: {member.causeOfDeath}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Marital / Relationship Details */}
        {member.maritalDetails && (
          <div className="rounded-2xl border-2 border-slate-900 bg-rose-50/70 p-3 shadow-[2px_2px_0_#0f172a] space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-900">
              <Heart className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Relationship Details</span>
            </div>
            <div className="text-xs font-bold text-slate-800 space-y-0.5">
              {member.maritalDetails.romanticStage && (
                <div>Stage: {member.maritalDetails.romanticStage}</div>
              )}
              {member.maritalDetails.yearsTogether !== null && (
                <div>Years together: {member.maritalDetails.yearsTogether}</div>
              )}
              {member.maritalDetails.hasPrenup !== null && (
                <div>Prenup: {member.maritalDetails.hasPrenup ? 'Signed' : 'None'}</div>
              )}
              {member.maritalDetails.weddingVenue && (
                <div className="break-words">Venue: {member.maritalDetails.weddingVenue}</div>
              )}
            </div>
          </div>
        )}

        {/* Education */}
        <div className="rounded-2xl border-2 border-slate-900 bg-sky-50/60 p-3 shadow-[2px_2px_0_#0f172a] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-900">
            <GraduationCap className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Education</span>
          </div>
          {member.education ? (
            <div className="text-xs font-bold text-slate-800 space-y-0.5">
              <div>Stage: {formatSchoolStageLabel(member.education.currentStage)}</div>
              {member.education.degreeEarned && (
                <div className="break-words">Degree: {member.education.degreeEarned}</div>
              )}
              {member.education.fieldOfStudy && (
                <div className="break-words">Field: {member.education.fieldOfStudy}</div>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-500">No recorded education details.</p>
          )}
        </div>

        {/* Career */}
        <div className="rounded-2xl border-2 border-slate-900 bg-emerald-50/60 p-3 shadow-[2px_2px_0_#0f172a] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-900">
            <Briefcase className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Career</span>
          </div>
          {member.career ? (
            <div className="text-xs font-bold text-slate-800 space-y-0.5">
              {member.career.title && (
                <div className="break-words">Role: {member.career.title}</div>
              )}
              {member.career.companyName && (
                <div className="break-words">Organization: {member.career.companyName}</div>
              )}
              {member.career.occupation && !member.career.title && (
                <div className="break-words">Occupation: {member.career.occupation}</div>
              )}
              {member.career.isRetired && (
                <Badge variant="amber" size="xs">
                  Retired
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-500">No recorded career details.</p>
          )}
        </div>

        {/* Life-History Highlights */}
        <div className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[2px_2px_0_#0f172a] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
            <History className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Recorded Life History</span>
          </div>
          {member.lifeHistoryHighlights.length > 0 ? (
            <ul className="space-y-1.5">
              {member.lifeHistoryHighlights.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500">
                    <span>{item.title}</span>
                    <span className="font-mono shrink-0">
                      Age {item.age} • {item.year}
                    </span>
                  </div>
                  <p className="font-bold text-slate-700 mt-0.5 break-words">{item.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs font-bold text-slate-500">
              No recorded life-history highlights available.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
