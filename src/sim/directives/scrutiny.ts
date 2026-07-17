import { dayOf, type Tick } from '../../core/time';
import type { WorldState } from '../types';
import { SCRUTINY } from './state';

export { SCRUTINY, perceivedScrutiny, recordScrutiny } from './state';

/** Remove only traces whose contribution is already exactly zero at this tick. */
export function pruneScrutiny(world: WorldState, atTick: Tick): void {
  const state = world.network.directiveState;
  if (!state) return;
  const atDay = dayOf(atTick);
  state.scrutiny = state.scrutiny.filter((trace) =>
    atDay - dayOf(trace.observedAt) < SCRUTINY[trace.cause].decayDays);
}
