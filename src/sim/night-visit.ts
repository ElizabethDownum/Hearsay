import { minuteOfDay, type Tick } from '../core/time';
import type { PhysicalReceipt } from './enemy/state';
import type { ReportedFieldObservation } from './directives/types';
import type { WorldState } from './types';

export const isSacredVenue = (venue: string): boolean =>
  venue === 'cathedral' || venue === 'chapel' || /^chapel-.+/.test(venue);
export const isNightVisitTime = (tick: Tick): boolean =>
  Number.isFinite(tick) && Number.isInteger(tick) && tick >= 0 && minuteOfDay(tick) < 240;

export type ReportedNightVisit = Extract<ReportedFieldObservation, { kind: 'presence' }>
  & { witness: string };

/** Consumes visible reported data only; no player/ritual/claim/schedule/edge lookup. */
export function ingestEnemyNightVisit(
  world: WorldState, observation: ReportedNightVisit, receipt?: PhysicalReceipt,
): void {
  if (!isNightVisitTime(observation.observedAt) || !isSacredVenue(observation.venue)) return;
  const duplicate = world.enemy.evidence.some((entry) => entry.kind === 'night-visit'
    && entry.venue === observation.venue && entry.nightVisit.actor === observation.actor
    && entry.nightVisit.witness === observation.witness
    && entry.nightVisit.observedAt === observation.observedAt);
  if (duplicate) return;
  world.enemy.evidence.push({
    kind: 'night-visit', tick: observation.observedAt, venue: observation.venue,
    observer: observation.witness, overheard: false, speaker: null, addressedTo: null,
    mode: null, claimId: null, family: null, reported: null, about: null,
    nightVisit: { actor: observation.actor, witness: observation.witness, observedAt: observation.observedAt },
    ...(receipt === undefined ? {} : { receipt: { ...receipt } }),
  });
}
