import type { CharacterProfile } from '../../../types/game';
import type { NpcProfile } from '../../autonomy/types';
import { selectFamilyGraph } from './familyGraphSelectors';
import type {
  IdentityFamilyGraphSummary,
  IdentityFamilyMember,
  IdentityRecordedEstateRecord,
  IdentityRecordedEstatesSummary,
  RecordedEstateShareItem,
  RecordedEstateStatus,
} from '../types';

const VALID_ESTATE_STATUSES: ReadonlySet<RecordedEstateStatus> = new Set([
  'settled',
  'insolvent',
  'escheated',
]);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseNonNegativeMoney(value: unknown): { value: number | null; invalid: boolean } {
  if (value === undefined || value === null) {
    return { value: null, invalid: false };
  }
  if (!finiteNumber(value) || value < 0) {
    return { value: null, invalid: true };
  }
  return { value, invalid: false };
}

function parseOptionalInt(value: unknown): { value: number | null; invalid: boolean } {
  if (value === undefined || value === null) {
    return { value: null, invalid: false };
  }
  if (!finiteNumber(value)) {
    return { value: null, invalid: true };
  }
  return { value: Math.trunc(value), invalid: false };
}

function formatNpcFullName(npc: NpcProfile): string | null {
  const first = nonEmptyString(npc.firstName);
  if (!first) return null;
  const last = nonEmptyString(npc.lastName);
  return last ? `${first} ${last}` : first;
}

function resolvePlayerFullName(character: CharacterProfile): string {
  const first = nonEmptyString(character.firstName) ?? 'Player';
  const last = nonEmptyString(character.lastName) ?? '';
  return last ? `${first} ${last}` : first;
}

function buildCanonicalNpcNameLookup(world: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  if (!isPlainRecord(world.npcRegistry)) return map;
  for (const rawNpc of Object.values(world.npcRegistry)) {
    if (!isPlainRecord(rawNpc)) continue;
    const id = nonEmptyString(rawNpc.id);
    if (!id) continue;
    const fullName = formatNpcFullName(rawNpc as unknown as NpcProfile);
    if (fullName) {
      map.set(id, fullName);
    }
  }
  return map;
}

/**
 * Filters recorded NPC estate settlements strictly against an internally derived
 * reconciled family graph. Never exported so callers cannot inject an unverified graph.
 */
function filterRecordedEstatesWithVerifiedGraph(
  character: CharacterProfile,
  world: Record<string, unknown>,
  familyGraph: IdentityFamilyGraphSummary
): IdentityRecordedEstatesSummary {
  const rawInheritanceRecords = world.inheritanceRecords as Record<string, unknown>;
  const verifiedMemberById = new Map<string, IdentityFamilyMember>();
  for (const member of familyGraph.allMembers) {
    // Require genuine canonical/explicit IDs; synthetic keys never match NPC inheritance records,
    // and never match by name alone.
    if (member.hasCanonicalId && !verifiedMemberById.has(member.id)) {
      verifiedMemberById.set(member.id, member);
    }
  }

  const playerId = nonEmptyString(character.id) ?? '';
  const playerFullName = resolvePlayerFullName(character);
  const canonicalNpcNames = buildCanonicalNpcNameLookup(world);

  const records: IdentityRecordedEstateRecord[] = [];
  const seenRecordIds = new Set<string>();
  let omittedRecordCount = 0;

  for (const rawRecord of Object.values(rawInheritanceRecords)) {
    if (!isPlainRecord(rawRecord)) {
      omittedRecordCount++;
      continue;
    }

    const recordId = nonEmptyString(rawRecord.id);
    const deceasedOwnerId = nonEmptyString(rawRecord.deceasedNpcId);
    const rawStatus = rawRecord.status;

    if (
      !recordId ||
      !deceasedOwnerId ||
      deceasedOwnerId === playerId ||
      typeof rawStatus !== 'string' ||
      !VALID_ESTATE_STATUSES.has(rawStatus as RecordedEstateStatus)
    ) {
      omittedRecordCount++;
      continue;
    }

    // Strict ownership verification: deceased owner ID must exist in reconciled human family graph.
    const verifiedRelative = verifiedMemberById.get(deceasedOwnerId);
    if (!verifiedRelative) {
      omittedRecordCount++;
      continue;
    }

    if (seenRecordIds.has(recordId)) {
      omittedRecordCount++;
      continue;
    }
    seenRecordIds.add(recordId);

    const settlementYearParsed = parseOptionalInt(rawRecord.settlementYear);
    const grossAssetsParsed = parseNonNegativeMoney(rawRecord.grossAssets);
    const totalLiabilitiesParsed = parseNonNegativeMoney(rawRecord.totalLiabilities);
    const liabilitiesPaidParsed = parseNonNegativeMoney(rawRecord.liabilitiesPaid);
    const unpaidLiabilitiesParsed = parseNonNegativeMoney(rawRecord.unpaidLiabilities);
    const netEstateParsed = parseNonNegativeMoney(rawRecord.netDistributableEstate);
    const escheatedAmountParsed = parseNonNegativeMoney(rawRecord.escheatedAmount);

    let hasMalformedFields =
      settlementYearParsed.invalid ||
      grossAssetsParsed.invalid ||
      totalLiabilitiesParsed.invalid ||
      liabilitiesPaidParsed.invalid ||
      unpaidLiabilitiesParsed.invalid ||
      netEstateParsed.invalid ||
      escheatedAmountParsed.invalid;

    let netDistributableEstate = netEstateParsed.value;
    if (
      netDistributableEstate === null &&
      !netEstateParsed.invalid &&
      grossAssetsParsed.value !== null &&
      liabilitiesPaidParsed.value !== null
    ) {
      netDistributableEstate = Math.max(0, grossAssetsParsed.value - liabilitiesPaidParsed.value);
    }

    const distributions: RecordedEstateShareItem[] = [];
    if (Array.isArray(rawRecord.distributions)) {
      for (const rawShare of rawRecord.distributions) {
        if (!isPlainRecord(rawShare)) {
          hasMalformedFields = true;
          continue;
        }
        const beneficiaryId = nonEmptyString(rawShare.beneficiaryId);
        if (!beneficiaryId) {
          hasMalformedFields = true;
          continue;
        }

        const isPlayer = playerId !== '' && beneficiaryId === playerId;
        const familyBeneficiary = verifiedMemberById.get(beneficiaryId);
        const beneficiaryName = isPlayer
          ? playerFullName
          : familyBeneficiary?.fullName ?? canonicalNpcNames.get(beneficiaryId) ?? null;

        const sourceAmountParsed = parseNonNegativeMoney(rawShare.amountInSourceCurrency);
        const targetAmountParsed = parseNonNegativeMoney(rawShare.amountAwardedInTargetCurrency);
        if (sourceAmountParsed.invalid || targetAmountParsed.invalid) {
          hasMalformedFields = true;
        }

        distributions.push({
          beneficiaryId,
          beneficiaryName,
          isPlayer,
          relationshipToDeceased: nonEmptyString(rawShare.relationshipToDeceased),
          sourceCurrency: nonEmptyString(rawShare.sourceCurrency),
          targetCurrency: nonEmptyString(rawShare.targetCurrency),
          amountInSourceCurrency: sourceAmountParsed.value,
          amountAwardedInTargetCurrency: targetAmountParsed.value,
        });
      }
    } else if (rawRecord.distributions !== undefined) {
      hasMalformedFields = true;
    }

    distributions.sort(
      (a, b) =>
        a.beneficiaryId.localeCompare(b.beneficiaryId) ||
        (a.relationshipToDeceased ?? '').localeCompare(b.relationshipToDeceased ?? '')
    );

    const playerDistributions = distributions.filter((share) => share.isPlayer);

    records.push({
      recordId,
      deceasedOwnerId,
      deceasedOwnerName: verifiedRelative.fullName,
      relationshipToPlayerKind: verifiedRelative.relationKind,
      relationshipToPlayerLabel: verifiedRelative.relationLabel,
      settlementYear: settlementYearParsed.value,
      currency: nonEmptyString(rawRecord.currency),
      status: rawStatus as RecordedEstateStatus,
      grossAssets: grossAssetsParsed.value,
      totalLiabilities: totalLiabilitiesParsed.value,
      liabilitiesPaid: liabilitiesPaidParsed.value,
      unpaidLiabilities: unpaidLiabilitiesParsed.value,
      netDistributableEstate,
      escheatedToState: rawRecord.escheatedToState === true,
      escheatedAmount: escheatedAmountParsed.value,
      distributions,
      playerDistributions,
      hasMalformedFields,
    });
  }

  records.sort(
    (a, b) =>
      (b.settlementYear ?? -Infinity) - (a.settlementYear ?? -Infinity) ||
      a.deceasedOwnerId.localeCompare(b.deceasedOwnerId) ||
      a.recordId.localeCompare(b.recordId)
  );

  return {
    canonicalStateAvailable: true,
    records,
    omittedRecordCount,
  };
}

export function selectRecordedFamilyEstates(
  character: CharacterProfile
): IdentityRecordedEstatesSummary {
  const world = character.worldState as unknown;
  if (
    !isPlainRecord(world) ||
    world.schemaVersion !== 2 ||
    !isPlainRecord(world.inheritanceRecords)
  ) {
    return {
      canonicalStateAvailable: false,
      records: [],
      omittedRecordCount: 0,
    };
  }

  const verifiedFamilyGraph = selectFamilyGraph(character);
  return filterRecordedEstatesWithVerifiedGraph(character, world, verifiedFamilyGraph);
}
