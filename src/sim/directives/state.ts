import { dayOf } from '../../core/time';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import { cloneSerializable } from '../hash';
import type { Principal } from '../network/types';
import type {
  DirectiveState, MessageId, NetworkPayload, NetworkSpeech, ScrutinyCause,
} from './types';

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

export function validateNetworkRoute(
  world: WorldState, holder: EntityId, route: readonly EntityId[],
): void {
  if (!world.npcs[holder]) throw new Error(`network: unknown holder '${holder}'`);
  if (route.length === 0) throw new Error('network: route must name at least one recipient');
  const seen = new Set<EntityId>();
  for (const id of route) {
    if (!world.npcs[id]) throw new Error(`network: unknown route actor '${id}'`);
    if (id === holder) throw new Error(`network: route contains self-hop '${id}'`);
    if (seen.has(id)) throw new Error(`network: duplicate route actor '${id}'`);
    seen.add(id);
  }
}

/** Allocate transport data without importing the transport realization module (cycle-free queue seam). */
export function allocateNetworkMessage(
  world: WorldState,
  principal: Principal,
  holder: EntityId,
  route: EntityId[],
  payload: NetworkPayload,
  availableAfter: number,
  expiresAt: number | null,
  cause: NetworkSpeech['cause'],
): MessageId {
  if (expiresAt !== null && expiresAt < availableAfter) {
    throw new Error(`network: expiry ${expiresAt} precedes availability ${availableAfter}`);
  }
  const state = ensureDirectiveState(world);
  const id = allocateMessageId(state);
  state.messages.push({
    id, principal, createdAt: world.tick, origin: holder, holder, lastFrom: holder,
    route: [...route], nextHop: 0, availableAfter, payload: cloneSerializable(payload),
    deliveredAt: null, expiresAt, failedAt: null, processedRelayHops: [],
    cause: cloneSerializable(cause),
  });
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
