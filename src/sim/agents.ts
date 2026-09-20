import { Rng } from '../core/rng';
import { dayOf, dayOfWeek, minuteOfDay, REST_DAY, TICKS_PER_DAY, type Tick } from '../core/time';
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

/**
 * The override rows that hold someone at one venue for the tick interval `[from, until)` (R38b, R39).
 * A row is a (day range x minute-of-day range) rectangle, never a tick interval, so an interval that
 * reaches or crosses midnight needs one row per shape: the rest of the first day, any whole days
 * between, and the start of the last. `to` closes at `TICKS_PER_DAY`, never at a wrapped 0. Pure: the
 * caller owns the write.
 */
export function overrideRowsForWindow(
  from: Tick, until: Tick, rest: Omit<ScheduleOverride, 'fromDay' | 'toDay' | 'from' | 'to'>,
): ScheduleOverride[] {
  if (until <= from) return [];
  const firstDay = dayOf(from);
  const lastDay = dayOf(until - 1);
  const lastMinute = minuteOfDay(until - 1) + 1;
  if (firstDay === lastDay) {
    return [{ fromDay: firstDay, toDay: firstDay + 1, from: minuteOfDay(from), to: lastMinute, ...rest }];
  }
  return [
    { fromDay: firstDay, toDay: firstDay + 1, from: minuteOfDay(from), to: TICKS_PER_DAY, ...rest },
    ...(lastDay > firstDay + 1
      ? [{ fromDay: firstDay + 1, toDay: lastDay, from: 0, to: TICKS_PER_DAY, ...rest }] : []),
    { fromDay: lastDay, toDay: lastDay + 1, from: 0, to: lastMinute, ...rest },
  ];
}

/**
 * Where an NPC is right now (rule 2): the avatar stands at `world.playerVenue` when set;
 * everyone else (and the avatar in a headless world) follows the schedule via `venueAt`.
 * The single encoding of player positioning — step's positions map and circlesAt both call it.
 */
export function positionOf(world: WorldState, npc: Npc, t: Tick): VenueId {
  if (npc.id === world.playerId && world.playerVenue !== null) return world.playerVenue;
  return venueAt(npc, t, world.scheduleOverrides[npc.id] ?? []);
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
    const v = positionOf(world, npc, t);
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
