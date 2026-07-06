import { dayOf, type Tick } from '../core/time';
import type { RumorId } from '../sim/rumors/claim';
import type { IntelEntry } from './entry';

export interface EveningReport {
  day: number;
  newFamilies: RumorId[];                 // first-heard-today stories
  entriesByVia: Record<string, number[]>; // via → entry indexes captured today
  authoritySightings: number[];           // authority askings + watch-presence entries today
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** A claimful utterance: the only row kind that establishes a rumor family as "heard". */
function isClaimful(e: IntelEntry): e is IntelEntry & { family: RumorId } {
  return e.kind === 'utterance' && e.family !== null && e.reported !== null;
}

/**
 * The evening rumor report: what's new today, who brought word (grouped by channel), and every
 * authority-flagged asking or watch-presence sighting captured today. Day-scoped by tick — a
 * family only counts as "new" the day its FIRST claimful hearing (log-wide, not just today) falls.
 */
export function eveningReport(log: readonly IntelEntry[], day: number): EveningReport {
  const firstTick = new Map<RumorId, Tick>();
  log.forEach((e) => {
    if (!isClaimful(e)) return;
    const seen = firstTick.get(e.family);
    if (seen === undefined || e.tick < seen) firstTick.set(e.family, e.tick);
  });
  const newFamilies = [...firstTick.entries()]
    .filter(([, tick]) => dayOf(tick) === day)
    .map(([family]) => family)
    .sort(byId);

  const entriesByViaMap = new Map<string, number[]>();
  const authoritySightings: number[] = [];
  log.forEach((e, i) => {
    if (dayOf(e.tick) !== day) return;
    const bucket = entriesByViaMap.get(e.via);
    if (bucket) bucket.push(i);
    else entriesByViaMap.set(e.via, [i]);
    if ((e.kind === 'asking' && e.authority) || e.kind === 'presence') authoritySightings.push(i);
  });
  const entriesByVia: Record<string, number[]> = Object.fromEntries(
    [...entriesByViaMap.entries()].sort(([a], [b]) => byId(a, b)),
  );

  return { day, newFamilies, entriesByVia, authoritySightings };
}
