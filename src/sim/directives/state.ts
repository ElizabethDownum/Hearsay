import { dayOf } from '../../core/time';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import { cloneSerializable } from '../hash';
import type { Principal } from '../network/types';
import type {
  DirectiveBrief, DirectiveCorrelation, DirectiveHandoff, DirectiveRecord, DirectiveState,
  MessageId, NetworkPayload, NetworkSpeech, ScrutinyCause,
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

/** One cycle-free issuer for player presets, custom directives, and enemy orders. */
export function issueDirectiveRecord(
  world: WorldState,
  input: {
    principal: Principal;
    principalId: EntityId;
    recipient: EntityId;
    handoff: DirectiveHandoff;
    brief: DirectiveBrief;
    correlation?: DirectiveCorrelation;
    directiveId?: string;
    tick: number;
    cause: NetworkSpeech['cause'];
    queue?: boolean;
  },
): DirectiveRecord {
  if (input.queue !== false) {
    validateNetworkRoute(world, input.principalId, [...input.handoff.outboundVia, input.recipient]);
  }
  const state = ensureDirectiveState(world);
  const directiveId = input.directiveId ?? allocateDirectiveId(state);
  if (state.records.some((record) => record.id === directiveId)) {
    throw new Error(`directive: duplicate reserved id '${directiveId}'`);
  }
  const version = {
    id: allocateVersionId(state), parent: null, directiveId,
    brief: cloneSerializable(input.brief), claimedIssuer: input.principalId,
    replyRoute: input.brief.report === 'none'
      ? null : [...input.handoff.reportVia, input.principalId],
    changedBy: null, changes: [],
  };
  const record: DirectiveRecord = {
    id: directiveId, principal: input.principal, principalId: input.principalId,
    recipient: input.recipient, issuedAt: input.tick,
    handoff: cloneSerializable(input.handoff), authored: cloneSerializable(version),
    ...(input.correlation && input.correlation.kind !== 'none'
      ? { correlation: cloneSerializable(input.correlation) } : {}),
    received: null, decision: null, execution: null, receivedReports: [],
  };
  state.records.push(record);
  if (input.queue === false) return record;
  allocateNetworkMessage(
    world, input.principal, input.principalId,
    [...input.handoff.outboundVia, input.recipient],
    { kind: 'directive', version }, input.tick, input.brief.active.until, input.cause,
  );
  return record;
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
