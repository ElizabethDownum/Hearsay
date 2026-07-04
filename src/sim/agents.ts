import { Rng } from '../core/rng';
import { dayOf, dayOfWeek, minuteOfDay, REST_DAY, type Tick } from '../core/time';
import type { EntityId, VenueId } from './rumors/claim';
import type { Npc, ScheduleOverride, WorldState } from './types';

export const CIRCLE_SIZE = 4;

export function venueAt(npc: Npc, t: Tick, overrides: readonly ScheduleOverride[] = []): VenueId {
  const day = dayOf(t);
  const m = minuteOfDay(t);
  for (const o of overrides) {
    if (day >= o.fromDay && (o.toDay === null || day < o.toDay) && m >= o.from && m < o.to) return o.venue;
  }
  const isRest = dayOfWeek(t) === REST_DAY;
  for (const entry of npc.schedule) {
    const dayMatch =
      entry.days === 'all' || (entry.days === 'restday') === isRest;
    if (dayMatch && m >= entry.from && m < entry.to) return entry.venue;
  }
  return npc.home;
}

export interface Circle {
  venue: VenueId;
  members: EntityId[];
}

/**
 * Deterministic conversation circles. The shuffle stream is keyed by
 * (world seed, venue, day, hour) — fixed at world-gen, never re-rolled by
 * player action (spec: no save-scum rerolls). Occupancy changes change the
 * grouping input — that's the butterfly, not dice.
 */
export function circlesAt(world: WorldState, t: Tick): Circle[] {
  const occupants = new Map<VenueId, EntityId[]>();
  for (const npc of Object.values(world.npcs)) {
    const v = venueAt(npc, t, world.scheduleOverrides[npc.id] ?? []);
    (occupants.get(v) ?? occupants.set(v, []).get(v)!).push(npc.id);
  }

  const hour = Math.floor(minuteOfDay(t) / 60);
  const circles: Circle[] = [];
  for (const [venue, ids] of [...occupants.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const rng = new Rng(world.seed, `circles:${venue}:${dayOf(t)}:${hour}`);
    const shuffled = rng.shuffle([...ids].sort());
    for (let i = 0; i < shuffled.length; i += CIRCLE_SIZE) {
      circles.push({ venue, members: shuffled.slice(i, i + CIRCLE_SIZE) });
    }
  }
  return circles;
}
