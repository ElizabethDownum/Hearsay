import { minuteOfDay } from '../core/time';
import { circlesAt, venueAt } from './agents';
import type { TickEvents, Utterance } from './perception';
import { chooseTelling, ingest, CONVERSATION_BEAT } from './rumors/propagation';
import type { WorldState } from './types';

/** Advance one tick. Movement -> circles -> tellings -> ingestion. Deterministic order. */
export function step(world: WorldState): TickEvents {
  const t = world.tick;
  const positions = Object.fromEntries(
    Object.values(world.npcs).map((n) => [n.id, venueAt(n, t)]),
  );

  const utterances: Utterance[] = [];
  if (minuteOfDay(t) % CONVERSATION_BEAT === 0) {
    for (const circle of circlesAt(world, t)) {
      if (circle.members.length < 2) continue;
      for (const member of circle.members) {
        const u = chooseTelling(world, member, circle, t);
        if (u) utterances.push(u);
      }
    }
    for (const u of utterances) {
      for (const hearer of u.circleMembers) {
        if (hearer === u.speaker) continue;
        ingest(world, hearer, u, hearer === u.addressedTo);
      }
    }
  }

  world.tick = t + 1;
  return { tick: t, positions, utterances };
}

export function runUntil(world: WorldState, endTick: number): void {
  while (world.tick < endTick) step(world);
}
