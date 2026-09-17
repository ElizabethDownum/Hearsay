import { dayOf, TICKS_PER_DAY } from '../../core/time';
import { counterSignals, type CounterSignal } from '../../intel/countersketch';
import type { IntelEntry } from '../../intel/entry';
import type { EnemyDecision, SketchFeature } from '../enemy/state';
import { cloneSerializable } from '../hash';
import type { WorldState } from '../types';
import { attentionAt } from './attention';
import { evidenceArrivals } from './evidence';
import { counterKnowledge, counterLogThrough, type CounterKnowledge } from './knowledge';
import { counterSketchOverlay, type OverlayDay } from './overlay';
import { sketchTimeline, type SketchNight } from './timeline';

export interface DebriefDay {
  day: number;
  through: number;
  /** Sparse dates retain gaps explicitly; no absent operation gets a synthetic day-zero event. */
  gapBefore: number;
  observedChronicleIndexes: number[];
  /** Recorded observation timestamps can be reported accounts; they do not establish knowledge at this date. */
  observationEntryIndexes: number[];
  observedEvidenceIndexes: number[];
  newlyReceivedEntryIndexes: number[];
  newlyAcquiredEvidenceIndexes: number[];
  player: { knowledge: CounterKnowledge[]; log: IntelEntry[]; signals: CounterSignal[] };
  decisions: { decisionIndex: number; decision: EnemyDecision }[];
  sketch: { known: SketchNight['known']; identified: boolean; identifiedOnDay: number | null;
    /** Distinct retained (kind, subject) groups, without applying today's roster as a historical exposure score. */
    evidenceKeys: { kind: SketchFeature['kind']; subject: string | null; featureIds: string[] }[] };
  overlay: OverlayDay;
}
export interface DebriefCalendar {
  through: number;
  days: DebriefDay[];
  unknownKnowledge: CounterKnowledge[];
  unknownEvidenceIndexes: number[];
  unrecordedSketch: ReturnType<typeof sketchTimeline>['unrecorded'];
}

/** Receipt and digest dates share a calendar while preserving original board order and unknown dates. */
export function debriefCalendar(world: WorldState): DebriefCalendar {
  const knowledge = counterKnowledge(world); const arrivals = evidenceArrivals(world);
  const timeline = sketchTimeline(world); const dates = new Set<number>();
  const addTick = (tick: number): void => {
    if (Number.isSafeInteger(tick) && tick >= 0 && tick <= world.tick) dates.add(dayOf(tick));
  };
  addTick(world.tick);
  for (const row of world.chronicle) addTick(row.tick);
  for (const row of world.intel.log) addTick(row.tick);
  for (const row of world.enemy.evidence) addTick(row.tick);
  for (const row of knowledge) if (row.learnedAt !== null) addTick(row.learnedAt);
  for (const row of arrivals) if (row.learnedAt !== null) addTick(row.learnedAt);
  for (const row of attentionAt(world, world.tick).actual) addTick(row.occurredAt);
  for (const decision of world.enemy.decisions) {
    if (Number.isSafeInteger(decision.day) && decision.day >= 0 && decision.day <= dayOf(world.tick)) dates.add(decision.day);
  }
  let previous: number | null = null;
  const days = [...dates].sort((a, b) => a - b).map((day): DebriefDay => {
    const through = Math.min(world.tick, (day + 1) * TICKS_PER_DAY - 1);
    const log = counterLogThrough(world, through);
    const known = knowledge.filter((row) => row.learnedAt !== null && row.learnedAt <= through);
    const night = timeline.nights.filter((row) => row.day <= day).at(-1);
    const keys = new Map<string, DebriefDay['sketch']['evidenceKeys'][number]>();
    for (const feature of night?.known ?? []) {
      const key = JSON.stringify([feature.kind, feature.subject]);
      const group = keys.get(key) ?? { kind: feature.kind, subject: feature.subject, featureIds: [] };
      group.featureIds.push(feature.id); keys.set(key, group);
    }
    const row: DebriefDay = { day, through, gapBefore: previous === null ? 0 : day - previous - 1,
      observedChronicleIndexes: world.chronicle.flatMap((record, index) => record.tick <= through && dayOf(record.tick) === day ? [index] : []),
      observationEntryIndexes: world.intel.log.flatMap((entry, index) => entry.tick <= through && dayOf(entry.tick) === day ? [index] : []),
      observedEvidenceIndexes: world.enemy.evidence.flatMap((entry, index) => entry.tick <= through && dayOf(entry.tick) === day ? [index] : []),
      newlyReceivedEntryIndexes: known.filter((row) => dayOf(row.learnedAt!) === day).map((row) => row.entryIndex),
      newlyAcquiredEvidenceIndexes: arrivals.filter((row) => row.learnedAt !== null && row.learnedAt <= through
        && dayOf(row.learnedAt) === day).map((row) => row.evidenceIndex),
      player: { knowledge: cloneSerializable(known), log, signals: counterSignals(log) },
      decisions: world.enemy.decisions.flatMap((decision, decisionIndex) => decision.day === day
        ? [{ decisionIndex, decision: cloneSerializable(decision) }] : []),
      sketch: { known: cloneSerializable(night?.known ?? []), identified: night?.identified ?? false,
        identifiedOnDay: night?.identifiedOnDay ?? null, evidenceKeys: [...keys.values()] }, overlay: counterSketchOverlay(world, day) };
    previous = day; return row;
  });
  return { through: world.tick, days, unknownKnowledge: cloneSerializable(knowledge.filter((row) => row.learnedAt === null)),
    unknownEvidenceIndexes: arrivals.filter((row) => row.learnedAt === null).map((row) => row.evidenceIndex),
    unrecordedSketch: cloneSerializable(timeline.unrecorded) };
}
