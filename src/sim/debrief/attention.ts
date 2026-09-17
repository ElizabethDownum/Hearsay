import { dayOf, minuteOfDay } from '../../core/time';
import { counterSignals, type CounterSignal } from '../../intel/countersketch';
import type { IntelEntry } from '../../intel/entry';
import { applicationOf, type DirectiveRecord } from '../directives/types';
import { WATCH } from '../enemy/state';
import { cloneSerializable, stableStringify } from '../hash';
import type { AskingRecord, TellingRecord, WorldState } from '../types';
import { counterKnowledge } from './knowledge';

export interface AttentionMatch {
  id: string;
  kind: CounterSignal['kind'];
  key: string;
  /** Original world.intel.log indexes, not positions in a filtered temporary log. */
  entryIndexes: number[];
  matchedEntryIndexes: number[];
  unmatchedEntryIndexes: number[];
  attentionIds: string[];
  /** An authored instruction is retained separately; it does not prove work. */
  issuedDirectiveIds: string[];
  missingWorkHistoryIds: string[];
}
export interface ActualAttention {
  id: string;
  kind: CounterSignal['kind'];
  actor: string;
  venue: string;
  occurredAt: number;
  chronicleIndexes: number[];
  directiveIds: string[];
}
type Act = ActualAttention & { asking?: AskingRecord; answer?: TellingRecord; workedDay?: number };

function actualAttention(world: WorldState, through: number): Act[] {
  const acts = new Map<string, Act>();
  world.chronicle.forEach((row, index) => {
    if (row.tick > through) return;
    if (row.kind === 'asking' && row.authority) {
      const id = 'asking:' + index;
      acts.set(id, { id, kind: 'questioning', actor: row.speaker, venue: row.venue,
        occurredAt: row.tick, chronicleIndexes: [index], directiveIds: [], asking: row });
    }
    if (row.kind !== 'telling' || row.mode !== 'answer'
      || world.venues[row.venue]?.access !== 'invitational') return;
    // The live engine compels only at invitational venues and answers in the same beat. Earlier authority by
    // this actor alone is the player's inference, not proof this answer was compelled.
    const askingIndex = world.chronicle.findIndex((candidate) => candidate.kind === 'asking'
      && candidate.authority && candidate.tick === row.tick && candidate.venue === row.venue
      && candidate.speaker === row.addressedTo && candidate.addressedTo === row.speaker);
    if (askingIndex < 0) return;
    const id = 'answer:' + index;
    acts.set(id, { id, kind: 'compelled-answer', actor: row.addressedTo, venue: row.venue,
      occurredAt: row.tick, chronicleIndexes: [askingIndex, index], directiveIds: [], answer: row });
  });
  for (const record of world.network.directiveState?.records ?? []) {
    if (record.principal !== 'enemy') continue;
    for (const outcome of record.outcomes ?? []) {
      const work = outcome.result.enemyAction;
      if (outcome.tick > through || !work || work.kind !== 'watch-worked'
        || work.workedDay === null || work.occurredAt > through) continue;
      // One guard physically staffing one post on one night is one episode, even
      // if several retained orders/results refer to it. Preserve all owning ids.
      const id = 'watch:' + stableStringify([work.guard, work.venue, work.workedDay]);
      const act = acts.get(id) ?? { id, kind: 'watch', actor: work.guard, venue: work.venue,
        occurredAt: work.occurredAt, chronicleIndexes: [], directiveIds: [], workedDay: work.workedDay };
      act.occurredAt = Math.min(act.occurredAt, work.occurredAt);
      if (!act.directiveIds.includes(record.id)) act.directiveIds.push(record.id);
      acts.set(id, act);
    }
  }
  return [...acts.values()].sort((a, b) => a.occurredAt - b.occurredAt || a.id.localeCompare(b.id));
}

function matches(entry: IntelEntry, act: Act): boolean {
  if (entry.venue !== act.venue) return false;
  if (act.kind === 'questioning' && entry.kind === 'asking' && act.asking) {
    return entry.tick === act.occurredAt && entry.speaker === act.asking.speaker
      && entry.addressedTo === act.asking.addressedTo
      && stableStringify(entry.about) === stableStringify(act.asking.about);
  }
  if (act.kind === 'compelled-answer' && entry.kind === 'utterance' && act.answer) {
    return entry.mode === 'answer' && entry.tick === act.occurredAt
      && entry.speaker === act.answer.speaker && entry.addressedTo === act.answer.addressedTo
      && entry.claimId === act.answer.claimId;
  }
  // A match says this was a real work episode that night. It does not assert that
  // every minute was staffed, or that the reported presence tick itself was true.
  return act.kind === 'watch' && entry.kind === 'presence' && entry.actor === act.actor
    && dayOf(entry.tick) === act.workedDay && minuteOfDay(entry.tick) >= WATCH.from
    && minuteOfDay(entry.tick) < WATCH.to;
}

function relatedOrder(entry: IntelEntry, record: DirectiveRecord): boolean {
  const brief = record.authored.brief;
  if (record.principal !== 'enemy' || record.issuedAt > entry.tick
    || entry.tick < brief.active.from || entry.tick > brief.active.until) return false;
  const application = applicationOf(brief);
  if (entry.kind === 'presence') return application.kind === 'enemy-watch'
    && application.post.guard === entry.actor && application.post.venue === entry.venue;
  if (entry.kind === 'asking') return (application.kind === 'enemy-inquiry'
    || application.kind === 'enemy-interrogation') && record.recipient === entry.speaker
    && stableStringify(application.about) === stableStringify(entry.about);
  return entry.kind === 'utterance' && entry.mode === 'answer'
    && application.kind === 'enemy-interrogation'
    && record.recipient === entry.addressedTo && application.target === entry.speaker;
}

/**
 * Partial semantic overlay: real issued/performed attention, independent of whether
 * any sketch feature resulted. Feature/evidence causality is a subsequent fold.
 * Unknown receipt times stay outside the calendar; original append order drives
 * the unchanged counterSignals model. No hypotheses/cards are graded.
 */
export function attentionAt(world: WorldState, through: number): {
  signals: AttentionMatch[]; actual: ActualAttention[]; unseenAttentionIds: string[];
  unknownArrivalEntryIndexes: number[];
} {
  const calendar = counterKnowledge(world);
  const indexes = calendar.filter((row) => row.learnedAt !== null && row.learnedAt <= through)
    .map((row) => row.entryIndex);
  const log = indexes.map((index) => world.intel.log[index]!);
  const acts = actualAttention(world, through);
  const signals = counterSignals(log).map((signal): AttentionMatch => {
    const matched: number[] = []; const unmatched: number[] = [];
    const attentionIds = new Set<string>(); const issued = new Set<string>(); const missing = new Set<string>();
    const entryIndexes = signal.entryIndexes.map((index) => indexes[index]!);
    for (const entryIndex of entryIndexes) {
      const entry = world.intel.log[entryIndex]!;
      const found = acts.filter((act) => act.kind === signal.kind && matches(entry, act));
      (found.length > 0 ? matched : unmatched).push(entryIndex);
      for (const act of found) attentionIds.add(act.id);
      for (const record of world.network.directiveState?.records ?? []) {
        if (!relatedOrder(entry, record)) continue;
        issued.add(record.id);
        if (signal.kind === 'watch' && record.received !== null && record.outcomes === undefined) missing.add(record.id);
      }
    }
    return { id: stableStringify([signal.kind, signal.key]), kind: signal.kind, key: signal.key,
      entryIndexes, matchedEntryIndexes: matched, unmatchedEntryIndexes: unmatched,
      attentionIds: [...attentionIds].sort(), issuedDirectiveIds: [...issued].sort(), missingWorkHistoryIds: [...missing].sort() };
  });
  const seen = new Set(signals.flatMap((signal) => signal.attentionIds));
  return { signals, actual: acts.map((act) => ({ id: act.id, kind: act.kind, actor: act.actor,
    venue: act.venue, occurredAt: act.occurredAt, chronicleIndexes: [...act.chronicleIndexes],
    directiveIds: [...act.directiveIds].sort() })),
  unseenAttentionIds: acts.filter((act) => !seen.has(act.id)).map((act) => act.id),
  unknownArrivalEntryIndexes: cloneSerializable(calendar.filter((row) => row.learnedAt === null).map((row) => row.entryIndex)) };
}
