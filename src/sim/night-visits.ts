import { dayOf } from '../core/time';
import { holdFieldObservation } from './directives/field-reports';
import type { NightVisitRecord } from './magic-types';
import { ingestEnemyNightVisit, isNightVisitTime, isSacredVenue } from './night-visit';
import { observationsFor, type TickEvents } from './perception';
import type { WorldState } from './types';

/** A scoped avatar caper sighting, independent of whether any magic was performed. */
export function captureNightVisits(world: WorldState, events: TickEvents): void {
  if (!isNightVisitTime(events.tick)) return;
  const avatar = world.playerId;
  const principal = world.network.spymaster;
  if (avatar === null || !world.npcs[avatar] || principal === null || !world.npcs[principal]) return;
  const venue = events.positions[avatar];
  if (venue === undefined || !world.venues[venue] || !isSacredVenue(venue)) return;
  const witnesses = [...new Set([...world.enemy.observers.map((observer) => observer.id), principal])].sort();
  for (const witness of witnesses) {
    if (witness === avatar || !world.npcs[witness]) continue;
    const observed = observationsFor(witness, events).observations.find((row) =>
      row.kind === 'presence' && row.actor === avatar && row.venue === venue && row.tick === events.tick);
    if (observed?.kind !== 'presence') continue;
    // One canonical sighting per real witness/actor/place/day. Retelling keeps that timestamp.
    let sighting = world.chronicle.find((row): row is NightVisitRecord => row.kind === 'night-visit'
      && row.observer === witness && row.actor === avatar && row.venue === venue
      && dayOf(row.tick) === dayOf(events.tick));
    if (!sighting) {
      sighting = { kind: 'night-visit', tick: observed.tick, venue: observed.venue,
        observer: witness, actor: observed.actor };
      world.chronicle.push(sighting);
    }
    if (witness === principal) {
      ingestEnemyNightVisit(world, { kind: 'presence', observedAt: sighting.tick,
        venue: sighting.venue, actor: sighting.actor, witness });
    } else {
      holdFieldObservation(world, 'enemy', witness, { kind: 'raw', observation: {
        kind: 'presence', tick: sighting.tick, venue: sighting.venue, actor: sighting.actor, witness,
      } }, null, [principal], null, []);
    }
  }
}
