import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyForge } from '../../src/sim/artifacts';
import { applyAction } from '../../src/sim/campaign';
import { applyEnemyDecision, captureEvidence } from '../../src/sim/counterintel';
import { attentionAt } from '../../src/sim/debrief/attention';
import { evidenceArrivals } from '../../src/sim/debrief/evidence';
import { featureLinks, counterFeatureLinks } from '../../src/sim/debrief/feature-links';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { allocateNetworkMessage } from '../../src/sim/directives/state';
import type { NetworkSpeech } from '../../src/sim/directives/types';
import { enemyDigest } from '../../src/sim/enemy/digest';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { blankIntel } from '../../src/sim/fieldwork';
import { chooseAnswer } from '../../src/sim/inquiry';
import { observationsFor, type Asking, type TickEvents } from '../../src/sim/perception';
import { prepareTick } from '../../src/sim/phases';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';
const SPEC = { subject: 'cyn', predicate: 'met-secretly-with', object: null,
  count: 2, severity: 4 as const, place: 'square', attribution: SOMEONE };
const ANSWER_AT = at(1, 9);

function answerWorld(paper: boolean) {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
  for (const npc of fixture.npcs) {
    npc.edges = npc.edges.filter((edge) => edge.to !== 'dov');
    npc.traits = npc.id === 'bez' ? ['moralizer'] : [];
  }
  const world = buildWorld(fixture, 'forensics-boundaries', RULES);
  enrollPlayer(world, { home: 'square' });
  if (paper) {
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = at(1, 8);
    applyAction(world, { tick: world.tick, kind: 'plant', artifact: 'a0', to: 'ada', venue: null },
      RULES, prepareTick(world, RULES));
  } else {
    applyInject(world, 'ada', SPEC);
  }
  world.tick = ANSWER_AT;
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  const asking: Asking = {
    tick: ANSWER_AT, venue: 'backroom', circleMembers: ['ada', 'bez'],
    speaker: 'bez', addressedTo: 'ada', about: { family }, authority: true,
  };
  const answer = chooseAnswer(world, 'ada', asking, ANSWER_AT, RULES)!;
  expect(answer).not.toBeNull();
  const events: TickEvents = {
    tick: ANSWER_AT, positions: { ada: 'backroom', bez: 'backroom', cyn: 'square' },
    utterances: [answer], askings: [asking],
  };
  return { world, answer, events };
}

function interrogationBase(traits: string[] = []) {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
  for (const npc of fixture.npcs) {
    npc.edges = [];
    npc.traits = npc.id === 'ada' ? traits : [];
    npc.rivals = npc.id === 'ada' ? ['cyn'] : [];
  }
  fixture.npcs.find((npc) => npc.id === 'bez')!.occupation = 'guard';
  fixture.npcs.find((npc) => npc.id === 'ada')!.schedule.unshift({
    days: 'all', from: 900, to: 1020, venue: 'backroom',
  });
  const world = buildWorld(fixture, 'forensics-interrogation', RULES);
  world.enemy.map = buildTownMap(fixture);
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  world.network.spymaster = 'cyn';
  enrollPlayer(world, { home: 'square' });
  return world;
}

function interrogatedWorld(traits: string[] = [], pickup = false) {
  const world = interrogationBase(traits);
  applyForge(world, SPEC, at(0, 8), RULES);
  world.tick = at(1, 8);
  applyAction(world, { tick: world.tick, kind: 'plant', artifact: 'a0',
    to: pickup ? null : 'ada', venue: pickup ? 'square' : null },
    RULES, prepareTick(world, RULES));
  if (pickup) {
    runUntil(world, at(1, 8, 16), RULES); // pickup requires a later beat than the plant
    expect(world.artifacts![0]!.heldBy).toBe('ada');
  }
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  const issuedAt = world.tick;
  applyEnemyDecision(world, {
    day: 1, features: [], inquiries: [], watches: [],
    interrogations: [{ target: 'ada', guard: 'bez', day: 1, about: { family }, venue: 'backroom' }],
  });
  step(world, RULES);
  // A pickup consumes the first beat; deliver the order at the next actual contact.
  while (world.network.directiveState!.records[0]!.received === null && world.tick < at(1, 9)) {
    step(world, RULES);
  }
  expect(world.network.directiveState!.records[0]!.received?.tick).toBeGreaterThanOrEqual(issuedAt);
  runUntil(world, at(2, 0), RULES);
  const asking = world.chronicle.find((row) => row.kind === 'asking'
    && row.speaker === 'bez' && row.addressedTo === 'ada' && row.authority);
  expect(asking).toMatchObject({ venue: 'backroom' });
  const answer = world.enemy.evidence.find((entry) => entry.kind === 'utterance'
    && entry.mode === 'answer' && entry.speaker === 'ada')!;
  expect(answer).toMatchObject({ document: true, venue: 'backroom', observer: 'bez' });
  return { world, answer };
}

function stagedPaperAnswer(spymaster: 'bez' | 'cyn', cynArrivesAt: number | null = null) {
  const { world } = answerWorld(true);
  const family = Object.keys(world.beliefs['ada']!)[0]!;
  world.network.spymaster = spymaster;
  world.enemy.observers = [];
  if (cynArrivesAt !== null) {
    world.npcs['cyn']!.schedule = [
      { days: 'all', from: 0, to: cynArrivesAt, venue: 'backroom' },
      { days: 'all', from: cynArrivesAt, to: 1439, venue: 'square' },
    ];
  }
  world.inquiries['bez'] = [{
    about: { family }, from: 'enemy', expiresDay: 3, asked: [], answersHeard: 0,
    addressee: 'ada',
  }];
  const events = step(world, RULES);
  const answer = events.utterances.find((entry) => entry.mode === 'answer'
    && entry.speaker === 'ada' && entry.claim.family === family)!;
  expect(answer).toMatchObject({ document: true, addressedTo: 'bez' });
  const telling = world.chronicle.find((entry) => entry.kind === 'telling'
    && entry.tick === answer.tick && entry.claimId === answer.claim.id);
  if (telling?.kind !== 'telling') throw new Error('missing normal-phase answer chronicle');
  expect(telling.heardBy).toContainEqual({ id: 'bez', addressed: true });
  return { world, events, answer };
}

function captureRelayedPaper(hops: 1 | 2) {
  const { world, events } = stagedPaperAnswer('cyn', hops === 1 ? 555 : 570);
  if (hops === 2) {
    world.npcs['ada']!.traits = ['name-dropper'];
    world.npcs['ada']!.rivals = ['cyn'];
  }
  const observation = observationsFor('bez', events).observations
    .find((entry) => entry.kind === 'utterance')!;
  holdFieldObservation(world, 'enemy', 'bez', { kind: 'raw', observation },
    null, hops === 1 ? ['cyn'] : ['ada', 'cyn'], null, []);
  queueUnqueuedFieldReports(world);
  const message = world.network.directiveState!.messages[0]!;
  const before = world.enemy.evidence.length;
  runUntil(world, message.availableAfter, RULES);
  const firstEvents = step(world, RULES);
  const first = firstEvents.networkSpeeches?.find((speech) => speech.messageId === message.id);
  if (!first) throw new Error('missing normal-phase first report hop');
  let delivered = first;
  if (hops === 2) {
    runUntil(world, message.availableAfter, RULES);
    const secondEvents = step(world, RULES);
    const second = secondEvents.networkSpeeches?.find((speech) => speech.messageId === message.id);
    if (!second) throw new Error('missing normal-phase second report hop');
    delivered = second;
  }
  const added = world.enemy.evidence.slice(before);
  const network = added.find((entry) => entry.kind === 'network'
    && entry.network.messageId === message.id);
  if (network?.kind !== 'network') throw new Error('missing captured report evidence');
  const answer = added.find((entry) => entry.kind === 'utterance'
    && entry.mode === 'answer' && entry.document === true);
  if (answer?.kind !== 'utterance') throw new Error('missing received document answer');
  expect(added.indexOf(network)).toBeLessThan(added.indexOf(answer));
  const heard = world.chronicle.find((entry) => entry.kind === 'network-speech'
    && entry.tick === network.tick && entry.messageId === network.network.messageId);
  if (heard?.kind !== 'network-speech') throw new Error('missing normal-phase report chronicle');
  expect(heard.heardBy).toContainEqual({ id: network.observer, addressed: true });
  return { world, delivered, network, answer };
}

function retained(world: WorldState, feature: SketchFeature, day = 1) {
  world.enemy.decisions = [{ day, features: [cloneSerializable(feature)], inquiries: [], interrogations: [], watches: [] }];
  world.enemy.sketch = [cloneSerializable(feature)];
  world.tick = Math.max(world.tick, (day + 1) * 1440 - 1);
}
function direct() {
  const { world, answer } = stagedPaperAnswer('bez');
  const feature = enemyDigest(world.enemy, 1, RULES).features.find((row) => row.kind === 'forged-document')!;
  expect(feature).toBeDefined(); retained(world, feature);
  const index = world.enemy.evidence.findIndex((row) => row.kind === 'utterance' && row.claimId === answer.claim.id);
  const eventIndex = world.chronicle.findIndex((row) => row.kind === 'telling' && row.claimId === answer.claim.id);
  const askingIndex = world.chronicle.findIndex((row) => row.kind === 'asking' && row.tick === answer.tick
    && row.speaker === answer.addressedTo && row.addressedTo === answer.speaker);
  expect(index).toBeGreaterThanOrEqual(0); expect(eventIndex).toBeGreaterThanOrEqual(0);
  expect(askingIndex).toBeGreaterThanOrEqual(0);
  return { world, feature, index, eventIndex, askingIndex };
}
function delivered(hops: 1 | 2 = 2) {
  const value = captureRelayedPaper(hops);
  const feature = enemyDigest(value.world.enemy, 1, RULES).features.find((row) => row.kind === 'forged-document')!;
  expect(feature).toBeDefined(); retained(value.world, feature);
  const index = value.world.enemy.evidence.indexOf(value.network);
  const child = value.world.enemy.evidence.indexOf(value.answer);
  const receipt = value.world.chronicle.find((row) => row.kind === 'network-speech'
    && row.tick === value.network.tick && row.messageId === value.network.network.messageId)!;
  if (receipt.kind !== 'network-speech' || receipt.spoken.kind !== 'field-report') throw new Error('missing real receipt');
  const askingIndex = value.world.chronicle.findIndex((row) => row.kind === 'asking'
    && row.tick === value.answer.tick && row.speaker === value.answer.addressedTo && row.addressedTo === value.answer.speaker);
  return { ...value, feature, index, child, receipt, askingIndex };
}
const reference = (world: WorldState) => featureLinks(world)[0]!.references[0]!;

function multiItemReport(competing: boolean, hops: 1 | 2 = 2) {
  const first = stagedPaperAnswer('cyn', 585);
  const { world } = first;
  if (!competing) applyInject(world, 'ada', { ...SPEC, subject: 'bez', predicate: 'stole' });
  const family = competing ? first.answer.claim.family : Object.values(world.beliefs.ada!)
    .find((belief) => belief.claim.subject === 'bez')!.claim.family;
  world.inquiries.bez = [{ about: { family }, from: 'enemy', expiresDay: 3,
    asked: [], answersHeard: 0, addressee: 'ada' }];
  runUntil(world, at(1, 9, 15), RULES);
  const second = step(world, RULES);
  const secondAnswer = second.utterances.find((row) => row.mode === 'answer' && row.claim.family === family)!;
  expect(secondAnswer).toBeDefined();
  expect(secondAnswer.document === true).toBe(competing);
  for (const events of [first.events, second]) {
    const raw = observationsFor('bez', events).observations.find((row) => row.kind === 'utterance' && row.mode === 'answer')!;
    expect(raw).toBeDefined();
    holdFieldObservation(world, 'enemy', 'bez', { kind: 'raw', observation: raw }, null, hops === 1 ? ['cyn'] : ['ada', 'cyn'], null, []);
  }
  queueUnqueuedFieldReports(world);
  runUntil(world, at(1, 9, 46), RULES);
  const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'field-report')!;
  expect(packet.deliveredAt).not.toBeNull();
  const network = world.enemy.evidence.find((row) => row.kind === 'network' && row.network.messageId === packet.id)!;
  if (network.kind !== 'network' || network.network.spoken.kind !== 'field-report') throw new Error('no multi-item receipt');
  expect(network.network.spoken.items).toHaveLength(2);
  const feature = enemyDigest(world.enemy, 1, RULES).features.find((row) => row.kind === 'forged-document')!;
  expect(feature).toBeDefined(); retained(world, feature);
  const questionIds = [first.answer.tick, secondAnswer.tick].map((tick) => 'asking:' + world.chronicle.findIndex((row) =>
    row.kind === 'asking' && row.tick === tick && row.speaker === 'bez' && row.addressedTo === 'ada'));
  return { world, questionIds };
}

function watchWithEvidence(delay = 0) {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez', 'cyn'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'feature-live-watch', RULES);
  world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  const record = world.network.directiveState!.records[0]!;
  runUntil(world, at(1, 16), RULES);
  const firstWork = record.outcomes?.find((row) => row.result.enemyAction?.kind === 'watch-worked');
  // The actual outcome is generated by normal settlement on the next eligible beat.
  if (!firstWork) {
    for (let tries = 0; tries < 31 && !record.outcomes?.some((row) => row.result.enemyAction?.kind === 'watch-worked'); tries++) {
      step(world, RULES);
    }
  }
  const outcome = record.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!;
  expect(outcome, 'normal watch outcome: ' + JSON.stringify(record)).toBeDefined();
  const tick = outcome.result.enemyAction!.occurredAt;
  // Re-grow the staged watch, then deliver a real network speech on its proved work beat.
  const replay = buildWorld(town, 'feature-live-watch', RULES);
  replay.network.spymaster = 'ada';
  replay.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  replay.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(replay, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  runUntil(replay, tick + delay, RULES);
  const messageId = allocateNetworkMessage(replay, 'player', 'cyn', ['bez'],
    { kind: 'invitation-response', invitationId: 'unrelated', response: 'accept' }, replay.tick, null, null);
  const events = step(replay, RULES);
  const observation = observationsFor('bez', events).observations.find((row) => row.kind === 'network-speech' && row.messageId === messageId)!;
  expect(observation, 'watch observation: ' + JSON.stringify(events)).toBeDefined();
  const worked = replay.network.directiveState!.records[0]!.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!;
  expect(worked.result.enemyAction!.occurredAt).toBe(tick);
  holdFieldObservation(replay, 'enemy', 'bez', { kind: 'raw', observation }, null, ['ada'], null, []);
  queueUnqueuedFieldReports(replay); runUntil(replay, tick + delay + 31, RULES);
  const entry = replay.enemy.evidence.find((row) => row.kind === 'network' && row.tick === events.tick
    && row.network.messageId === messageId && row.observer === 'bez')!;
  expect(entry, 'received watch evidence: ' + JSON.stringify(replay.enemy.evidence)).toBeDefined();
  retained(replay, { id: 'watch-proof', kind: 'carrier-profile', day: 1, subject: 'cyn', family: null,
    district: 'd0', detail: 'a model fixture referencing the actual heard network speech',
    evidence: [{ tick: entry.tick, observer: entry.observer, claimId: null, messageId }] });
  const act = attentionAt(replay, replay.tick).actual.find((row) => row.kind === 'watch')!;
  expect(act).toBeDefined();
  return { world: replay, record: replay.network.directiveState!.records[0]!, act, tick };
}

describe('ordinary feature references preserve receipts and actual attention separately', () => {
  it('an untouched world has no invented features, attention or lazy state', () => {
    const world = buildWorld(miniTown(), 'feature-empty', RULES); const before = hashWorld(world);
    expect(counterFeatureLinks(world, 0)).toMatchObject({ features: [], signals: [], unresolvedFeatureIds: [], unrecordedFeatureIds: [] });
    expect(hashWorld(world)).toBe(before); expect(world.network.directiveState).toBeUndefined();
  });
  it('an actual direct paper answer keeps its claim ref and links its exact authority question', () => {
    const { world, feature, index, askingIndex } = direct();
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index],
      attentionIds: ['asking:' + askingIndex] });
    expect(reference(world).ref).toEqual(feature.evidence[0]);
    expect(reference(world).ref.claimId).not.toBeNull();
  });
  it.each([1, 2] as const)('actual %i-hop paper receipt keeps its network ref and follows the original witness root', (hops) => {
    const { world, feature, index, child, askingIndex, answer } = delivered(hops);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], attentionIds: ['asking:' + askingIndex] });
    expect(reference(world).ref).toEqual(feature.evidence[0]);
    expect(reference(world).ref.claimId).toBeNull();
    expect(reference(world).ref.messageId).not.toBeNull();
    expect(evidenceArrivals(world)[child]).toMatchObject({ reportEvidenceIndex: index, reportItemIndex: 0 });
    if (hops === 2) {
      expect(answer.observer).toBe('ada');
      const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
        && row.content.observation.kind === 'utterance')!;
      expect(raw.observer).toBe('bez');
      expect(raw.content.observation).toMatchObject({ claim: { attribution: 'you' } });
      expect(answer.reported.attribution).toBe('cyn');
      expect(feature.subject).toBe('cyn');
    }
  });
  it('a real invitational interrogation links both the asking and its compelled answer', () => {
    const { world } = interrogatedWorld();
    const feature = world.enemy.sketch.find((row) => row.kind === 'forged-document')!;
    retained(world, feature);
    const all = attentionAt(world, world.tick).actual;
    const expected = all.filter((act) => act.kind === 'questioning' || act.kind === 'compelled-answer').map((act) => act.id).sort();
    expect(expected).toHaveLength(2);
    expect(reference(world).attentionIds).toEqual(expected);
  });
  it('repeated direct evidence with the same ref remains ambiguous rather than first-match resolved', () => {
    const { world, index } = direct(); world.enemy.evidence.push(cloneSerializable(world.enemy.evidence[index]!));
    expect(reference(world)).toMatchObject({ resolution: 'ambiguous', attentionIds: [] });
    expect(reference(world).evidenceIndexes).toHaveLength(2);
  });
  it('a dated candidate plus an undated competing occurrence remains ambiguous', () => {
    const { world, index } = direct();
    const twin = cloneSerializable(world.enemy.evidence[index]!); twin.venue = 'missing-history'; world.enemy.evidence.push(twin);
    expect(reference(world)).toMatchObject({ resolution: 'ambiguous', evidenceIndexes: [index],
      undatedEvidenceIndexes: [world.enemy.evidence.length - 1], attentionIds: [] });
  });
  it('only a later receipt is explicitly late, without backdating it to the reported observation', () => {
    const { world, child } = delivered();
    const entry = world.enemy.evidence[child]!;
    const feature = { ...world.enemy.sketch[0]!, evidence: [{ tick: entry.tick, observer: entry.observer, claimId: entry.claimId, messageId: null }] };
    retained(world, feature, 0);
    expect(reference(world)).toMatchObject({ resolution: 'late', evidenceIndexes: [], laterEvidenceIndexes: [child], attentionIds: [] });
  });
  it('a later duplicate does not make the unique earlier received occurrence ambiguous', () => {
    const { world, index } = direct();
    const before = reference(world).attentionIds;
    // Actual report ingestion supplies a later row with the same inner reference.
    const entry = world.enemy.evidence[index]!;
    if (entry.kind !== 'utterance') throw new Error('missing utterance');
    const speech: NetworkSpeech = { tick: 4320, venue: 'square', speaker: entry.observer!, addressedTo: 'cyn',
      circleMembers: [entry.observer!, 'cyn'], messageId: 'late', cause: null, spoken: { kind: 'field-report', onwardTo: null,
        items: [{ factRefs: [], observation: { kind: 'utterance', observedAt: entry.tick, venue: entry.venue,
          speaker: entry.speaker, addressedTo: entry.addressedTo, overheard: entry.overheard,
          mode: entry.mode, claimId: entry.claimId, family: entry.family, reported: entry.reported, document: true } }] } };
    world.chronicle.push({ ...speech, kind: 'network-speech', heardBy: [{ id: 'cyn', addressed: true }] });
    world.network.spymaster = 'cyn'; captureEvidence(world, { tick: 4320, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] }, RULES);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], attentionIds: before });
    expect(reference(world).laterEvidenceIndexes).toHaveLength(1);
  });
  it('missing evidence and uncorroborated evidence have different results', () => {
    const { world } = direct(); world.chronicle = [];
    expect(reference(world)).toMatchObject({ resolution: 'unrecorded', attentionIds: [] });
    world.enemy.evidence = [];
    expect(reference(world)).toMatchObject({ resolution: 'missing', attentionIds: [] });
  });
  it('an orphan feature keeps an unknown recorded day despite its feature.day and observed tick', () => {
    const { world } = direct(); world.enemy.decisions = [];
    expect(featureLinks(world)[0]!.recordedDay).toBeNull();
    expect(reference(world)).toMatchObject({ resolution: 'unrecorded', attentionIds: [] });
    expect(counterFeatureLinks(world, 10).unrecordedFeatureIds).toEqual([world.enemy.sketch[0]!.id]);
  });
  it('a retained digest day takes precedence over mutable feature.day and an older observation day', () => {
    const { world, feature } = direct(); feature.day = 99; retained(world, feature, 4);
    expect(featureLinks(world)[0]).toMatchObject({ recordedDay: 4, feature: { day: 99 } });
    expect(counterFeatureLinks(world, 3).features).toEqual([]);
    expect(counterFeatureLinks(world, 4).features).toHaveLength(1);
  });
  it.each(['missing', 'short', 'extra', 'duplicate', 'null', 'object', 'number', 'empty', 'sparse'] as const)(
    '%s report roots keep the real receipt but cannot confer an original attention link', (kind) => {
      const { world, receipt } = delivered();
      const root = receipt.reportRoots![0]!;
      if (kind === 'missing') delete receipt.reportRoots;
      if (kind === 'short') receipt.reportRoots = [];
      if (kind === 'extra') receipt.reportRoots = [root, 'other'];
      if (kind === 'duplicate') receipt.reportRoots = [root, root];
      if (kind === 'null') Reflect.set(receipt, 'reportRoots', null);
      if (kind === 'object') Reflect.set(receipt, 'reportRoots', { length: 1, 0: root });
      if (kind === 'number') Reflect.set(receipt, 'reportRoots', [3]);
      if (kind === 'empty') receipt.reportRoots = [''];
      if (kind === 'sparse') receipt.reportRoots = new Array<string>(1);
      expect(() => featureLinks(world)).not.toThrow();
      expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionIds: [] });
    });
  it('a duplicate receipt record is ambiguous even if its roots and words agree', () => {
    const { world, receipt } = delivered(); world.chronicle.push(cloneSerializable(receipt));
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('a correctly sized but duplicate root array cannot associate two real received items', () => {
    const { world } = multiItemReport(false);
    const receipt = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === reference(world).ref.tick && row.messageId === reference(world).ref.messageId)!;
    if (receipt.kind !== 'network-speech') throw new Error('missing receipt');
    receipt.reportRoots = [receipt.reportRoots![0]!, receipt.reportRoots![0]!];
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionIds: [] });
    expect(evidenceArrivals(world).filter((row) => row.rootFingerprint !== undefined)).toEqual([]);
  });
  it('a partial retained child batch cannot borrow roots from the intact report envelope', () => {
    const { world, child } = delivered(); world.enemy.evidence.splice(child, 1);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'unrecorded', attentionIds: [] });
  });
  it('an incomplete one-hop batch cannot backdate a remaining reported row just because its relay heard the original', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    expect(index).toBeGreaterThanOrEqual(0);
    const remaining = world.enemy.evidence[index + 2]!;
    expect(evidenceArrivals(world)[index + 2]).toMatchObject({ timing: 'report' });
    world.enemy.evidence.splice(index + 1, 1);
    expect(world.enemy.evidence[index + 1]).toBe(remaining);
    expect(evidenceArrivals(world)[index + 1]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
  });
  it('an independent directly captured HQ question inside a broken batch span keeps its own date', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    const remaining = world.enemy.evidence[index + 2]!;
    world.enemy.evidence.splice(index + 1, 1);
    // Unit capture fixture: a separate contemporaneous asking, with its actual addressed listener.
    // The complete report/partial child above was produced by normal phases.
    const asking: Asking = { tick: remaining.tick, venue: 'square', speaker: 'ada', addressedTo: 'cyn',
      circleMembers: ['ada', 'cyn'], authority: false, about: { subject: 'bez' } };
    world.chronicle.push({ ...asking, kind: 'asking', heardBy: [{ id: 'cyn', addressed: true }] });
    captureEvidence(world, { tick: asking.tick, positions: {}, utterances: [], askings: [asking] }, RULES);
    expect(world.enemy.evidence).toHaveLength(index + 3);
    expect(world.enemy.evidence[index + 2]).toMatchObject({ kind: 'asking', observer: 'cyn' });
    expect(evidenceArrivals(world)[index + 2]).toMatchObject({ timing: 'direct', learnedAt: asking.tick });
  });
  it('byte-indistinguishable direct/report candidates inside a broken span remain unrecorded', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    world.enemy.evidence.splice(index + 1, 1);
    const candidate = cloneSerializable(world.enemy.evidence[index + 1]!);
    world.enemy.evidence.push(candidate);
    // The original physical hearing corroborates either copy. It cannot identify their append paths.
    expect(evidenceArrivals(world).slice(index + 1)).toMatchObject([
      { timing: 'unrecorded', learnedAt: null }, { timing: 'unrecorded', learnedAt: null },
    ]);
  });
  it('a broken two-item batch cannot reserve an equivalent candidate beyond its maximum append span', () => {
    const { world } = multiItemReport(false, 1);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'network' && row.network.spoken.kind === 'field-report');
    world.enemy.evidence.splice(index + 1, 1);
    const candidate = world.enemy.evidence[index + 1]!;
    world.enemy.evidence.push(cloneSerializable(candidate), cloneSerializable(candidate));
    expect(evidenceArrivals(world)[index + 3]).toMatchObject({ timing: 'direct', learnedAt: candidate.tick });
    expect(evidenceArrivals(world).slice(index + 1, index + 3).every((row) => row.learnedAt === null)).toBe(true);
  });
  it('a root-associated relayed inner answer links actual attention despite its changed attribution', () => {
    const { world, child, feature, askingIndex } = delivered();
    const entry = world.enemy.evidence[child]!;
    retained(world, { ...feature, evidence: [{ tick: entry.tick, observer: entry.observer, claimId: entry.claimId, messageId: null }] });
    expect(reference(world)).toMatchObject({ resolution: 'resolved', evidenceIndexes: [child], attentionIds: ['asking:' + askingIndex] });
  });
  it('reported-only holdings never become a reconstructed raw witness', () => {
    const { world } = delivered();
    world.network.directiveState!.heldObservations = world.network.directiveState!.heldObservations.filter((row) => row.content.kind !== 'raw');
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'unrecorded', attentionIds: [] });
  });
  it('a raw witness who did not hear the original event cannot borrow the relay or another listener', () => {
    const { world } = delivered();
    const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
      && row.content.observation.kind === 'utterance')!;
    raw.observer = 'unheard';
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'missing', attentionIds: [] });
  });
  it('two distinct raw sources under one root remain ambiguous', () => {
    const { world } = delivered();
    const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
      && row.content.observation.kind === 'utterance')!;
    const twin = cloneSerializable(raw); twin.id = 'conflict'; twin.observer = 'ada';
    world.network.directiveState!.heldObservations.push(twin);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('duplicate identical raw holdings do not invent two separate original acts', () => {
    const { world, askingIndex } = delivered();
    const raw = world.network.directiveState!.heldObservations.find((row) => row.content.kind === 'raw'
      && row.content.observation.kind === 'utterance')!;
    world.network.directiveState!.heldObservations.push(cloneSerializable(raw));
    expect(reference(world).attentionIds).toEqual(['asking:' + askingIndex]);
  });
  it('post-trait changes to the current carried packet cannot rewrite the retained receipt link', () => {
    const { world } = delivered(); const before = featureLinks(world);
    const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'field-report')!;
    if (packet.payload.kind !== 'field-report') throw new Error('missing packet');
    packet.payload.renderedItems = [];
    expect(featureLinks(world)).toEqual(before);
  });
  it('a real same-envelope unmarked answer cannot lend its unrelated question to the document feature', () => {
    const { world, questionIds } = multiItemReport(false);
    expect(reference(world).attentionIds).toEqual([questionIds[0]]);
    expect(reference(world).attentionIds).not.toContain(questionIds[1]);
  });
  it('two matching real document answers in one received envelope leave the original attention ambiguous', () => {
    const { world } = multiItemReport(true);
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
  });
  it('a runaround copied from a document lead follows the same received ref without adding other envelope items', () => {
    const { world, feature, askingIndex } = delivered();
    retained(world, { ...feature, kind: 'runaround' });
    expect(reference(world).attentionIds).toEqual(['asking:' + askingIndex]);
  });
  it('an actually heard source on an actual normal-phase worked beat links the retained watch episode', () => {
    const { world, act } = watchWithEvidence();
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'linked' });
    expect(reference(world).attentionIds).toContain(act.id);
  });
  it('an earlier recorded work beat does not prove that a later coincident observation was watch work', () => {
    const { world, act, tick } = watchWithEvidence(15);
    expect(attentionAt(world, world.tick).actual.some((row) => row.id === act.id)).toBe(true);
    expect(reference(world).ref.tick).toBe(tick + 15);
    expect(reference(world).attentionIds).not.toContain(act.id);
  });
  it('issued watch state and headquarters claims cannot replace missing physical outcomes', () => {
    const { world, record } = watchWithEvidence(); delete record.outcomes;
    expect(reference(world).attentionIds.some((id) => id.startsWith('watch:'))).toBe(false);
    expect(world.enemy.sketch).toHaveLength(1);
  });
  it('an actual questioning signal and feature link coexist without deriving attention from a feature id', () => {
    const { world, askingIndex, feature } = direct();
    const asking = world.chronicle[askingIndex]!;
    if (asking.kind !== 'asking') throw new Error('missing question');
    world.intel.log.push({ ...blankIntel(), kind: 'asking', tick: asking.tick, venue: asking.venue,
      via: 'self', overheard: false, speaker: asking.speaker, addressedTo: asking.addressedTo, about: asking.about, authority: true });
    const model = counterFeatureLinks(world, 1);
    expect(model.signals[0]).toMatchObject({ attentionIds: ['asking:' + askingIndex], featureIds: [feature.id] });
    world.enemy.decisions = []; world.enemy.sketch = [];
    expect(counterFeatureLinks(world, 1).signals[0]).toMatchObject({ attentionIds: ['asking:' + askingIndex], featureIds: [] });
  });
  it('a duplicate original telling or same-beat asking cannot be chosen silently', () => {
    for (const which of ['telling', 'asking'] as const) {
      const { world, eventIndex, askingIndex } = direct();
      world.chronicle.push(cloneSerializable(world.chronicle[which === 'telling' ? eventIndex : askingIndex]!));
      expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'ambiguous', attentionIds: [] });
    }
  });
  it('same family, target and words at another tick do not create an attention link', () => {
    const { world, askingIndex } = direct(); world.chronicle[askingIndex]!.tick -= 15;
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionIds: [] });
  });
  it('a missing claim never recovers source content from a similarly worded claim', () => {
    const { world, index } = direct(); const id = world.enemy.evidence[index]!.claimId!;
    world.claims['similar'] = { ...world.claims[id]!, id: 'similar' }; delete world.claims[id];
    expect(reference(world)).toMatchObject({ resolution: 'resolved', attentionResolution: 'unrecorded', attentionIds: [] });
  });
  it('direct asking refs resolve to their own actual event', () => {
    const { world, feature } = direct();
    const row: Asking = { tick: 2040, venue: 'square', speaker: 'ada', addressedTo: 'bez',
      circleMembers: ['ada', 'bez'], about: { subject: 'cyn' }, authority: true };
    const chronicleIndex = world.chronicle.length;
    world.chronicle.push({ ...row, kind: 'asking', heardBy: [{ id: 'bez', addressed: true }] });
    captureEvidence(world, { tick: row.tick, positions: {}, utterances: [], askings: [row] }, RULES);
    retained(world, { ...feature, kind: 'runaround', evidence: [{ tick: row.tick, observer: 'bez', claimId: null, messageId: null }] });
    expect(reference(world).attentionIds).toEqual(['asking:' + chronicleIndex]);
  });
  it.each(['extended-ref', 'physical-kind'] as const)('a %s remains unsupported without borrowing an ordinary null-id asking', (kind) => {
    const { world, feature } = direct();
    if (kind === 'extended-ref') Reflect.set(feature.evidence[0]!, 'residue', { operation: 's0' });
    else Reflect.set(feature, 'kind', 'arcane-residue');
    retained(world, feature);
    expect(reference(world)).toMatchObject({ resolution: 'unsupported', attentionIds: [] });
  });
  it('read-only folds and all nested feature/reference/index/attention arrays own their output', () => {
    const { world } = direct(); const before = hashWorld(world);
    const first = counterFeatureLinks(world, 1); const same = counterFeatureLinks(world, 1);
    expect(first).toEqual(same);
    first.features[0]!.feature.evidence[0]!.observer = 'mutated';
    first.features[0]!.references[0]!.ref.observer = 'other';
    first.features[0]!.references[0]!.evidenceIndexes.push(999);
    first.features[0]!.references[0]!.attentionIds.push('wrong');
    first.attention.actual[0]!.chronicleIndexes.push(999);
    expect(hashWorld(world)).toBe(before);
    expect(counterFeatureLinks(world, 1)).toEqual(same);
  });
});

describe('independent feature-link acquisition boundaries', () => {
  it('an uncorroborated real one-hop wrapper cannot backdate its still-retained children', () => {
    const { world, child, receipt } = delivered(1);
    const before = evidenceArrivals(world)[child]!;
    expect(before).toMatchObject({ timing: 'report', learnedAt: receipt.tick });
    expect(before.learnedAt).toBeGreaterThan(before.observedAt);
    const originalTellings = world.chronicle.filter((row) => row.kind === 'telling');
    expect(originalTellings.length).toBeGreaterThan(0);
    world.chronicle = world.chronicle.filter((row) => row !== receipt);
    expect(world.chronicle.filter((row) => row.kind === 'telling')).toEqual(originalTellings);
    expect(evidenceArrivals(world)[child]).toMatchObject({ timing: 'unrecorded', learnedAt: null });
  });

  it('an independently retained real wrapper restores its actual receipt date', () => {
    const { world, child, receipt } = delivered(1);
    const expected = cloneSerializable(evidenceArrivals(world)[child]);
    const position = world.chronicle.indexOf(receipt);
    world.chronicle.splice(position, 1);
    world.chronicle.splice(position, 0, receipt);
    expect(evidenceArrivals(world)[child]).toEqual(expected);
    expect(expected).toMatchObject({ timing: 'report', learnedAt: receipt.tick });
  });

  it('a reserved nested network child stays unknown while a distinct direct row in its span stays direct', () => {
    const world = buildWorld(miniTown(), 'independent-nested-batch', RULES);
    world.network.spymaster = 'cyn'; world.enemy.observers = [];
    const inner: NetworkSpeech = { tick: 1980, venue: 'square', circleMembers: ['ada', 'cyn'],
      speaker: 'ada', addressedTo: 'cyn', messageId: 'inner', cause: null,
      spoken: { kind: 'field-report', onwardTo: null, items: [{ factRefs: [], observation: {
        kind: 'asking', observedAt: 1900, venue: 'square', speaker: 'bez', addressedTo: 'ada',
        overheard: false, authority: true, about: { subject: 'bez' },
      } }] } };
    const outer: NetworkSpeech = { tick: 2880, venue: 'square', circleMembers: ['ada', 'cyn'],
      speaker: 'ada', addressedTo: 'cyn', messageId: 'outer', cause: null,
      spoken: { kind: 'field-report', onwardTo: null, items: [
        { factRefs: [], observation: { kind: 'asking', observedAt: 1890, venue: 'square',
          speaker: 'bez', addressedTo: 'ada', overheard: false, authority: true, about: { subject: 'ada' } } },
        { factRefs: [], observation: { kind: 'network-speech', observedAt: inner.tick, venue: inner.venue,
          speaker: inner.speaker, addressedTo: inner.addressedTo, overheard: false,
          messageId: inner.messageId, spoken: inner.spoken } },
      ] } };
    // Unit acquisition fixture: these explicit chronicle hearings accompany real captureEvidence.
    // Only the outer wrapper is acquired as evidence here; the inner is its projected child.
    world.chronicle.push({ ...inner, kind: 'network-speech', heardBy: [{ id: 'cyn', addressed: true }] },
      { ...outer, kind: 'network-speech', heardBy: [{ id: 'cyn', addressed: true }] });
    captureEvidence(world, { tick: outer.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [outer] }, RULES);
    expect(world.enemy.evidence).toHaveLength(3);
    expect(evidenceArrivals(world)[2]).toMatchObject({ timing: 'report', learnedAt: outer.tick });
    world.enemy.evidence.splice(1, 1);
    const directAsk: Asking = { tick: 2895, venue: 'square', circleMembers: ['ada', 'cyn'],
      speaker: 'ada', addressedTo: 'cyn', authority: false, about: { subject: 'cyn' } };
    world.chronicle.push({ ...directAsk, kind: 'asking', heardBy: [{ id: 'cyn', addressed: true }] });
    captureEvidence(world, { tick: directAsk.tick, positions: {}, utterances: [], askings: [directAsk] }, RULES);
    expect(world.enemy.evidence).toHaveLength(3);
    expect(evidenceArrivals(world)).toMatchObject([
      { timing: 'direct', learnedAt: outer.tick },
      { timing: 'unrecorded', learnedAt: null },
      { timing: 'direct', learnedAt: directAsk.tick },
    ]);
  });
});
