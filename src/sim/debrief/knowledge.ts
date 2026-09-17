import type { Tick } from '../../core/time';
import type { IntelEntry } from '../../intel/entry';
import { sourceOf } from '../../intel/provenance';
import type { ReportedFieldObservation } from '../directives/types';
import { cloneSerializable, stableStringify } from '../hash';
import type { WorldState } from '../types';

/** When a specific recorded board row actually reached the player. */
export interface CounterKnowledge {
  entryIndex: number;
  learnedAt: Tick | null;
  messageId: string | null;
  /** An unknown receipt remains visible at the terminal, but never backdates into a calendar. */
  timing: 'direct' | 'report' | 'unrecorded';
}

type CounterEntry = Pick<IntelEntry, 'kind' | 'tick' | 'venue' | 'via' | 'overheard'
  | 'speaker' | 'addressedTo' | 'mode' | 'authority' | 'claimId' | 'family'
  | 'reported' | 'about' | 'actor'>;

function key(row: CounterEntry): string {
  return stableStringify([row.kind, row.tick, row.venue, row.via, row.overheard,
    row.speaker, row.addressedTo, row.mode, row.authority, row.claimId, row.family,
    row.reported, row.about, row.actor]);
}

/** Exact counter-relevant part of ingestPlayerItem's existing projection. No trait reapplication. */
function reportedKey(observation: ReportedFieldObservation, via: string): string | null {
  const base = { tick: observation.observedAt, venue: observation.venue, via,
    overheard: true, speaker: null, addressedTo: null, mode: null, authority: false,
    claimId: null, family: null, reported: null, about: null, actor: null };
  if (observation.kind === 'utterance') return key({ ...base, kind: 'utterance',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    mode: observation.mode, claimId: observation.claimId, family: observation.family,
    reported: observation.reported });
  if (observation.kind === 'asking') return key({ ...base, kind: 'asking',
    overheard: observation.overheard, speaker: observation.speaker, addressedTo: observation.addressedTo,
    authority: observation.authority, about: observation.about,
    family: 'family' in observation.about ? observation.about.family : null });
  if (observation.kind === 'presence') {
    // ingestPlayerItem writes 'scene-presence' for a witnessed (night-visit) item; that row kind
    // is never dated here, so a witnessed item must not mint an ordinary presence receipt.
    if (observation.witness !== undefined) return null;
    return key({ ...base, kind: 'presence', actor: observation.actor });
  }
  return null;
}

/**
 * Reconstruct board arrival times from the speeches the avatar actually heard, including
 * overheard reports and their own transmissions. A report need not have finished its route.
 * Repeated identical rows consume repeated receipt occurrences, preserving multiplicity.
 * This associates equivalent board rows with receipt dates, not hidden causal root identities.
 * Task 5A's explicit roots, separately, identify per-item mutation paths.
 */
export function counterKnowledge(world: WorldState): CounterKnowledge[] {
  const receipts = new Map<string, { tick: Tick; messageId: string }[]>();
  const avatar = world.playerId;
  if (avatar !== null) for (const row of world.chronicle) {
    if (row.kind !== 'network-speech' || row.spoken.kind !== 'field-report') continue;
    if (row.speaker !== avatar && !row.heardBy.some((hearer) => hearer.id === avatar)) continue;
    for (const item of row.spoken.items) {
      const fingerprint = reportedKey(item.observation, row.speaker);
      if (fingerprint === null) continue;
      const list = receipts.get(fingerprint) ?? [];
      list.push({ tick: row.tick, messageId: row.messageId });
      receipts.set(fingerprint, list);
    }
  }
  const consumed = new Map<string, number>();
  const knowledge: CounterKnowledge[] = [];
  world.intel.log.forEach((entry, entryIndex) => {
    if (entry.kind !== 'utterance' && entry.kind !== 'asking' && entry.kind !== 'presence') return;
    if (sourceOf(entry).kind !== 'informant') {
      knowledge.push({ entryIndex, learnedAt: entry.tick, messageId: null, timing: 'direct' });
      return;
    }
    const fingerprint = key(entry);
    const offset = consumed.get(fingerprint) ?? 0;
    const receipt = receipts.get(fingerprint)?.[offset];
    if (receipt === undefined) {
      knowledge.push({ entryIndex, learnedAt: null, messageId: null, timing: 'unrecorded' });
      return;
    }
    consumed.set(fingerprint, offset + 1);
    knowledge.push({ entryIndex, learnedAt: receipt.tick, messageId: receipt.messageId, timing: 'report' });
  });
  return knowledge;
}

/** Retain the real board's append order; counterSignals depends on earlier askings. */
export function counterLogThrough(world: WorldState, through: Tick): IntelEntry[] {
  const knowledge = counterKnowledge(world);
  return knowledge.filter((row) => row.learnedAt !== null && row.learnedAt <= through)
    .map((row) => cloneSerializable(world.intel.log[row.entryIndex]!));
}
