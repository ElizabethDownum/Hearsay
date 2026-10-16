import type { EntityId, FieldChange, RumorId } from '../sim/rumors/claim';
import type { TraitId } from '../sim/rumors/traits';
import type { Rules } from '../sim/rules';
import type { ReportedClaim } from '../sim/enemy/state';
import type { CodexHypothesis, IntelEntry } from './entry';
import { diffReported } from './board';
import { isMagic } from './provenance';

/** One observed corroboration: the npc was addressed a version, then emitted a differing one. */
export interface CorroborationHit {
  family: RumorId;
  receivedIndex: number;
  toldIndex: number;
  changes: FieldChange[];
}

/** A claimful utterance: the only row corroboration reads (askings/presence carry no claim). */
function isClaimful(e: IntelEntry): e is IntelEntry & { family: RumorId; reported: ReportedClaim } {
  return e.kind === 'utterance' && e.family !== null && e.reported !== null;
}

/** An observed receive→emit pair for one npc, with the field diff the trait glossary reads. */
interface ObservedPair {
  family: RumorId;
  npc: EntityId;
  receivedIndex: number;
  toldIndex: number;
  before: ReportedClaim;
  changes: FieldChange[];
}

function physicalTellingKey(e: IntelEntry): string {
  return JSON.stringify([e.tick, e.venue, e.speaker, e.addressedTo, e.family, e.claimId, e.mode]);
}

/**
 * The Obra Dinn trick, mechanically: fold over claimful utterances, and for every telling BY an
 * npc pair it with the LATEST telling ADDRESSED TO that same npc before it IN TIME in the same
 * family (they demonstrably received that version, then emitted this one). One pair per tell — no
 * combinatorial double-count. Pairs whose reported content is byte-identical (empty changes) are
 * dropped: a faithful retell is evidence of no trait. Reads ONLY the log — never world/beliefs/
 * ground-truth — so the deduction stands on what the player observed, nothing they couldn't have.
 *
 * "Before" is the observation tick, not the array position (R47, Astra I11): an informant's report
 * appends OLDER observations after NEWER ones the avatar heard directly, so array order would make a
 * later reception the cause of an earlier telling and corroborate a trait the npc never showed.
 * Within one tick the beat is a single moment and the log's order within it is the only order there
 * is, so a receive logged before the tell at the same tick still pairs. Indexes stay the log's own.
 */
function observedPairs(
  log: readonly IntelEntry[], npcFilter: EntityId | null, familyFilter: RumorId | null,
): ObservedPair[] {
  const pairs: ObservedPair[] = [];
  log.forEach((tell, toldIndex) => {
    if (!isClaimful(tell) || tell.speaker === null || (isMagic(tell) && tell.addressedTo === null)) return;
    const npc = tell.speaker;
    if (npcFilter !== null && npc !== npcFilter) return;
    if (familyFilter !== null && tell.family !== familyFilter) return;

    // Latest addressed-receive before this tell by tick (ties: earlier in the log, strictly before
    // the tell's own row), same family, addressed to this npc.
    let receivedIndex = -1;
    let before: ReportedClaim | null = null;
    log.forEach((rec, j) => {
      if (!isClaimful(rec) || rec.family !== tell.family || rec.addressedTo !== npc) return;
      if (isMagic(rec) && rec.speaker === null) return;
      if (rec.tick > tell.tick || (rec.tick === tell.tick && j >= toldIndex)) return;
      if (receivedIndex !== -1) {
        const current = log[receivedIndex]!;
        if (rec.tick < current.tick || (rec.tick === current.tick && j < receivedIndex)) return;
      }
      receivedIndex = j;
      before = rec.reported;
    });
    if (before === null) return;

    const changes = diffReported(before, tell.reported);
    if (changes.length === 0) return;   // an empty-diff pair corroborates nothing
    pairs.push({ family: tell.family, npc, receivedIndex, toldIndex, before, changes });
  });
  const magicTellings = new Set(log.filter((e) => isClaimful(e) && isMagic(e)).map(physicalTellingKey));
  if (magicTellings.size === 0) return pairs;
  const counted = new Set<string>();
  return pairs.filter((pair) => {
    const key = physicalTellingKey(log[pair.toldIndex]!);
    if (!magicTellings.has(key)) return true;
    if (counted.has(key)) return false;
    counted.add(key);
    return true;
  });
}

/**
 * How many observed receive→emit pairs for `npcId` bear `traitId`'s fingerprint. Overlap is
 * intended: an ambiguous pair (a count-null exaggeration reads as partisan sharpening) counts for
 * every trait it matches — discriminating observations are what converge the lock.
 */
export function corroborations(
  log: readonly IntelEntry[], npcId: EntityId, traitId: TraitId, rules: Rules,
): CorroborationHit[] {
  const def = rules.traits[traitId];
  if (!def) return [];
  return observedPairs(log, npcId, null)
    .filter((p) => def.fingerprint(p.before, p.changes))
    .map((p) => ({ family: p.family, receivedIndex: p.receivedIndex, toldIndex: p.toldIndex, changes: p.changes }));
}

/** Each hypothesis with its corroboration count and lock state (locked = three confirms). */
export function codexStatus(
  log: readonly IntelEntry[], codex: readonly CodexHypothesis[], rules: Rules,
): { npc: EntityId; trait: TraitId; hits: number; locked: boolean }[] {
  return codex.map((h) => {
    const hits = corroborations(log, h.npc, h.trait, rules).length;
    return { npc: h.npc, trait: h.trait, hits, locked: hits >= 3 };
  });
}

/** Every trait with at least one matching receive→emit pair in the family, id-sorted. */
export function suggestTraits(log: readonly IntelEntry[], family: RumorId, rules: Rules): TraitId[] {
  const pairs = observedPairs(log, null, family);
  const matched = new Set<TraitId>();
  for (const [traitId, def] of Object.entries(rules.traits)) {
    if (pairs.some((p) => def.fingerprint(p.before, p.changes))) matched.add(traitId);
  }
  return [...matched].sort();
}
