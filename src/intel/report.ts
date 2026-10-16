import { dayOf, type Tick } from '../core/time';
import type { RumorId } from '../sim/rumors/claim';
import type { IntelEntry } from './entry';

export interface EveningReport {
  day: number;
  newFamilies: RumorId[];                 // first-heard-today stories
  entriesByVia: Record<string, number[]>; // via → entry indexes captured today
  magicBySpell?: Record<string, number[]>;
  authoritySightings: number[];           // authority askings + watch-presence entries today
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** A claimful utterance: the only row kind that establishes a rumor family as "heard". */
function isClaimful(e: IntelEntry): e is IntelEntry & { family: RumorId } {
  return e.kind === 'utterance' && e.family !== null && e.reported !== null;
}

/**
 * The evening rumor report: what's new today, who brought word (grouped by channel), and every
 * authority-flagged asking or watch-presence sighting captured today. Day-scoped by the tick the
 * entry REACHED the player — a family only counts as "new" the day its FIRST claimful hearing
 * (log-wide, not just today) reached them.
 *
 * `IntelEntry.tick` is observation time, which an informant's report preserves (R47, Astra I12);
 * a day-0 observation handed over on day 1 belongs to day 1's report. The caller passes the
 * acquisition tick per entry (`learnedAt[i]`, the debrief's receipt clock); `null`, or no array
 * at all, falls back to the entry's own tick, so a fold over the log alone reads as before.
 */
export function eveningReport(
  log: readonly IntelEntry[], day: number, learnedAt?: readonly (Tick | null)[],
): EveningReport {
  const reachedAt = (e: IntelEntry, i: number): Tick => learnedAt?.[i] ?? e.tick;
  const firstTick = new Map<RumorId, Tick>();
  log.forEach((e, i) => {
    if (!isClaimful(e)) return;
    const seen = firstTick.get(e.family);
    const reached = reachedAt(e, i);
    if (seen === undefined || reached < seen) firstTick.set(e.family, reached);
  });
  const newFamilies = [...firstTick.entries()]
    .filter(([, tick]) => dayOf(tick) === day)
    .map(([family]) => family)
    .sort(byId);

  const entriesByViaMap = new Map<string, number[]>();
  const magicBySpell = new Map<string, number[]>();
  const authoritySightings: number[] = [];
  log.forEach((e, i) => {
    if (dayOf(reachedAt(e, i)) !== day) return;
    const target = e.provenance === undefined ? entriesByViaMap : magicBySpell;
    const key = e.provenance === undefined ? e.via : e.provenance.spell;
    const bucket = target.get(key);
    if (bucket) bucket.push(i);
    else target.set(key, [i]);
    if ((e.kind === 'asking' && e.authority) || e.kind === 'presence') authoritySightings.push(i);
  });
  const entriesByVia: Record<string, number[]> = Object.fromEntries(
    [...entriesByViaMap.entries()].sort(([a], [b]) => byId(a, b)),
  );

  return {
    day, newFamilies, entriesByVia, authoritySightings,
    ...(magicBySpell.size === 0 ? {} : { magicBySpell: Object.fromEntries(
      [...magicBySpell.entries()].sort(([a], [b]) => byId(a, b)),
    ) }),
  };
}
