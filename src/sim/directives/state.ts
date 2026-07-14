import { dayOf } from '../../core/time';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import type { DirectiveState, ScrutinyCause } from './types';

export const SCRUTINY: Record<ScrutinyCause, { weight: number; decayDays: number }> = {
  questioning: { weight: 0.15, decayDays: 2 },
  'authority-pressure': { weight: 0.30, decayDays: 4 },
  retasking: { weight: 0.10, decayDays: 2 },
  exclusion: { weight: 0.20, decayDays: 3 },
  confrontation: { weight: 0.45, decayDays: 7 },
};

export function ensureDirectiveState(world: WorldState): DirectiveState {
  if (world.network.directiveState) return world.network.directiveState;
  const state: DirectiveState = {
    nextDirective: 0,
    nextMessage: 0,
    nextVersion: 0,
    nextObservation: 0,
    records: [],
    messages: [],
    heldObservations: [],
    scrutiny: [],
    recruitmentApproaches: [],
  };
  world.network.directiveState = state;
  return state;
}

export const strictNextBeat = (tick: number): number =>
  (Math.floor(tick / CONVERSATION_BEAT) + 1) * CONVERSATION_BEAT;

export const beatAtOrAfter = (tick: number): number =>
  Math.ceil(tick / CONVERSATION_BEAT) * CONVERSATION_BEAT;

export function allocateDirectiveId(state: DirectiveState): string {
  const id = `d${state.nextDirective}`;
  state.nextDirective += 1;
  return id;
}

export function allocateMessageId(state: DirectiveState): string {
  const id = `m${state.nextMessage}`;
  state.nextMessage += 1;
  return id;
}

export function allocateVersionId(state: DirectiveState): string {
  const id = `v${state.nextVersion}`;
  state.nextVersion += 1;
  return id;
}

export function allocateObservationId(state: DirectiveState): string {
  const id = `o${state.nextObservation}`;
  state.nextObservation += 1;
  return id;
}

export function recordScrutiny(
  world: WorldState,
  observer: EntityId,
  principal: EntityId,
  cause: ScrutinyCause,
  observedAt: number,
): void {
  const state = ensureDirectiveState(world);
  const sameTick = state.scrutiny.some((trace) => trace.observer === observer
    && trace.principal === principal && trace.cause === cause && trace.observedAt === observedAt);
  if (!sameTick) state.scrutiny.push({ observer, principal, cause, observedAt });
}

export function perceivedScrutiny(
  world: WorldState,
  observer: EntityId,
  principal: EntityId,
  atTick: number,
): number {
  const state = world.network.directiveState;
  if (!state) return 0;
  const atDay = dayOf(atTick);
  const sum = state.scrutiny
    .filter((trace) => trace.observer === observer && trace.principal === principal)
    .reduce((total, trace) => {
      const rule = SCRUTINY[trace.cause];
      const remaining = Math.max(0, 1 - (atDay - dayOf(trace.observedAt)) / rule.decayDays);
      return total + rule.weight * remaining;
    }, 0);
  return Math.max(0, Math.min(1, sum));
}
