import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { miniTown } from '../sim/helpers/minitown';
import { applyAction, type DirectiveAction } from '../../src/sim/campaign';
import { collectCircleIntents, finishTick, prepareTick } from '../../src/sim/phases';
import {
  collectNetworkForwardIntents, evaluateRelay, queueNetworkMessage, realizeNetworkForward,
} from '../../src/sim/directives/transport';
import { recordScrutiny } from '../../src/sim/directives/state';
import { stableStringify } from '../../src/sim/hash';
import type { BriefVersion, DirectiveBrief, NetworkPayload } from '../../src/sim/directives/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';

const BRIEF: DirectiveBrief = {
  mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
  priority: 'important', authority: 'relationship', discretion: 'open',
  specificity: 'guided', guidance: [], active: { from: 0, until: 90 },
  report: 'outcome', reportBy: 90, purpose: 'learn what Bez knows',
};

function world(ids = ['ada', 'bez', 'cyn']) {
  const fixture = miniTown();
  const kept = new Set(ids);
  fixture.npcs = fixture.npcs
    .filter((npc) => kept.has(npc.id))
    .map((npc) => ({ ...npc, edges: npc.edges.filter((edge) => kept.has(edge.to)) }));
  const value = buildWorld(fixture, 'directive-transport', STANDARD_RULES);
  enrollPlayer(value, { home: 'square' });
  for (const id of ids) {
    value.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  }
  return value;
}

describe('physical network transport', () => {
  it('delivers a direct directive in phase 2 and records exactly what the circle heard', () => {
    const value = world(['bez']);
    const frame = prepareTick(value, STANDARD_RULES);
    const action: DirectiveAction = {
      tick: 0, kind: 'directive', recipient: 'bez', handoff: { outboundVia: [], reportVia: [] },
      brief: BRIEF,
    };
    const events = finishTick(value, STANDARD_RULES, frame, () => applyAction(value, action, STANDARD_RULES));

    expect(events.networkSpeeches).toHaveLength(1);
    expect(events.networkSpeeches![0]).toMatchObject({ speaker: 'you', addressedTo: 'bez' });
    expect(value.network.directiveState!.records[0]!.received).toMatchObject({ tick: 0, handoffFrom: 'you' });
    expect(value.chronicle.filter((entry) => entry.kind === 'network-speech')).toHaveLength(1);
  });

  it('moves a relayed copy at most one hop per beat', () => {
    const value = world();
    const id = queueNetworkMessage(value, 'player', 'you', ['ada', 'bez'], {
      kind: 'directive-response', directiveId: 'd-external', response: 'attempt', report: null,
    }, 0, null, null);
    const frame = prepareTick(value, STANDARD_RULES);
    // An origin send is universal: no relationship-to-self judgment can drop it.
    const first = realizeNetworkForward(value, id, frame.circles[0]!, 0, STANDARD_RULES);
    expect(first).not.toBeNull();
    expect(value.network.directiveState!.messages[0]).toMatchObject({ holder: 'ada', nextHop: 1, deliveredAt: null });
    expect(realizeNetworkForward(value, id, frame.circles[0]!, 0, STANDARD_RULES)).toBeNull();
    expect(realizeNetworkForward(value, id, frame.circles[0]!, 15, STANDARD_RULES)).not.toBeNull();
    expect(value.network.directiveState!.messages[0]).toMatchObject({ holder: 'bez', nextHop: 2, deliveredAt: 15 });
  });

  it('orders m2 before m10 with the pinned createdAt:numericMessageId causal ref', () => {
    const value = world();
    for (let index = 0; index <= 10; index += 1) {
      queueNetworkMessage(value, 'player', 'ada', ['bez'], {
        kind: 'invitation-response', invitationId: `i${index}`, response: 'accept',
      }, 0, null, null);
    }
    for (const message of value.network.directiveState!.messages) {
      if (message.id !== 'm2' && message.id !== 'm10') message.failedAt = 0;
    }
    const circle = { venue: 'square', members: ['ada', 'bez'] };
    const network = collectNetworkForwardIntents(value, 0, [circle]);
    expect(network.map((intent) => intent.ref)).toEqual([
      '0000000000:0000000002', '0000000000:0000000010',
    ]);
    const frame = collectCircleIntents(value, circle, 0, STANDARD_RULES, network, new Set());
    expect(frame.selected.find((intent) => intent.actor === 'ada')).toMatchObject({
      kind: 'network-forward', ref: '0000000000:0000000002',
    });
    expect(realizeNetworkForward(
      value, '0000000000:0000000002', circle, 0, STANDARD_RULES,
    )).not.toBeNull();
    expect(value.network.directiveState!.messages.find((message) => message.id === 'm2')!.deliveredAt).toBe(0);
    expect(value.network.directiveState!.messages.find((message) => message.id === 'm10')!.deliveredAt).toBeNull();
  });

  it('uses the exact relay decision table', () => {
    const base = {
      relationshipToClaimedIssuer: 0.5, authority: 'relationship' as const,
      discretion: 'open' as const, bystanders: 0, turnedAgainstMessagePrincipal: false, scrutiny: 0,
    };
    expect(evaluateRelay(base)).toBe('forward');
    expect(evaluateRelay({ ...base, discretion: 'compartmented', bystanders: 1 })).toBe('hold');
    expect(evaluateRelay({ ...base, relationshipToClaimedIssuer: 0, authority: 'request' })).toBe('drop');
    expect(evaluateRelay({ ...base, turnedAgainstMessagePrincipal: true })).toBe('betray-and-forward');
  });

  it('rejects malformed routes before allocating lazy directive state', () => {
    const value = world();
    expect(() => queueNetworkMessage(value, 'player', 'ghost', ['ada'], {
      kind: 'invitation-response', invitationId: 'i0', response: 'accept',
    }, 0, null, null)).toThrow(/unknown holder/);
    expect(value.network.directiveState).toBeUndefined();
    expect(() => queueNetworkMessage(value, 'player', 'ada', ['ghost'], {
      kind: 'invitation-response', invitationId: 'i0', response: 'accept',
    }, 0, null, null)).toThrow(/unknown route actor/);
    expect(value.network.directiveState).toBeUndefined();
    expect(() => queueNetworkMessage(value, 'player', 'ada', ['ada'], {
      kind: 'invitation-response', invitationId: 'i0', response: 'accept',
    }, 0, null, null)).toThrow(/self-hop/);
    expect(value.network.directiveState).toBeUndefined();
  });

  it('a high-scrutiny relay processes and delays once, then forwards on the next contact', () => {
    const value = world();
    const id = queueNetworkMessage(value, 'player', 'ada', ['bez', 'cyn'], {
      kind: 'invitation-response', invitationId: 'i0', response: 'accept',
    }, 0, null, null);
    expect(realizeNetworkForward(value, id, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES))
      .not.toBeNull();
    recordScrutiny(value, 'bez', 'ada', 'confrontation', 0);
    recordScrutiny(value, 'bez', 'ada', 'authority-pressure', 0);
    const before = stableStringify(value.network.directiveState!.messages[0]!.payload);
    expect(realizeNetworkForward(value, id, { venue: 'square', members: ['bez', 'cyn'] }, 15, STANDARD_RULES))
      .toBeNull();
    expect(value.network.directiveState!.messages[0]).toMatchObject({
      holder: 'bez', nextHop: 1, availableAfter: 30, processedRelayHops: [1],
    });
    expect(realizeNetworkForward(value, id, { venue: 'square', members: ['bez', 'cyn'] }, 30, STANDARD_RULES))
      .not.toBeNull();
    expect(value.network.directiveState!.messages[0]).toMatchObject({
      holder: 'cyn', deliveredAt: 30, processedRelayHops: [1],
    });
    expect(stableStringify(value.network.directiveState!.messages[0]!.payload)).toBe(before);
  });

  it('hold changes nothing, drop fails, and betray queues one opposite-principal handler copy', () => {
    const version: BriefVersion = {
      id: 'v0', parent: null, directiveId: 'd0', brief: { ...BRIEF, discretion: 'compartmented' },
      claimedIssuer: 'ada', replyRoute: null, changedBy: null, changes: [],
    };
    const held = world();
    const heldId = queueNetworkMessage(held, 'player', 'ada', ['bez', 'cyn'], {
      kind: 'handler-brief', sourceDirectiveId: 'd0', version,
    }, 0, null, null);
    realizeNetworkForward(held, heldId, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES);
    const heldBefore = stableStringify(held.network.directiveState!.messages[0]);
    expect(realizeNetworkForward(held, heldId, {
      venue: 'square', members: ['bez', 'cyn', 'you'],
    }, 15, STANDARD_RULES)).toBeNull();
    expect(stableStringify(held.network.directiveState!.messages[0])).toBe(heldBefore);

    const dropped = world();
    dropped.npcs.bez!.edges = dropped.npcs.bez!.edges.filter((edge) => edge.to !== 'ada');
    const dropId = queueNetworkMessage(dropped, 'player', 'ada', ['bez', 'cyn'], {
      kind: 'invitation', invitationId: 'i-drop', invitationKind: 'rendezvous',
      inviter: 'ada', counterparty: 'cyn', invitee: 'cyn', venue: 'square',
      requested: { from: 0, until: 30 },
    }, 0, null, null);
    realizeNetworkForward(dropped, dropId, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES);
    expect(realizeNetworkForward(dropped, dropId, {
      venue: 'square', members: ['bez', 'cyn'],
    }, 15, STANDARD_RULES)).toBeNull();
    expect(dropped.network.directiveState!.messages[0]!.failedAt).toBe(15);

    const betrayed = world();
    betrayed.network.spymaster = 'cyn';
    betrayed.network.assets.find((asset) => asset.id === 'bez')!.turned = true;
    const betrayId = queueNetworkMessage(betrayed, 'player', 'ada', ['bez', 'cyn', 'you'], {
      kind: 'directive', version: { ...version, brief: { ...BRIEF, discretion: 'open' } },
    }, 0, null, null);
    realizeNetworkForward(betrayed, betrayId, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES);
    expect(realizeNetworkForward(betrayed, betrayId, {
      venue: 'square', members: ['bez', 'cyn'],
    }, 15, STANDARD_RULES)).not.toBeNull();
    expect(betrayed.network.directiveState!.messages.map((message) => message.payload.kind))
      .toEqual(['directive', 'handler-brief']);
    expect(betrayed.network.directiveState!.messages[1]).toMatchObject({
      principal: 'enemy', origin: 'bez', holder: 'bez', route: ['cyn'], deliveredAt: null,
    });
  });

  it('fails an expired outbound directive once and keeps the abort hidden in its private record', () => {
    const value = world();
    const frame = prepareTick(value, STANDARD_RULES);
    applyAction(value, {
      tick: 0, kind: 'directive', recipient: 'cyn',
      handoff: { outboundVia: ['ada'], reportVia: [] },
      brief: { ...BRIEF, active: { from: 0, until: 15 }, reportBy: 15 },
    }, STANDARD_RULES);
    const message = value.network.directiveState!.messages[0]!;
    expect(realizeNetworkForward(value, message.id, frame.circles[0]!, 30, STANDARD_RULES)).toBeNull();
    expect(message).toMatchObject({ failedAt: 30, deliveredAt: null });
    expect(value.network.directiveState!.records[0]!.execution).toMatchObject({ state: 'aborted' });
  });

  it('every non-directive payload can leave its origin without a self-edge judgment', () => {
    const version: BriefVersion = {
      id: 'v-external', parent: null, directiveId: 'd-external', brief: BRIEF,
      claimedIssuer: 'ada', replyRoute: null, changedBy: null, changes: [],
    };
    const payloads: NetworkPayload[] = [
      { kind: 'directive-report', directiveId: 'd-external', report: {
        outcome: 'done', reason: null, evidence: null, source: 'ada', uncertainty: 'low',
      }, factRefs: [], enemyAction: null },
      { kind: 'directive-response', directiveId: 'd-external', response: 'attempt', report: null },
      { kind: 'handler-brief', sourceDirectiveId: 'd-external', version },
      { kind: 'field-report', origin: 'ada', sourceDirectiveId: null,
        sourceObservationIds: [], renderedItems: null },
      { kind: 'compartment-fact', principal: 'player', asset: 'ada', factIndex: 0,
        fact: { tick: 0, kind: 'met-asset', ref: 'you' } },
      { kind: 'sketch-tip', principal: 'enemy', asset: 'ada', featureId: 'sf-missing',
        subject: null, detail: '' },
      { kind: 'invitation', invitationId: 'i0', invitationKind: 'rendezvous',
        inviter: 'ada', counterparty: 'bez', invitee: 'bez', venue: 'square', requested: { from: 0, until: 30 } },
      { kind: 'invitation-response', invitationId: 'i0', response: 'accept' },
      { kind: 'recruitment-approach', approachId: 'a0', recruiter: 'ada', target: 'bez' },
      { kind: 'recruitment-response', approachId: 'a0', response: 'accept' },
    ];
    for (const payload of payloads) {
      const value = world();
      const id = queueNetworkMessage(value, 'player', 'ada', ['bez'], payload, 0, null, null);
      expect(realizeNetworkForward(value, id, { venue: 'square', members: ['ada', 'bez'] }, 0, STANDARD_RULES),
        payload.kind).not.toBeNull();
      expect(value.network.directiveState!.messages[0]!.deliveredAt, payload.kind).toBe(0);
    }
  });
});
