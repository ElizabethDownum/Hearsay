import { stepTransaction } from './phases';
import type { TickEvents } from './perception';
import type { Rules } from './rules';
import type { WorldState } from './types';

/** Compatibility wrapper: advance one complete five-phase tick transaction. */
export function step(world: WorldState, rules: Rules): TickEvents {
  return stepTransaction(world, rules);
}

export function runUntil(world: WorldState, endTick: number, rules: Rules): void {
  while (world.tick < endTick) step(world, rules);
}
