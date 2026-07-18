import { describe, expect, it } from 'vitest';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { captureEvidence } from '../../src/sim/counterintel';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { issueDirectiveRecord, recordScrutiny } from '../../src/sim/directives/state';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type {
  DirectiveBrief, DirectiveRecord, NetworkMessage, NetworkSpeech,
} from '../../src/sim/directives/types';
import { captureIntel } from '../../src/sim/fieldwork';
import { stableStringify } from '../../src/sim/hash';
import type { AssetRecord } from '../../src/sim/network/types';
import { runTurncoatPass } from '../../src/sim/network/turncoats';
import { prepareTick } from '../../src/sim/phases';
import type { TickEvents } from '../../src/sim/perception';
import type { WorldState } from '../../src/sim/types';
import { enrollPlayer } from '../../src/sim/world';
import { watchfordWorld } from '../sim/helpers/watchford-world';

const RULES = STANDARD_RULES;

const asset = (id: string, overrides: Partial<AssetRecord> = {}): AssetRecord => ({
  id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], ...overrides,
});

const TEST_OVERRIDE = {
  fromDay: 0, toDay: 20, from: 0, to: 1440, source: 'player' as const,
};

/**
 * One deterministic dual-principal fixture, built from the real Watchford roster plus player
 * enrollment. Test-authored schedule overrides keep the two handlers physically separated until a
 * test explicitly prepends a same-room contact; production receives no force hook.
 */
function stagedDualNetwork(seed = 'handler-delivery'): {
  world: WorldState;
  playerAsset: AssetRecord;
  walkIn: AssetRecord;
  player: string;
  spymaster: string;
} {
  const world = watchfordWorld(seed);
  enrollPlayer(world, { home: 'home-gs' });
  const player = world.playerId!;
  const spymaster = 'hugo';
  world.network.spymaster = spymaster;

  const playerAsset = asset('mira', { turned: true });
  const walkIn = asset('sten', { turned: true });
  world.network.assets.push(asset('gale'), playerAsset, asset('sten'));
  world.network.enemyAssets.push(asset('mira'), walkIn, asset(spymaster));

  // Received-profile inputs are real relationship edges, not evaluator constants.
  world.npcs.mira!.edges.push({ to: player, kind: 'friend', trust: 0.8 });
  world.npcs.sten!.edges.push({ to: spymaster, kind: 'friend', trust: 0.8 });

  world.scheduleOverrides.mira = [{ ...TEST_OVERRIDE, venue: 'square-w0', sourceRef: 'test:mira' }];
  world.scheduleOverrides.sten = [{ ...TEST_OVERRIDE, venue: 'square-w0', sourceRef: 'test:sten' }];
  world.scheduleOverrides.gale = [{ ...TEST_OVERRIDE, venue: 'square-w0', sourceRef: 'test:gale' }];
  world.scheduleOverrides[spymaster] = [{
    ...TEST_OVERRIDE, venue: 'square-w1', sourceRef: 'test:spymaster',
  }];
  world.playerVenue = 'square-w1';
  return { world, playerAsset, walkIn, player, spymaster };
}

function pendingPayloads(world: WorldState, origin: string) {
  return (world.network.directiveState?.messages ?? [])
    .filter((message) => message.origin === origin
      && message.deliveredAt === null && message.failedAt === null)
    .map((message) => message.payload);
}

function contact(world: WorldState, a: string, b: string, tick: number, venue = 'guard-post-w0') {
  world.tick = tick;
  if (a === world.playerId || b === world.playerId) world.playerVenue = venue;
  world.scheduleOverrides[a] = [{
    fromDay: Math.floor(tick / TICKS_PER_DAY), toDay: Math.floor(tick / TICKS_PER_DAY) + 1,
    from: 0, to: 1440, venue, source: 'player', sourceRef: `test:contact:${a}:${tick}`,
  }, ...(world.scheduleOverrides[a] ?? [])];
  world.scheduleOverrides[b] = [{
    fromDay: Math.floor(tick / TICKS_PER_DAY), toDay: Math.floor(tick / TICKS_PER_DAY) + 1,
    from: 0, to: 1440, venue, source: 'player', sourceRef: `test:contact:${b}:${tick}`,
  }, ...(world.scheduleOverrides[b] ?? [])];
  const circle = prepareTick(world, RULES).circles.find((candidate) =>
    candidate.members.includes(a) && candidate.members.includes(b));
  expect(circle, `physical contact ${a}/${b} at ${venue}`).toBeDefined();
  return circle!;
}

function eventsFor(speech: NetworkSpeech): TickEvents {
  return {
    tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
  };
}

function brief(overrides: Partial<DirectiveBrief> = {}): DirectiveBrief {
  return {
    mission: { kind: 'learn', target: { kind: 'person', id: 'otto' } },
    priority: 'important', authority: 'office', discretion: 'open', specificity: 'guided',
    guidance: [
      { kind: 'expected-presence', person: 'otto', venue: 'square-w0', at: at(2, 8) },
      { kind: 'note', text: 'because the source may leave town' },
    ],
    active: { from: 0, until: at(12, 23, 59) },
    report: 'outcome', reportBy: null, purpose: 'identify the source before departure',
    ...overrides,
  };
}

function issueAndReceivePlayerBrief(world: WorldState): {
  record: DirectiveRecord;
  copy: NetworkMessage;
} {
  world.tick = 0;
  const record = issueDirectiveRecord(world, {
    principal: 'player', principalId: world.playerId!, recipient: 'mira',
    handoff: { outboundVia: ['gale'], reportVia: [] }, brief: brief(), tick: 0, cause: null,
  });
  const outbound = world.network.directiveState!.messages[0]!;
  expect(realizeNetworkForward(
    world, outbound.id, contact(world, world.playerId!, 'gale', 0), 0, RULES,
  )).not.toBeNull();
  expect(realizeNetworkForward(
    world, outbound.id, contact(world, 'gale', 'mira', 15), 15, RULES,
  )).not.toBeNull();
  expect(stableStringify(record.received!.version)).not.toBe(stableStringify(record.authored));
  const copies = world.network.directiveState!.messages.filter((message) =>
    message.payload.kind === 'handler-brief');
  expect(copies).toHaveLength(1);
  return { record, copy: copies[0]! };
}

function mutateEverySourceStage(record: DirectiveRecord): void {
  record.received!.tick += 1;
  record.received!.version.brief.priority = 'routine';
  record.received!.version.claimedIssuer = 'otto';
  record.received!.version.replyRoute = null;
  record.received!.handoffFrom = 'otto';
  record.received!.messageId = 'source-mutated';
  const decision = record.decision!;
  decision.interpretation = { kind: 'learn', target: { kind: 'venue', id: 'square-w1' } };
  decision.commitment = 'refuse';
  decision.initiative = 'literal';
  decision.risk = 'avoidant';
  decision.method = { kind: 'hold' };
  decision.timing = { actAt: null, reportAt: null };
  decision.disclosure = {
    outcome: false, reason: false, evidence: false, source: false, uncertainty: false,
  };
  decision.candor = 'guarded';
  record.execution = { state: 'aborted', changedAt: 99, dueAt: null, waiting: null };
}

describe('generic turncoat content waits for a real handler', () => {
  it('keeps a generic leak queued/cursorless through separation, then records one digest-inert row at contact', () => {
    const { world, playerAsset, spymaster } = stagedDualNetwork('handler-generic-leak');
    playerAsset.facts.push({ tick: 0, kind: 'recruited-by', ref: 'you' });
    const evidence0 = world.enemy.evidence.length;
    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.enemy.evidence).toHaveLength(evidence0);
    expect(playerAsset.leakedThrough ?? 0).toBe(0);
    expect(pendingPayloads(world, playerAsset.id)).toEqual([
      expect.objectContaining({ kind: 'compartment-fact', factIndex: 0 }),
    ]);

    const message = world.network.directiveState!.messages.find((row) =>
      row.payload.kind === 'compartment-fact')!;
    world.tick = at(8, 12);
    for (const circle of prepareTick(world, RULES).circles.filter((row) =>
      row.members.includes(playerAsset.id))) {
      expect(realizeNetworkForward(world, message.id, circle, world.tick, RULES)).toBeNull();
    }
    expect(world.enemy.evidence).toHaveLength(evidence0);
    expect(playerAsset.leakedThrough ?? 0).toBe(0);

    const beforeDigest = structuredClone(world.enemy);
    const circle = contact(world, playerAsset.id, spymaster, at(9, 8));
    const speech = realizeNetworkForward(world, message.id, circle, world.tick, RULES)!;
    captureEvidence(world, eventsFor(speech), RULES);
    const leaks = world.enemy.evidence.filter((row) => row.leaked?.from === playerAsset.id);
    expect(leaks).toHaveLength(1);
    expect(leaks[0]).toMatchObject({
      tick: world.tick, venue: 'guard-post-w0', observer: playerAsset.id, overheard: false,
      speaker: playerAsset.id, addressedTo: spymaster,
      kind: 'network', mode: null, claimId: null, family: null, reported: null, about: null,
      network: { messageId: message.id, sourceDirectiveId: null, spoken: speech.spoken },
    });
    expect(playerAsset.leakedThrough).toBe(1);
    expect(stableStringify(world.enemy)).not.toBe(stableStringify(beforeDigest));
    expect(stableStringify(enemyDigest(world.enemy, 9, RULES)))
      .toBe(stableStringify(enemyDigest(beforeDigest, 9, RULES)));

    world.tick = at(10, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.network.directiveState!.messages.filter((row) =>
      row.payload.kind === 'compartment-fact')).toHaveLength(1);
  });

  it('keeps a walk-in tip hidden while separated and writes the actual meeting venue once', () => {
    const { world, walkIn, player } = stagedDualNetwork('handler-walk-in');
    world.enemy.sketch.push({
      id: 'sf-walk', kind: 'carrier-profile', day: 1, family: null, subject: 'otto',
      district: 'w0', detail: 'Otto carries the watched story',
      evidence: [{ tick: 0, observer: 'hugo', claimId: null }],
    });
    const hints0 = world.intel.log.filter((row) => row.kind === 'hint').length;
    world.tick = at(6, 23, 59);
    runTurncoatPass(world, RULES);
    expect(world.intel.log.filter((row) => row.kind === 'hint')).toHaveLength(hints0);
    expect(walkIn.revealedThrough ?? 0).toBe(0);

    const message = world.network.directiveState!.messages.find((row) =>
      row.payload.kind === 'sketch-tip')!;
    world.tick = at(8, 12);
    for (const circle of prepareTick(world, RULES).circles.filter((row) =>
      row.members.includes(walkIn.id))) {
      expect(realizeNetworkForward(world, message.id, circle, world.tick, RULES)).toBeNull();
    }
    expect(walkIn.revealedThrough ?? 0).toBe(0);

    const circle = contact(world, walkIn.id, player, at(9, 8), 'guard-post-w0');
    const speech = realizeNetworkForward(world, message.id, circle, world.tick, RULES)!;
    captureIntel(world, eventsFor(speech), RULES);
    const hints = world.intel.log.filter((row) => row.kind === 'hint');
    expect(hints).toHaveLength(hints0 + 1);
    expect(hints.at(-1)).toMatchObject({
      tick: world.tick, venue: 'guard-post-w0', via: walkIn.id,
      hintAbout: 'otto', hintWitness: walkIn.id,
    });
    expect(walkIn.revealedThrough).toBe(1);
  });
});

describe('stolen received briefs become evidence, never source-record execution', () => {
  it('copies the received version for the secret audience and is byte-independent both ways', () => {
    const control = stagedDualNetwork('handler-received-copy-control').world;
    const mutated = stagedDualNetwork('handler-received-copy-control').world;
    const controlReceipt = issueAndReceivePlayerBrief(control);
    const mutatedReceipt = issueAndReceivePlayerBrief(mutated);

    expect(controlReceipt.copy.payload).toEqual({
      kind: 'handler-brief', sourceDirectiveId: controlReceipt.record.id,
      version: structuredClone(controlReceipt.record.received!.version),
    });
    expect(controlReceipt.record.authored.brief.specificity).toBe('guided');
    expect(controlReceipt.record.received!.version.brief.specificity).toBe('detailed');

    mutateEverySourceStage(mutatedReceipt.record);
    const sourceBeforeArrival = stableStringify(mutatedReceipt.record);
    const deliver = (world: WorldState, copy: NetworkMessage) => {
      const circle = contact(world, copy.holder, world.network.spymaster!, at(2, 8));
      const speech = realizeNetworkForward(world, copy.id, circle, world.tick, RULES)!;
      captureEvidence(world, eventsFor(speech), RULES);
      return { speech, evidence: world.enemy.evidence.at(-1)! };
    };
    const expected = deliver(control, controlReceipt.copy);
    const actual = deliver(mutated, mutatedReceipt.copy);
    expect(stableStringify(actual.evidence)).toBe(stableStringify(expected.evidence));
    expect(actual.speech.spoken).toMatchObject({
      kind: 'handler-brief', brief: { specificity: 'detailed' },
    });
    expect(actual.speech.spoken).not.toHaveProperty('sourceDirectiveId');
    expect(actual.evidence.network).toMatchObject({
      messageId: mutatedReceipt.copy.id,
      sourceDirectiveId: mutatedReceipt.record.id,
      spoken: actual.speech.spoken,
    });
    expect(stableStringify(mutatedReceipt.record)).toBe(sourceBeforeArrival);
  });

  it('uses the opposite audience roster in both directions, never the deceived-principal overlay', () => {
    const playerToEnemy = stagedDualNetwork('handler-audience-player').world;
    const playerReceipt = issueAndReceivePlayerBrief(playerToEnemy);
    const enemyCircle = contact(playerToEnemy, 'mira', 'hugo', at(2, 8));
    const enemySpeech = realizeNetworkForward(
      playerToEnemy, playerReceipt.copy.id, enemyCircle, playerToEnemy.tick, RULES,
    )!;
    expect(enemySpeech.spoken).toMatchObject({
      kind: 'handler-brief', brief: { priority: 'important', specificity: 'detailed' },
    });

    const enemyToPlayer = stagedDualNetwork('handler-audience-enemy').world;
    enemyToPlayer.tick = 0;
    const record = issueDirectiveRecord(enemyToPlayer, {
      principal: 'enemy', principalId: 'hugo', recipient: 'sten',
      handoff: { outboundVia: [], reportVia: [] }, brief: brief(), tick: 0, cause: null,
    });
    const outbound = enemyToPlayer.network.directiveState!.messages[0]!;
    expect(realizeNetworkForward(
      enemyToPlayer, outbound.id, contact(enemyToPlayer, 'hugo', 'sten', 0), 0, RULES,
    )).not.toBeNull();
    const copy = enemyToPlayer.network.directiveState!.messages.find((message) =>
      message.payload.kind === 'handler-brief')!;
    const playerCircle = contact(enemyToPlayer, 'sten', enemyToPlayer.playerId!, at(2, 8));
    const playerSpeech = realizeNetworkForward(enemyToPlayer, copy.id, playerCircle, enemyToPlayer.tick, RULES)!;
    captureIntel(enemyToPlayer, eventsFor(playerSpeech), RULES);
    expect(record.received).not.toBeNull();
    expect(playerSpeech.spoken).toMatchObject({
      kind: 'handler-brief', brief: { priority: 'important', specificity: 'guided' },
    });
    expect(enemyToPlayer.intel.network!.at(-1)).toMatchObject({
      messageId: copy.id, spoken: playerSpeech.spoken,
    });
  });

  it('projects the handler copy from traits and secret-audience scrutiny at actual contact time', () => {
    const low = stagedDualNetwork('handler-contact-projection').world;
    const high = stagedDualNetwork('handler-contact-projection').world;
    const lowReceipt = issueAndReceivePlayerBrief(low);
    const highReceipt = issueAndReceivePlayerBrief(high);

    // These changes happen after queueing. A frozen queue-time projection would miss both.
    expect(lowReceipt.copy.payload).toMatchObject({
      kind: 'handler-brief', version: { brief: { priority: 'important', specificity: 'detailed' } },
    });
    low.npcs.mira!.traits = ['minimizer'];
    high.npcs.mira!.traits = ['minimizer'];
    recordScrutiny(high, 'mira', 'hugo', 'confrontation', at(2, 8));
    recordScrutiny(high, 'mira', 'hugo', 'authority-pressure', at(2, 8));

    const deliver = (world: WorldState, copy: NetworkMessage) => {
      const circle = contact(world, 'mira', 'hugo', at(2, 8));
      return realizeNetworkForward(world, copy.id, circle, world.tick, RULES)!.spoken;
    };
    const lowSpeech = deliver(low, lowReceipt.copy);
    const highSpeech = deliver(high, highReceipt.copy);
    expect(lowSpeech).toMatchObject({
      kind: 'handler-brief', brief: { priority: 'routine', specificity: 'guided' },
    });
    expect(highSpeech).toMatchObject({
      kind: 'handler-brief', brief: { priority: 'important', specificity: 'detailed' },
    });
  });

  it('applies doctored, omissive, guarded-delay, and guarded-avoidant copy policy exactly', () => {
    const stagePolicy = (
      seed: string, scrutiny: 'low' | 'mid' | 'high', overrides: Partial<DirectiveBrief> = {},
    ) => {
      const { world } = stagedDualNetwork(seed);
      if (scrutiny === 'mid' || scrutiny === 'high') {
        recordScrutiny(world, 'mira', world.playerId!, 'confrontation', 0);
      }
      if (scrutiny === 'high') {
        recordScrutiny(world, 'mira', world.playerId!, 'authority-pressure', 0);
      }
      world.tick = 0;
      const record = issueDirectiveRecord(world, {
        principal: 'player', principalId: world.playerId!, recipient: 'mira',
        handoff: { outboundVia: [], reportVia: [] }, brief: brief(overrides), tick: 0, cause: null,
      });
      const outbound = world.network.directiveState!.messages[0]!;
      realizeNetworkForward(
        world, outbound.id, contact(world, world.playerId!, 'mira', 0), 0, RULES,
      );
      const copies = world.network.directiveState!.messages.filter((message) =>
        message.payload.kind === 'handler-brief');
      return { world, record, copies };
    };

    const doctored = stagePolicy('handler-policy-low', 'low');
    expect(doctored.record.decision!.candor).toBe('doctored');
    expect(doctored.copies).toHaveLength(1);
    expect(doctored.copies[0]!.availableAfter).toBe(0);
    expect(doctored.copies[0]!.payload).toMatchObject({
      kind: 'handler-brief', version: { brief: { purpose: 'identify the source before departure' } },
    });

    const omissive = stagePolicy('handler-policy-mid', 'mid');
    expect(omissive.record.decision!.candor).toBe('omissive');
    expect(omissive.copies).toHaveLength(1);
    expect(omissive.copies[0]!.availableAfter).toBe(0);
    const omitted = omissive.copies[0]!.payload;
    expect(omitted.kind === 'handler-brief' ? omitted.version.brief.purpose : 'wrong').toBeNull();
    expect(omitted.kind === 'handler-brief' ? omitted.version.brief.guidance : [])
      .toEqual([expect.objectContaining({ kind: 'expected-presence' })]);

    const guarded = stagePolicy('handler-policy-high', 'high', {
      priority: 'urgent', authority: 'compel', discretion: 'open',
    });
    expect(guarded.record.decision).toMatchObject({ candor: 'guarded', risk: 'measured' });
    expect(guarded.copies).toHaveLength(1);
    expect(guarded.copies[0]!.availableAfter).toBe(TICKS_PER_DAY);

    const avoidant = stagePolicy('handler-policy-avoidant', 'high', {
      priority: 'routine', authority: 'request', discretion: 'compartmented',
    });
    expect(avoidant.record.decision).toMatchObject({ candor: 'guarded', risk: 'avoidant' });
    expect(avoidant.copies).toHaveLength(0);
  });
});
