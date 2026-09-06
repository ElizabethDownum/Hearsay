import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyForge } from '../../src/sim/artifacts';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { applyEnemyDecision, captureEvidence } from '../../src/sim/counterintel';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { captureIntel } from '../../src/sim/fieldwork';
import { setDispositionEdge } from '../../src/sim/network/roster';
import { runTurncoatPass } from '../../src/sim/network/turncoats';
import { chooseAnswer } from '../../src/sim/inquiry';
import { observationsFor, type Asking, type TickEvents } from '../../src/sim/perception';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { HEARSAY_CEILING } from '../../src/sim/rumors/propagation';
import { runUntil, step } from '../../src/sim/step';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import { auditSketch } from './helpers/forensics-audit';
import { miniTown } from './helpers/minitown';

const SPEC = {
  subject: 'cyn', predicate: 'met-secretly-with', object: null,
  count: 2, severity: 4 as const, place: 'square', attribution: SOMEONE,
};
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

function medium(value: object, paper: boolean) {
  expect(Object.prototype.hasOwnProperty.call(value, 'document')).toBe(paper);
  if (paper) expect(value).toHaveProperty('document', true);
}

/** Stage an order, never the yield: real delivery, guard application, answer and report follow. */
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

describe('forensics follows the hand named in testimony', () => {
  it('a real interrogation traces a direct hand-over to the avatar with a fair-cop reference', () => {
    const { world, answer } = interrogatedWorld();
    const features = world.enemy.sketch.filter((feature) => feature.kind === 'forged-document');
    const delivery = world.enemy.evidence.find((entry) => entry.kind === 'network'
      && entry.network.spoken.kind === 'field-report'
      && entry.network.spoken.items.some((item) => item.observation.kind === 'utterance'
        && item.observation.claimId === answer.claimId));
    if (delivery?.kind !== 'network') throw new Error('missing received document report evidence');
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({ subject: 'you', evidence: [{
      tick: delivery.tick, observer: delivery.observer, claimId: null,
      messageId: delivery.network.messageId,
    }] });
    auditSketch(world);
    const withPaper = exposureStatus(world);
    world.enemy.sketch = world.enemy.sketch.filter((feature) => feature.kind !== 'forged-document');
    expect(withPaper.score).toBe(exposureStatus(world).score + 1);
    expect(withPaper.identified).toBe(false);
  });

  it('a name-dropper can blame another hand; the digest trusts the answer as spoken', () => {
    const { world, answer } = interrogatedWorld(['name-dropper']);
    expect(answer.reported?.attribution).toBe('cyn');
    expect(world.beliefs['ada']![answer.family!]!.heardFrom).toBe('you');
    expect(world.enemy.sketch.filter((feature) => feature.kind === 'forged-document'))
      .toMatchObject([{ subject: 'cyn' }]);
    auditSketch(world);
  });

  it('a vaguener can hide the hand even while admitting that the answer came from paper', () => {
    const { world, answer } = interrogatedWorld(['vaguener']);
    expect(answer.reported?.attribution).toBe(SOMEONE);
    expect(world.enemy.sketch.filter((feature) => feature.kind === 'forged-document')).toEqual([]);
    auditSketch(world);
  });

  it('repeated answers and later digests dedupe by kind and disclosed subject', () => {
    const { world, events } = answerWorld(true);
    world.network.spymaster = 'bez';
    world.enemy.observers = [];
    captureEvidence(world, events, RULES);
    captureEvidence(world, events, RULES);
    const first = enemyDigest(world.enemy, 1, RULES);
    const papers = first.features.filter((feature) => feature.kind === 'forged-document');
    expect(papers).toHaveLength(1);
    expect(papers[0]!.evidence).toHaveLength(1); // H5 retains the first supporting answer.
    world.enemy.sketch.push(...first.features);
    world.enemy.featureCounter += first.features.length;
    expect(enemyDigest(world.enemy, 2, RULES).features
      .filter((feature) => feature.kind === 'forged-document')).toEqual([]);
  });
});

describe('paper traces in the rest of the campaign', () => {
  it('a planted page remains anonymous when its finder is compelled to answer', () => {
    const { world, answer } = interrogatedWorld([], true);
    expect(answer.reported?.attribution).toBe('ada');
    expect(world.enemy.sketch.filter((feature) => feature.kind === 'forged-document')).toEqual([]);
    auditSketch(world);
  });

  function circulatedWorld() {
    const world = interrogationBase();
    world.npcs['ada']!.edges.push({ to: 'bez', kind: 'friend', trust: 0.8 });
    applyForge(world, SPEC, at(0, 8), RULES);
    world.tick = at(1, 8);
    const frame = prepareTick(world, RULES);
    finishTick(world, RULES, frame, () => applyAction(world, {
      tick: world.tick, kind: 'plant', artifact: 'a0', to: 'ada', venue: null,
    }, RULES, frame));
    runUntil(world, at(1, 8, 16), RULES);
    expect(world.chronicle.some((row) => row.kind === 'artifact'
      && row.act === 'reshow' && row.by === 'ada' && row.to === 'bez')).toBe(true);
    return world;
  }

  it('uninterrogated hand-over and re-show circulation supplies no document feature', () => {
    const world = circulatedWorld();
    expect(world.chronicle.filter((row) => row.kind === 'asking')).toEqual([]);
    expect(enemyDigest(world.enemy, 1, RULES).features
      .filter((feature) => feature.kind === 'forged-document')).toEqual([]);
  });

  function disclosedInformant() {
    const world = circulatedWorld();
    const family = Object.values(world.beliefs['bez']!)
      .find((belief) => belief.heardFrom === 'ada' && belief.credence > HEARSAY_CEILING)!.claim.family;
    const asking: Asking = {
      tick: world.tick, venue: 'backroom', circleMembers: ['bez', 'cyn'],
      speaker: 'cyn', addressedTo: 'bez', about: { family }, authority: true,
    };
    const answer = chooseAnswer(world, 'bez', asking, world.tick, RULES)!;
    expect(answer).toMatchObject({ document: true, claim: { attribution: 'ada' } });
    captureEvidence(world, { tick: world.tick, positions: {}, askings: [asking], utterances: [answer] }, RULES);
    // Isolate the newly folded kind for the unchanged kind-agnostic consumers.
    world.enemy.sketch = enemyDigest(world.enemy, 1, RULES).features
      .filter((feature) => feature.kind === 'forged-document');
    expect(world.enemy.sketch).toHaveLength(1);
    expect(world.enemy.sketch[0]!.subject).toBe('ada'); // one hop, never the avatar hop-zero
    world.intel.informants.push({ id: 'ada', assignedVenue: 'square' });
    return world;
  }

  it('a one-hop disclosure adds exactly one informant exposure key, without identifying the avatar', () => {
    const world = disclosedInformant();
    expect(exposureStatus(world)).toMatchObject({ score: 1, identified: false });
    world.enemy.sketch.push(cloneSerializable(world.enemy.sketch[0]!));
    expect(exposureStatus(world)).toMatchObject({ score: 1, identified: false });
  });

  it('an eroded player asset flips only once the new feature names them', () => {
    const world = disclosedInformant();
    world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 1, strikes: 0, facts: [] });
    setDispositionEdge(world, 'ada', 0.3);
    const unnamed = cloneSerializable(world);
    unnamed.enemy.sketch = [];
    runTurncoatPass(unnamed, RULES);
    expect(unnamed.network.assets[0]!.turned).not.toBe(true);
    runTurncoatPass(world, RULES);
    expect(world.network.assets[0]!.turned).toBe(true);
  });

  it('a walk-in reveals the document accusation only through a physically spoken sketch tip', () => {
    const world = disclosedInformant();
    world.network.enemyAssets.push({
      id: 'bez', mice: null, wagePaidThroughDay: 6, strikes: 0, facts: [], turned: true,
    });
    world.tick = at(6, 23, 59);
    const before = cloneSerializable(world.intel.log);
    runTurncoatPass(world, RULES);
    expect(world.intel.log).toEqual(before);
    const tip = world.network.directiveState!.messages.find((message) => message.payload.kind === 'sketch-tip')!;
    expect(tip.payload).toMatchObject({ subject: 'ada', detail: world.enemy.sketch[0]!.detail });
    expect(world.enemy.sketch[0]!.detail).not.toContain('forged-document');
    const speech = realizeNetworkForward(world, tip.id,
      { venue: 'square', members: ['bez', 'you'] }, tip.availableAfter, RULES)!;
    captureIntel(world, {
      tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
    }, RULES);
    expect(world.intel.log.length).toBeGreaterThan(before.length);
    expect(world.network.enemyAssets[0]!.revealedThrough).toBe(1);
  });

  it('live tick transactions replay their own forging log through a real staged interrogation', () => {
    const initial = interrogationBase();
    applyEnemyDecision(initial, {
      day: 0, features: [], inquiries: [], watches: [],
      interrogations: [{ target: 'ada', guard: 'bez', day: 1,
        about: { subject: 'cyn' }, venue: 'backroom' }],
    });
    const live = cloneSerializable(initial);
    const intended: Action[] = [
      { tick: 0, kind: 'forge', spec: SPEC },
      { tick: at(1, 8), kind: 'plant', artifact: 'a0', to: 'ada', venue: null },
    ];
    const recorded: Action[] = [];
    while (live.tick < at(2, 0)) {
      const frame = prepareTick(live, RULES);
      finishTick(live, RULES, frame, () => {
        for (const action of intended.filter((candidate) => candidate.tick === live.tick)) {
          applyAction(live, action, RULES, frame);
          recorded.push(cloneSerializable(action));
        }
      });
    }
    expect(recorded).toEqual(intended);
    expect(live.enemy.sketch.filter((feature) => feature.kind === 'forged-document'))
      .toMatchObject([{ subject: 'you' }]);
    auditSketch(live);
    const replayed = runLogOn(cloneSerializable(initial), RULES, recorded, live.tick);
    expect(hashWorld(replayed)).toBe(hashWorld(live));
  });
});

describe('a letter is learned only through the words actually heard', () => {
  for (const paper of [true, false]) {
    const label = paper ? 'paper' : 'ordinary hearsay';
    it(label + ': answer and direct spymaster observation preserve the medium lazily', () => {
      const { world, answer, events } = answerWorld(paper);
      medium(answer, paper);
      const observation = observationsFor('bez', events).observations
        .find((entry) => entry.kind === 'utterance')!;
      medium(observation, paper);
      world.network.spymaster = 'bez';
      world.enemy.observers = [];
      captureEvidence(world, events, RULES);
      const evidence = world.enemy.evidence.filter((entry) => entry.kind === 'utterance');
      expect(evidence).toHaveLength(1);
      medium(evidence[0]!, paper);
      expect(evidence[0]!.reported.predicate).toBe('is-having-an-affair-with');
    });

    it(label + ': remote evidence waits for a spoken report and survives its trait projection', () => {
      const { world, answer, events } = answerWorld(paper);
      world.network.spymaster = 'cyn';
      world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
      captureEvidence(world, events, RULES);
      expect(world.enemy.evidence).toEqual([]);
      const held = world.network.directiveState!.heldObservations.find((row) =>
        row.content.observation.kind === 'utterance')!;
      medium(held.content.observation, paper);
      expect(held.deliveredAt).toBeNull();
      queueUnqueuedFieldReports(world);
      expect(world.enemy.evidence).toEqual([]);
      const message = world.network.directiveState!.messages[0]!;
      const speech = realizeNetworkForward(world, message.id,
        { venue: 'square', members: ['bez', 'cyn'] }, message.availableAfter, RULES)!;
      expect(speech.spoken.kind).toBe('field-report');
      if (speech.spoken.kind !== 'field-report') throw new Error('missing spoken field report');
      const reported = speech.spoken.items.find((item) =>
        item.observation.kind === 'utterance')!.observation;
      medium(reported, paper);
      expect(reported).toMatchObject({
        claimId: answer.claim.id, reported: { predicate: 'is-having-an-affair-with' },
      });
      expect(world.enemy.evidence).toEqual([]);
      captureEvidence(world, {
        tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
      }, RULES);
      const evidence = world.enemy.evidence.filter((entry) => entry.kind === 'utterance');
      expect(evidence).toHaveLength(1);
      medium(evidence[0]!, paper);
      expect(evidence[0]).toMatchObject({
        tick: answer.tick, observer: 'bez', speaker: 'ada', claimId: answer.claim.id,
        reported: { predicate: 'is-having-an-affair-with' },
      });
      expect(held.deliveredAt).toBe(speech.tick);
    });

    it(label + ': a second relay preserves the medium while changing the first reported copy', () => {
      const { world, events } = answerWorld(paper);
      world.network.spymaster = 'cyn';
      world.enemy.observers = [];
      world.npcs['ada']!.traits = ['name-dropper'];
      world.npcs['ada']!.rivals = ['cyn'];
      const observation = observationsFor('bez', events).observations
        .find((entry) => entry.kind === 'utterance')!;
      holdFieldObservation(world, 'enemy', 'bez', { kind: 'raw', observation },
        null, ['ada', 'cyn'], null, []);
      queueUnqueuedFieldReports(world);
      const message = world.network.directiveState!.messages[0]!;
      const first = realizeNetworkForward(world, message.id,
        { venue: 'backroom', members: ['bez', 'ada'] }, message.availableAfter, RULES)!;
      expect(first.spoken).toMatchObject({ kind: 'field-report', items: [{
        observation: { reported: { predicate: 'is-having-an-affair-with' } },
      }] });
      expect(world.enemy.evidence).toEqual([]);
      const second = realizeNetworkForward(world, message.id,
        { venue: 'square', members: ['ada', 'cyn'] }, first.tick + 15, RULES)!;
      if (second.spoken.kind !== 'field-report') throw new Error('missing relay speech');
      const relayed = second.spoken.items[0]!.observation;
      medium(relayed, paper);
      expect(relayed).toMatchObject({ reported: {
        predicate: 'is-having-an-affair-with', attribution: paper ? 'cyn' : SOMEONE,
      } });
      captureEvidence(world, {
        tick: second.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [second],
      }, RULES);
      const entry = world.enemy.evidence.find((item) => item.kind === 'utterance')!;
      medium(entry, paper);
      expect(entry.observer).toBe('ada');
    });
  }
});

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

describe('received document forensics cite the report actually heard', () => {
  it('a one-hop report mints a network ref that resolves to the field-report speech', () => {
    const { world, network, answer } = captureRelayedPaper(1);
    expect(answer).toMatchObject({ observer: 'bez', reported: { attribution: 'you' } });
    const papers = enemyDigest(world.enemy, 1, RULES).features
      .filter((feature) => feature.kind === 'forged-document');
    expect(papers).toMatchObject([{ subject: 'you', evidence: [{
      tick: network.tick, observer: network.observer, claimId: null,
      messageId: network.network.messageId,
    }] }]);
    world.enemy.sketch = papers;
    auditSketch(world);
  });

  it('a two-hop report retains its spoken attribution and cites the final report speech', () => {
    const { world, delivered, network, answer } = captureRelayedPaper(2);
    expect(delivered).toMatchObject({ speaker: 'ada', addressedTo: 'cyn', spoken: {
      kind: 'field-report', items: [{ observation: { kind: 'utterance', mode: 'answer',
        document: true, reported: { attribution: 'cyn' } } }],
    } });
    expect(answer.reported.attribution).toBe('cyn');
    const papers = enemyDigest(world.enemy, 1, RULES).features
      .filter((feature) => feature.kind === 'forged-document');
    expect(papers).toMatchObject([{ subject: 'cyn', evidence: [{
      tick: network.tick, observer: network.observer, claimId: null,
      messageId: network.network.messageId,
    }] }]);
    world.enemy.sketch = papers;
    auditSketch(world);
  });

  it('the first direct or received observation keeps its own causal ref', () => {
    const direct = stagedPaperAnswer('bez');
    const directEntry = direct.world.enemy.evidence.find((entry) => entry.kind === 'utterance'
      && entry.claimId === direct.answer.claim.id)!;
    const directPaper = enemyDigest(direct.world.enemy, 1, RULES).features
      .find((feature) => feature.kind === 'forged-document' && feature.subject === 'you')!;
    expect(directPaper.evidence).toEqual([{
      tick: directEntry.tick, observer: directEntry.observer,
      claimId: directEntry.claimId, messageId: null,
    }]);
    direct.world.enemy.sketch = [directPaper];
    auditSketch(direct.world);

    for (const directFirst of [true, false]) {
      const received = captureRelayedPaper(1);
      const state = cloneSerializable(received.world.enemy);
      const receivedRows = [received.network, received.answer].map(cloneSerializable);
      state.evidence = directFirst
        ? [cloneSerializable(directEntry), ...receivedRows]
        : [...receivedRows, cloneSerializable(directEntry)];
      const paper = enemyDigest(state, 1, RULES).features
        .find((feature) => feature.kind === 'forged-document' && feature.subject === 'you')!;
      const source = directFirst ? directEntry : received.network;
      expect(paper.evidence).toEqual([{
        tick: source.tick, observer: source.observer,
        claimId: source.kind === 'network' ? null : source.claimId,
        messageId: source.kind === 'network' ? source.network.messageId : null,
      }]);
    }
  });
});
