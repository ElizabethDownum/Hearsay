import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { miniTown } from '../sim/helpers/minitown';
import { captureIntel } from '../../src/sim/fieldwork';
import { courierRouteView, networkView, playerView } from '../../src/sim/fieldwork';
import {
  holdFieldObservation, ingestObservedFieldReport, queueUnqueuedFieldReports,
} from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { collectNetworkForwardIntents } from '../../src/sim/directives/transport';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import type { TickEvents } from '../../src/sim/perception';
import { captureEvidence } from '../../src/sim/counterintel';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { ensureDirectiveState } from '../../src/sim/directives/state';
import type { Claim } from '../../src/sim/rumors/claim';
import type { WorldState } from '../../src/sim/types';
import { collectCircleIntents } from '../../src/sim/phases';

function world(ids = ['ada', 'bez']) {
  const fixture = miniTown();
  const kept = new Set(ids);
  fixture.npcs = fixture.npcs
    .filter((npc) => kept.has(npc.id))
    .map((npc) => ({ ...npc, edges: npc.edges.filter((edge) => kept.has(edge.to)) }));
  const value = buildWorld(fixture, 'field-reports', STANDARD_RULES);
  enrollPlayer(value, { home: 'backroom' });
  value.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  value.intel.informants.push({ id: 'ada', assignedVenue: 'square' });
  return value;
}

const CLAIM: Claim = {
  id: 'c-field', family: 'f-field', parent: null, subject: 'cyn', predicate: 'stole',
  object: null, count: 4, severity: 4, place: null, attribution: 'someone',
};

function speechEvents(speech: NonNullable<ReturnType<typeof realizeNetworkForward>>): TickEvents {
  return {
    tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
  };
}

describe('remote observations wait for physical field reports', () => {
  it('holds a remote asking without changing player intel', () => {
    const value = world();
    const events: TickEvents = {
      tick: 0,
      positions: { you: 'backroom', ada: 'square', bez: 'square' },
      utterances: [],
      askings: [{
        tick: 0, venue: 'square', circleMembers: ['ada', 'bez'],
        speaker: 'bez', addressedTo: 'ada', about: { family: 'f0' }, authority: false,
      }],
    };
    captureIntel(value, events, STANDARD_RULES);
    expect(value.intel.log).toHaveLength(0);
    expect(value.network.directiveState!.heldObservations).toHaveLength(1);
  });

  it('ingests only the spoken rendered item after final receipt', () => {
    const value = world();
    holdFieldObservation(
      value, 'player', 'ada',
      { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'square', actor: 'bez' } },
      null, ['you'], null, [],
    );
    queueUnqueuedFieldReports(value);
    const message = value.network.directiveState!.messages[0]!;
    const speech = realizeNetworkForward(
      value, message.id, { venue: 'backroom', members: ['ada', 'you'] }, 15, STANDARD_RULES,
    );
    expect(speech?.spoken.kind).toBe('field-report');
    ingestObservedFieldReport(value, 'player', speech!);
    expect(value.intel.log).toMatchObject([{ kind: 'presence', actor: 'bez', via: 'ada' }]);
    expect(value.network.directiveState!.heldObservations[0]!.deliveredAt).toBe(15);
  });

  it('dedupes one observer/principal/root across repeated capture', () => {
    const value = world();
    const hold = () => holdFieldObservation(
      value, 'player', 'ada',
      { kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'square', actor: 'bez' } },
      null, ['you'], null, [],
    );
    expect(hold()).toBe('o0');
    expect(hold()).toBe('o0');
    expect(value.network.directiveState!.heldObservations).toHaveLength(1);
  });

  it('batches nine held roots as eight then one without exposing either packet', () => {
    const value = world();
    for (let tick = 0; tick < 9; tick += 1) {
      holdFieldObservation(
        value, 'player', 'ada',
        { kind: 'raw', observation: { kind: 'presence', tick, venue: 'square', actor: 'bez' } },
        null, ['you'], null, [],
      );
    }
    queueUnqueuedFieldReports(value);
    expect(value.network.directiveState!.messages.map((message) =>
      message.payload.kind === 'field-report' ? message.payload.sourceObservationIds.length : -1))
      .toEqual([8, 1]);
    expect(value.intel.log).toHaveLength(0);
  });

  it('mirrors enemy hold, digest isolation, and embodied-handler receipt', () => {
    const value = world(['ada', 'bez', 'cyn']);
    value.network.spymaster = 'cyn';
    value.enemy.observers = [{ id: 'ada', vigilance: 1 }];
    value.claims[CLAIM.id] = CLAIM;
    const events: TickEvents = {
      tick: 0, positions: { ada: 'square', bez: 'square', cyn: 'backroom', you: 'backroom' },
      askings: [], utterances: [{
        tick: 0, venue: 'square', circleMembers: ['ada', 'bez'], speaker: 'bez',
        addressedTo: 'ada', claim: CLAIM, mode: 'telling',
      }],
    };
    const digestBefore = stableStringify(enemyDigest(value.enemy, 0, STANDARD_RULES));
    captureEvidence(value, events, STANDARD_RULES);
    expect(value.enemy.evidence).toHaveLength(0);
    expect(stableStringify(enemyDigest(value.enemy, 0, STANDARD_RULES))).toBe(digestBefore);
    expect(value.network.directiveState!.heldObservations).toMatchObject([
      { principal: 'enemy', observer: 'ada', deliveredAt: null },
    ]);

    queueUnqueuedFieldReports(value);
    const message = value.network.directiveState!.messages[0]!;
    const speech = realizeNetworkForward(
      value, message.id, { venue: 'backroom', members: ['ada', 'cyn'] },
      message.availableAfter, STANDARD_RULES,
    )!;
    captureEvidence(value, speechEvents(speech), STANDARD_RULES);
    expect(value.enemy.evidence.some((entry) =>
      entry.kind === 'utterance' && entry.observer === 'ada' && entry.family === CLAIM.family)).toBe(true);
    expect(stableStringify(enemyDigest(value.enemy, 0, STANDARD_RULES))).not.toBe(digestBefore);
  });

  it('moves nine rows over two contacts, once each, after a JSON round-trip', () => {
    const initial = world();
    for (let tick = 0; tick < 9; tick += 1) {
      holdFieldObservation(initial, 'player', 'ada', {
        kind: 'raw', observation: { kind: 'presence', tick, venue: 'square', actor: 'bez' },
      }, null, ['you'], null, []);
    }
    queueUnqueuedFieldReports(initial);
    const value = cloneSerializable(initial);
    const circle = { venue: 'backroom', members: ['ada', 'you'] };
    const forwardAt = (tick: number) => {
      const network = collectNetworkForwardIntents(value, tick, [circle]);
      const frame = collectCircleIntents(value, circle, tick, STANDARD_RULES, network, new Set());
      const intent = frame.selected.find((candidate) => candidate.kind === 'network-forward')!;
      return realizeNetworkForward(value, intent.ref, circle, tick, STANDARD_RULES)!;
    };
    const first = forwardAt(15);
    ingestObservedFieldReport(value, 'player', first);
    const second = forwardAt(30);
    ingestObservedFieldReport(value, 'player', second);
    expect(value.intel.log.filter((entry) => entry.kind === 'presence')).toHaveLength(9);
    expect(value.network.directiveState!.heldObservations.map((row) => row.deliveredAt)
      .every((tick) => tick !== null)).toBe(true);
    expect(new Set(value.network.directiveState!.heldObservations.map((row) => row.id)).size).toBe(9);
  });

  it('a relay projects the previous field-report copy through its own registered traits', () => {
    const value = world(['ada', 'bez']);
    value.claims[CLAIM.id] = CLAIM;
    holdFieldObservation(value, 'player', 'ada', {
      kind: 'raw', observation: {
        kind: 'utterance', tick: 0, venue: 'square', speaker: 'ada', addressedTo: 'bez',
        claim: { ...CLAIM, predicate: 'met-secretly-with', count: 2, severity: 3 },
        overheard: false, mode: 'telling',
      },
    }, null, ['bez', 'you'], null, []);
    queueUnqueuedFieldReports(value);
    const message = value.network.directiveState!.messages[0]!;
    const first = realizeNetworkForward(
      value, message.id, { venue: 'square', members: ['ada', 'bez'] }, 15, STANDARD_RULES,
    )!;
    expect(first.spoken).toMatchObject({
      kind: 'field-report', items: [{ observation: {
        kind: 'utterance', reported: { predicate: 'met-secretly-with' },
      } }],
    });
    const second = realizeNetworkForward(
      value, message.id, { venue: 'backroom', members: ['bez', 'you'] }, 30, STANDARD_RULES,
    )!;
    expect(second.spoken).toMatchObject({
      kind: 'field-report', items: [{ observation: {
        kind: 'utterance', reported: { predicate: 'is-having-an-affair-with' },
      } }],
    });
  });

  it('omitted atoms still close every bound source id at final receipt', () => {
    const value = world();
    value.network.assets[0]!.turned = true;
    holdFieldObservation(value, 'player', 'ada', {
      kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'square', actor: 'bez' },
    }, null, ['you'], null, []);
    holdFieldObservation(value, 'player', 'ada', {
      kind: 'raw', observation: {
        kind: 'asking', tick: 0, venue: 'square', speaker: 'bez', addressedTo: 'ada',
        about: { family: 'f-field' }, overheard: false, authority: true,
      },
    }, null, ['you'], null, []);
    queueUnqueuedFieldReports(value);
    const message = value.network.directiveState!.messages[0]!;
    const speech = realizeNetworkForward(
      value, message.id, { venue: 'backroom', members: ['ada', 'you'] }, 15, STANDARD_RULES,
    )!;
    expect(speech.spoken).toMatchObject({ kind: 'field-report', items: [] });
    expect(message.payload.kind).toBe('field-report');
    expect(message.payload.kind === 'field-report'
      ? [...message.payload.sourceObservationIds].sort()
      : []).toEqual(['o0', 'o1']);
    expect(value.network.directiveState!.heldObservations.map((row) => row.deliveredAt)).toEqual([15, 15]);
  });

  it('three observers relaying one root in a cycle reaches a fixed point', () => {
    const value = world(['ada', 'bez', 'cyn']);
    for (const id of ['bez', 'cyn']) {
      value.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
      value.intel.informants.push({ id, assignedVenue: 'square' });
    }
    holdFieldObservation(value, 'player', 'ada', {
      kind: 'raw', observation: { kind: 'presence', tick: 0, venue: 'square', actor: 'cyn' },
    }, null, ['you'], null, []);

    const relayTo = (origin: string, witness: string, tick: number): void => {
      queueUnqueuedFieldReports(value);
      const message = value.network.directiveState!.messages.find((candidate) =>
        candidate.payload.kind === 'field-report' && candidate.origin === origin
        && candidate.deliveredAt === null)!;
      const speech = realizeNetworkForward(
        value, message.id, { venue: 'square', members: [origin, 'you', witness] },
        tick, STANDARD_RULES,
      )!;
      const positions = Object.fromEntries(['ada', 'bez', 'cyn'].map((id) =>
        [id, id === witness ? 'square' : 'backroom']));
      captureIntel(value, { ...speechEvents(speech), positions }, STANDARD_RULES);
    };

    relayTo('ada', 'bez', 15);
    relayTo('bez', 'cyn', 30);
    relayTo('cyn', 'ada', 45);
    queueUnqueuedFieldReports(value);
    const fixed = stableStringify({
      holds: value.network.directiveState!.heldObservations,
      messages: value.network.directiveState!.messages,
    });
    queueUnqueuedFieldReports(value);
    expect(stableStringify({
      holds: value.network.directiveState!.heldObservations,
      messages: value.network.directiveState!.messages,
    })).toBe(fixed);
    expect(value.network.directiveState!.heldObservations).toHaveLength(3);
    expect(new Set(value.network.directiveState!.heldObservations.map((row) => row.rootFingerprint)).size).toBe(1);

    holdFieldObservation(value, 'player', 'ada', {
      kind: 'raw', observation: { kind: 'presence', tick: 1, venue: 'square', actor: 'bez' },
    }, null, ['you'], null, []);
    expect(value.network.directiveState!.heldObservations).toHaveLength(4);
  });

  it('a dual-roster observer delivers isolated, audience-specific copies on separate contacts', () => {
    const value = world(['ada', 'bez', 'cyn']);
    value.network.assets[0]!.turned = true;
    value.network.enemyAssets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    value.network.spymaster = 'cyn';
    value.enemy.observers = [{ id: 'ada', vigilance: 1 }];
    value.claims[CLAIM.id] = CLAIM;
    const events: TickEvents = {
      tick: 0, positions: { ada: 'square', bez: 'square', cyn: 'backroom', you: 'backroom' }, askings: [],
      utterances: [{ tick: 0, venue: 'square', circleMembers: ['ada', 'bez'],
        speaker: 'bez', addressedTo: 'ada', claim: CLAIM, mode: 'telling' }],
    };
    captureIntel(value, events, STANDARD_RULES);
    captureEvidence(value, events, STANDARD_RULES);
    queueUnqueuedFieldReports(value);
    const playerMessage = value.network.directiveState!.messages.find((message) => message.principal === 'player')!;
    const enemyMessage = value.network.directiveState!.messages.find((message) => message.principal === 'enemy')!;

    const enemyKnowledgeBefore = stableStringify({
      evidence: value.enemy.evidence,
      digest: enemyDigest(value.enemy, 0, STANDARD_RULES),
    });
    const enemyPacketBefore = stableStringify(enemyMessage);
    const playerSpeech = realizeNetworkForward(
      value, playerMessage.id, { venue: 'backroom', members: ['ada', 'you'] }, 15, STANDARD_RULES,
    )!;
    captureIntel(value, speechEvents(playerSpeech), STANDARD_RULES);
    expect(stableStringify({
      evidence: value.enemy.evidence,
      digest: enemyDigest(value.enemy, 0, STANDARD_RULES),
    })).toBe(enemyKnowledgeBefore);
    expect(stableStringify(enemyMessage)).toBe(enemyPacketBefore);
    expect(enemyMessage.deliveredAt).toBeNull();

    const playerKnowledgeBefore = stableStringify({ intel: value.intel, view: playerView(value) });
    const enemySpeech = realizeNetworkForward(
      value, enemyMessage.id, { venue: 'backroom', members: ['ada', 'cyn'] }, 30, STANDARD_RULES,
    )!;
    captureEvidence(value, speechEvents(enemySpeech), STANDARD_RULES);
    expect(stableStringify({ intel: value.intel, view: playerView(value) })).toBe(playerKnowledgeBefore);
    const playerRow = value.intel.log.find((entry) => entry.kind === 'utterance' && entry.via === 'ada')!;
    const enemyRow = value.enemy.evidence.find((entry) => entry.kind === 'utterance' && entry.observer === 'ada')!;
    expect(playerRow.reported!.count).toBeLessThan(enemyRow.reported!.count!);
    expect(playerMessage.deliveredAt).toBe(15);
    expect(enemyMessage.deliveredAt).toBe(30);
  });
});

describe('combined remote state flips remain epistemically invisible', () => {
  function staged(): WorldState {
    const value = world(['ada', 'bez', 'cyn']);
    value.intel.requestedPosts = [{ informant: 'ada', venue: 'square', authoredAt: 0 }];
    value.intel.courierPlans = [{
      id: 'plan-visible', asset: 'ada', target: 'bez', from: 'square', to: 'backroom',
      authoredAt: 0, acknowledgedAt: null,
    }];
    value.network.pendingCouriers = [
      { planId: 'pickup-hidden', asset: 'ada', target: 'bez', viaDrop: null, queuedTick: 0,
        spec: { subject: 'cyn', predicate: 'stole', object: null, count: 1, severity: 3,
          place: null, attribution: 'someone' } },
      { planId: 'expiry-hidden', asset: 'ada', target: 'cyn', viaDrop: null, queuedTick: 0,
        spec: { subject: 'bez', predicate: 'stole', object: null, count: 1, severity: 3,
          place: null, attribution: 'someone' } },
    ];
    const state = ensureDirectiveState(value);
    state.records.push({
      id: 'd-hidden', principal: 'player', principalId: 'you', recipient: 'ada', issuedAt: 0,
      handoff: { outboundVia: [], reportVia: [] },
      authored: {
        id: 'v-hidden', parent: null, directiveId: 'd-hidden', claimedIssuer: 'you',
        replyRoute: ['you'], changedBy: null, changes: [],
        brief: {
          mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } }, priority: 'routine',
          authority: 'relationship', discretion: 'quiet', specificity: 'outcome-only', guidance: [],
          active: { from: 0, until: 60 }, report: 'outcome', reportBy: 60, purpose: null,
        },
      },
      received: null, decision: null, execution: null, receivedReports: [],
    });
    return value;
  }

  const surfaces = (value: WorldState) => ({
    player: playerView(value), network: networkView(value), courier: courierRouteView(value),
    digest: enemyDigest(value.enemy, 0, STANDARD_RULES),
  });

  it('receipt/execution/posting/pickup/expiry flips are byte-identical, with four positive controls', () => {
    const control = cloneSerializable(staged());
    const flipped = cloneSerializable(control);
    const record = flipped.network.directiveState!.records[0]!;
    record.received = { tick: 15, version: cloneSerializable(record.authored),
      handoffFrom: 'you', messageId: 'm-hidden' };
    record.execution = { state: 'completed', changedAt: 30, dueAt: null, waiting: null };
    flipped.intel.informants[0]!.assignedVenue = 'backroom';
    flipped.network.pendingCouriers = [];
    expect(stableStringify(flipped)).not.toBe(stableStringify(control));
    expect(stableStringify(surfaces(flipped))).toBe(stableStringify(surfaces(control)));

    const local = cloneSerializable(control);
    local.playerVenue = 'square';
    expect(stableStringify(playerView(local))).not.toBe(stableStringify(playerView(control)));

    const requested = cloneSerializable(control);
    requested.intel.requestedPosts!.push({ informant: 'ada', venue: 'backroom', authoredAt: 1 });
    expect(stableStringify(networkView(requested))).not.toBe(stableStringify(networkView(control)));

    const planned = cloneSerializable(control);
    planned.intel.courierPlans!.push({
      id: 'plan-visible-2', asset: 'ada', target: 'cyn', from: 'backroom', to: 'square',
      authoredAt: 1, acknowledgedAt: null,
    });
    expect(stableStringify(courierRouteView(planned)))
      .not.toBe(stableStringify(courierRouteView(control)));

    const heard = cloneSerializable(control);
    heard.enemy.evidence.push({
      tick: 0, venue: 'square', observer: 'ada', overheard: false,
      speaker: 'bez', addressedTo: 'ada', kind: 'utterance', mode: 'telling',
      claimId: CLAIM.id, family: CLAIM.family, reported: {
        subject: 'cyn', predicate: 'stole', object: null, count: 4, severity: 4,
        place: null, attribution: 'someone',
      }, about: null,
    });
    expect(stableStringify(enemyDigest(heard.enemy, 0, STANDARD_RULES)))
      .not.toBe(stableStringify(enemyDigest(control.enemy, 0, STANDARD_RULES)));
  });
});
