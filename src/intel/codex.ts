import type { EntityId, FieldChange, RumorId } from '../sim/rumors/claim';
import type { TraitId } from '../sim/rumors/traits';
import type { Rules } from '../sim/rules';
import type { ReportedClaim } from '../sim/enemy/state';
import type { CodexHypothesis, IntelEntry } from './entry';
import { diffReported } from './board';

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

/**
 * The Obra Dinn trick, mechanically: fold over claimful utterances, and for every telling BY an
 * npc pair it with the LATEST telling ADDRESSED TO that same npc before it in the same family
 * (they demonstrably received that version, then emitted this one). One pair per tell — no
 * combinatorial double-count. Pairs whose reported content is byte-identical (empty changes) are
 * dropped: a faithful retell is evidence of no trait. Reads ONLY the log — never world/beliefs/
 * ground-truth — so the deduction stands on what the player observed, nothing they couldn't have.
 */
function observedPairs(
  log: readonly IntelEntry[], npcFilter: EntityId | null, familyFilter: RumorId | null,
): ObservedPair[] {
  const pairs: ObservedPair[] = [];
  log.forEach((tell, toldIndex) => {
    if (!isClaimful(tell) || tell.speaker === null) return;
    const npc = tell.speaker;
    if (npcFilter !== null && npc !== npcFilter) return;
    if (familyFilter !== null && tell.family !== familyFilter) return;

    // Latest addressed-receive strictly before this tell, same family, addressed to this npc.
    let receivedIndex = -1;
    let before: ReportedClaim | null = null;
    for (let j = toldIndex - 1; j >= 0; j--) {
      const rec = log[j]!;
      if (isClaimful(rec) && rec.family === tell.family && rec.addressedTo === npc) {
        receivedIndex = j;
        before = rec.reported;
        break;
      }
    }
    if (before === null) return;

    const changes = diffReported(before, tell.reported);
    if (changes.length === 0) return;   // an empty-diff pair corroborates nothing
    pairs.push({ family: tell.family, npc, receivedIndex, toldIndex, before, changes });
  });
  return pairs;
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
