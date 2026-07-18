import { TICKS_PER_DAY, minuteOfDay, type Tick } from '../../core/time';
import type { Circle } from '../agents';
import type { NpcAutonomousIntent, NpcIntentRealization } from '../phases';
import { CONVERSATION_BEAT } from '../rumors/propagation';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import { issueDirectiveRecord } from '../directives/state';
import { initializeArtifactReceipt } from '../directives/execution';
import type { DirectiveBrief } from '../directives/types';

export const COURIER_EXPIRY_DAYS = 3;

export function collectDropPickupIntents(
  world: WorldState, tick: Tick, circles: readonly Circle[],
): NpcAutonomousIntent[] {
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) return [];
  return (world.network.dropPayloads ?? [])
    .filter((payload) => payload.pickedUpAt === null && payload.failedAt === null
      && circles.some((circle) => circle.venue === world.network.drops
        .find((drop) => drop.id === payload.dropId)?.venue
        && circle.members.includes(payload.asset)))
    .map((payload) => ({
      kind: 'drop-pickup' as const, actor: payload.asset, ref: payload.id, rank: 3 as const,
    }))
    .sort((a, b) => a.actor.localeCompare(b.actor) || a.ref.localeCompare(b.ref));
}

export function realizeDropPickup(
  world: WorldState, payloadId: string, circle: Circle, tick: Tick, rules: Rules,
): NpcIntentRealization {
  const empty: NpcIntentRealization = { askings: [], answers: [], tellings: [], extras: [] };
  const payload = world.network.dropPayloads?.find((row) => row.id === payloadId);
  if (!payload || payload.pickedUpAt !== null || payload.failedAt !== null) return empty;
  const drop = world.network.drops.find((row) => row.id === payload.dropId);
  if (!drop || circle.venue !== drop.venue || !circle.members.includes(payload.asset)) return empty;
  const principalId = payload.principal === 'player' ? world.playerId : world.network.spymaster;
  if (principalId === null) return empty;
  const active = {
    from: (Math.floor(tick / CONVERSATION_BEAT) + 1) * CONVERSATION_BEAT,
    until: tick + COURIER_EXPIRY_DAYS * TICKS_PER_DAY,
  };
  const brief: DirectiveBrief = {
    mission: {
      kind: 'shape', operation: 'spread', payload: payload.artifact.payload,
      audience: { kind: 'person', id: payload.target }, redirectTo: null,
    },
    priority: 'routine', authority: 'relationship', discretion: 'quiet',
    specificity: 'detailed', guidance: [], active,
    report: 'outcome', reportBy: active.until, purpose: null,
    application: { kind: 'courier', target: payload.target },
  };
  const record = issueDirectiveRecord(world, {
    principal: payload.principal, principalId, recipient: payload.asset,
    handoff: { outboundVia: [], reportVia: [] }, brief,
    correlation: { kind: 'courier', planId: payload.planId, dropPayloadId: payload.id },
    directiveId: payload.directiveId, tick, cause: null, queue: false,
  });
  payload.pickedUpAt = tick;
  payload.expiresAt = tick + COURIER_EXPIRY_DAYS * TICKS_PER_DAY;
  initializeArtifactReceipt(world, record, circle, tick, rules);
  return empty;
}
