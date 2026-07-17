import { stepTransaction } from './phases';
import { minuteOfDay } from '../core/time';
import { pruneScrutiny } from './directives/scrutiny';
import type { TickEvents } from './perception';
import type { Rules } from './rules';
import type { WorldState } from './types';

/** Compatibility wrapper: advance one complete five-phase tick transaction. */
export function step(world: WorldState, rules: Rules): TickEvents {
  const processedTick = world.tick;
  const events = stepTransaction(world, rules);
  // Last nightly item: scenario resolution has already run inside the transaction.
  if (minuteOfDay(processedTick) === 1439) pruneScrutiny(world, processedTick);
  return events;
}

export function runUntil(world: WorldState, endTick: number, rules: Rules): void {
  while (world.tick < endTick) step(world, rules);
}
