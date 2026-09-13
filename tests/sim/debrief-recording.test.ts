import { describe, expect, it } from 'vitest';
import { at } from '../../src/core/time';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { applyForge, applyPlant, applyShow, resolveArtifacts } from '../../src/sim/artifacts';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { explainBelief, threadOf } from '../../src/sim/chronicle';
import { captureEvidence } from '../../src/sim/counterintel';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { queueNetworkMessage, realizeNetworkForward } from '../../src/sim/directives/transport';
import type { NetworkSpeech, ReportedFieldObservation } from '../../src/sim/directives/types';
import { captureIntel } from '../../src/sim/fieldwork';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { observationsFor, type TickEvents } from '../../src/sim/perception';
import { finishTick, prepareTick } from '../../src/sim/phases';
import { runUntil, step } from '../../src/sim/step';
import type { ArtifactRecord, NetworkSpeechRecord } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { seanceWorld } from './helpers/seance-town';

const SPEC = { subject: 'bez', predicate: 'stole', object: null, count: 0,
  severity: 4 as const, place: 'square', attribution: 'someone' };
const CIRCLE = { venue: 'square', members: ['ada', 'bez', 'you'] };

function world() {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of fixture.npcs) { npc.traits = []; npc.edges = []; }
  const value = buildWorld(fixture, 'debrief-recording', RULES);
  enrollPlayer(value, { home: 'square' });
  value.enemy.observers = [];
  return value;
}

function paperWorld() {
  const value = world();
  applyForge(value, SPEC, 0, RULES);
  value.tick = at(1, 8);
  return value;
}

function artifactRows(value: ReturnType<typeof world>): ArtifactRecord[] {
  return value.chronicle.filter((row): row is ArtifactRecord => row.kind === 'artifact');
}

function linkedClaim(value: ReturnType<typeof world>, row: ArtifactRecord, viewer: string) {
  expect(row.claimId).toBeTypeOf('string');
  const claim = value.claims[row.claimId!];
  expect(claim).toMatchObject({ ...SPEC, parent: null });
  expect(value.beliefs[viewer]![claim!.family]!.claim.id).toBe(row.claimId);
  return claim!;
}

describe('artifact viewing records identify exactly the claim they minted', () => {
  it('identical pages shown in one tick retain different exact claim links', () => {
    const value = paperWorld();
    applyForge(value, SPEC, 0, RULES);
    applyShow(value, 'a0', 'ada', value.tick, [CIRCLE]);
    applyShow(value, 'a1', 'ada', value.tick, [CIRCLE]);
    const rows = artifactRows(value).filter((row) => row.act === 'show');
    expect(rows).toHaveLength(2);
    const claims = rows.map((row) => linkedClaim(value, row, 'ada'));
    claims.forEach((claim, index) => {
      expect(explainBelief(value, 'ada', claim.family)).toBe(rows[index]);
      expect(threadOf(value, claim.family)).toEqual([]); // exact-linked paper stays outside this family helper
    });
    expect(new Set(claims.map((claim) => claim.id)).size).toBe(2);
    expect(rows.map((row) => row.artifact)).toEqual(['a0', 'a1']);
    expect(value.artifacts!.map((artifact) => artifact.heldBy)).toEqual(['you', 'you']);
  });

  it('hand-over links the recipient copy without adding an overhearing record', () => {
    const value = paperWorld();
    applyPlant(value, 'a0', null, 'ada', value.tick, [CIRCLE]);
    const row = artifactRows(value).at(-1)!;
    expect(row).toMatchObject({ act: 'plant', by: 'you', to: 'ada' });
    linkedClaim(value, row, 'ada');
    expect(value.artifacts![0]!.heldBy).toBe('ada');
    expect(value.chronicle.filter((entry) => entry.kind === 'telling')).toEqual([]);
    expect(value.enemy.evidence).toEqual([]);
  });

  it('forge and venue plant omit the key, then the later pickup links its new claim', () => {
    const value = paperWorld();
    applyPlant(value, 'a0', 'square', null, value.tick, [CIRCLE]);
    expect(artifactRows(value).every((row) => !Object.hasOwn(row, 'claimId'))).toBe(true);
    resolveArtifacts(value, value.tick + 15, [CIRCLE]);
    const row = artifactRows(value).at(-1)!;
    expect(row).toMatchObject({ act: 'pickup', by: 'ada', to: null });
    linkedClaim(value, row, 'ada');
  });

  it('a holder re-show links the new family, separate from the first viewing', () => {
    const value = paperWorld();
    value.npcs['ada']!.edges = [{ to: 'bez', kind: 'friend', trust: 0.8 }];
    applyPlant(value, 'a0', null, 'ada', value.tick, [CIRCLE]);
    const first = artifactRows(value).at(-1)!;
    resolveArtifacts(value, value.tick + 15, [CIRCLE]);
    const next = artifactRows(value).at(-1)!;
    expect(next).toMatchObject({ act: 'reshow', by: 'ada', to: 'bez' });
    expect(linkedClaim(value, next, 'bez').family)
      .not.toBe(linkedClaim(value, first, 'ada').family);
  });

  it('a page returned to the avatar records a real viewing without inventing a claim', () => {
    const value = paperWorld();
    value.npcs['ada']!.edges = [{ to: 'you', kind: 'friend', trust: 0.8 }];
    // Venue pickup is anonymous and does not count as a prior avatar viewing.
    applyPlant(value, 'a0', 'square', null, value.tick, [CIRCLE]);
    resolveArtifacts(value, value.tick + 15, [CIRCLE]);
    const before = value.claimCounter;
    resolveArtifacts(value, value.tick + 30, [CIRCLE]);
    const row = artifactRows(value).at(-1)!;
    expect(row).toMatchObject({ act: 'reshow', by: 'ada', to: 'you' });
    expect(Object.hasOwn(row, 'claimId')).toBe(false);
    expect(value.claimCounter).toBe(before);
    expect(value.intel.log).toMatchObject([{ kind: 'hint', speaker: 'ada', reported: SPEC }]);
  });

  it('a refused viewing leaves no record, claim, or other state', () => {
    const value = paperWorld();
    const before = hashWorld(value);
    expect(() => applyShow(value, 'a0', 'ada', value.tick, [])).toThrow();
    expect(hashWorld(value)).toBe(before);
  });

  it('legacy viewing records keep their fallback, but an explicit mismatched link is never guessed away', () => {
    const value = paperWorld();
    applyShow(value, 'a0', 'ada', value.tick, [CIRCLE]);
    const row = artifactRows(value).at(-1)!;
    const claim = linkedClaim(value, row, 'ada');
    delete row.claimId;
    expect(explainBelief(value, 'ada', claim.family)).toBe(row);
    row.claimId = 'a-different-claim';
    expect(explainBelief(value, 'ada', claim.family)).toBeNull();
  });

  it('live forging and viewing records replay with the same explicit claim identities', () => {
    const initial = world();
    const live = cloneSerializable(initial);
    const actions: Action[] = [{ tick: 0, kind: 'forge', spec: SPEC },
      { tick: at(1, 8), kind: 'show', artifact: 'a0', to: 'ada' }];
    const recorded: Action[] = [];
    while (live.tick <= at(1, 8)) {
      const frame = prepareTick(live, RULES);
      finishTick(live, RULES, frame, () => {
        for (const action of actions.filter((row) => row.tick === live.tick)) {
          applyAction(live, action, RULES, frame);
          recorded.push(cloneSerializable(action));
        }
      });
    }
    const shown = artifactRows(live).find((row) => row.act === 'show')!;
    linkedClaim(live, shown, 'ada');
    expect(recorded).toEqual(actions);
    expect(hashWorld(runLogOn(cloneSerializable(initial), RULES, recorded, live.tick)))
      .toBe(hashWorld(live));
  });
});

const ASK: ReportedFieldObservation = { kind: 'asking', observedAt: 0, venue: 'square',
  speaker: 'bez', addressedTo: 'ada', about: { subject: 'ada' },
  overheard: false, authority: false };

function reportWorld(items: { root: string; observation: ReportedFieldObservation }[], relay = true) {
  const value = world();
  for (const item of items) holdFieldObservation(value, 'player', 'ada',
    { kind: 'reported', observation: item.observation }, item.root,
    relay ? ['bez', 'you'] : ['you'], null, []);
  queueUnqueuedFieldReports(value);
  const message = value.network.directiveState!.messages[0]!;
  return { value, message };
}

function speechEvents(speech: NetworkSpeech): TickEvents {
  return { tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] };
}

function reportRows(value: ReturnType<typeof world>): NetworkSpeechRecord[] {
  return value.chronicle.filter((row): row is NetworkSpeechRecord => row.kind === 'network-speech');
}

describe('each spoken report carries private, per-item causal associations', () => {
  it('two roots with identical received content stay distinct across two actual hops', () => {
    const { value, message } = reportWorld([{ root: 'source-a', observation: ASK },
      { root: 'source-b', observation: ASK }]);
    const first = realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['ada', 'bez'] }, 15, RULES)!;
    const second = realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['bez', 'you'] }, 30, RULES)!;
    expect(first.reportRoots).toEqual(['source-a', 'source-b']);
    expect(second.reportRoots).toEqual(first.reportRoots);
    if (first.spoken.kind !== 'field-report') throw new Error('missing report');
    expect(first.spoken.items[0]).toEqual(first.spoken.items[1]);
    second.reportRoots![0] = 'mutated-after-speech';
    expect(first.reportRoots).toEqual(['source-a', 'source-b']);
    expect(message.payload.kind === 'field-report' && message.payload.renderedItems![0]!.rootFingerprint)
      .toBe('source-a');
  });

  it('relay omission retains the remaining root at its new item index', () => {
    const { value, message } = reportWorld([
      { root: 'a-presence', observation: { kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez' } },
      { root: 'b-asking', observation: ASK },
    ]);
    value.npcs['bez']!.traits = ['vaguener'];
    const first = realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['ada', 'bez'] }, 15, RULES)!;
    const second = realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['bez', 'you'] }, 30, RULES)!;
    expect(first.reportRoots).toEqual(['a-presence', 'b-asking']);
    expect(second.reportRoots).toEqual(['b-asking']);
    expect(second.spoken).toMatchObject({ kind: 'field-report', items: [{ observation: ASK }] });
    expect(first.spoken.kind === 'field-report' && first.spoken.items.length).toBe(2);
  });

  it('an entirely omitted report records an empty association list and closes its sources', () => {
    const { value, message } = reportWorld([{ root: 'presence-root',
      observation: { kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez' } }], false);
    value.npcs['ada']!.traits = ['vaguener'];
    const speech = realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['ada', 'you'] }, 15, RULES)!;
    expect(speech.reportRoots).toEqual([]);
    expect(speech.spoken).toMatchObject({ kind: 'field-report', items: [] });
    expect(value.network.directiveState!.heldObservations[0]!.deliveredAt).toBe(15);
  });

  it('an unsent packet exposes no association event and leaves the chronicle untouched', () => {
    const { value, message } = reportWorld([{ root: 'private-root', observation: ASK }]);
    const before = cloneSerializable(value.chronicle);
    expect(realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['ada', 'you'] }, 15, RULES)).toBeNull();
    expect(value.chronicle).toEqual(before);
    expect(message.payload.kind === 'field-report' && message.payload.renderedItems).toBeNull();
  });

  it('ordinary network speech omits report association state entirely', () => {
    const value = world();
    const id = queueNetworkMessage(value, 'player', 'ada', ['you'], {
      kind: 'sketch-tip', principal: 'player', asset: 'ada', subject: 'bez', detail: 'a visitor', featureId: 'sf0',
    }, 15, null, null);
    const speech = realizeNetworkForward(value, id,
      { venue: 'square', members: ['ada', 'you'] }, 15, RULES)!;
    expect(Object.hasOwn(speech, 'reportRoots')).toBe(false);
  });

  it('private roots never enter spoken content, an observer feed, player intel or enemy evidence', () => {
    const { value, message } = reportWorld([{ root: 'private-root-A', observation: ASK }], false);
    const speech = realizeNetworkForward(value, message.id,
      { venue: 'square', members: ['ada', 'you', 'bez'] }, 15, RULES)!;
    expect(speech.reportRoots).toEqual(['private-root-A']);
    const altered = cloneSerializable(speech);
    altered.reportRoots = ['private-root-B'];
    const events = speechEvents(speech);
    const twinEvents = speechEvents(altered);
    expect(observationsFor('bez', events)).toEqual(observationsFor('bez', twinEvents));
    const twin = cloneSerializable(value);
    value.network.spymaster = 'bez'; twin.network.spymaster = 'bez';
    captureIntel(value, events, RULES); captureIntel(twin, twinEvents, RULES);
    captureEvidence(value, events, RULES); captureEvidence(twin, twinEvents, RULES);
    expect(value.intel).toEqual(twin.intel);
    expect(value.enemy).toEqual(twin.enemy);
    for (const view of [speech.spoken, observationsFor('bez', events), value.intel, value.enemy]) {
      expect(JSON.stringify(view)).not.toContain('private-root-');
      expect(JSON.stringify(view)).not.toContain('reportRoots');
    }
  });

  it('the tick transaction copies each hop now, preserving earlier content after later omission', () => {
    const { value, message } = reportWorld([
      { root: 'a-presence', observation: { kind: 'presence', observedAt: 0, venue: 'square', actor: 'bez' } },
      { root: 'b-asking', observation: ASK },
    ]);
    value.npcs['bez']!.traits = ['vaguener'];
    value.playerVenue = 'backroom';
    value.npcs['bez']!.schedule = [
      { days: 'all', from: 0, to: 30, venue: 'square' },
      { days: 'all', from: 30, to: 1439, venue: 'backroom' },
    ];
    value.tick = 15;
    const events = step(value, RULES);
    const first = reportRows(value).find((row) => row.messageId === message.id)!;
    expect(first.reportRoots).toEqual(['a-presence', 'b-asking']);
    const snapshot = cloneSerializable(first);
    const emitted = events.networkSpeeches!.find((speech) => speech.messageId === message.id)!;
    emitted.reportRoots![0] = 'caller-mutated-event';
    expect(first).toEqual(snapshot);
    runUntil(value, 31, RULES);
    const rows = reportRows(value).filter((row) => row.messageId === message.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(snapshot);
    expect(rows[1]).toMatchObject({ tick: 30, addressedTo: 'you', reportRoots: ['b-asking'] });
    expect(value.intel.log).toMatchObject([{ tick: 0, kind: 'asking' }]);
  });

  it('autonomous report chronology replays exactly through the normal transaction', () => {
    const { value, message } = reportWorld([{ root: 'source-a', observation: ASK }], false);
    value.tick = 15;
    const initial = cloneSerializable(value);
    runUntil(value, 16, RULES);
    expect(reportRows(value).find((row) => row.messageId === message.id)?.reportRoots)
      .toEqual(['source-a']);
    expect(hashWorld(runLogOn(initial, RULES, [], 16))).toBe(hashWorld(value));
  });
});

it('preserves an actual séance family member while exact-linked paper stays outside the family helper', () => {
  const ritual = seanceWorld();
  applyAction(ritual, { kind: 'seance', tick: ritual.tick }, RULES);
  const departed = ritual.departed!;
  const ritualRow = ritual.chronicle.find((row) => row.kind === 'seance');
  expect(ritualRow).toBeDefined();
  expect(ritualRow).toMatchObject({
    kind: 'seance', claimId: departed.claimId, departedId: departed.id,
  });
  expect(threadOf(ritual, departed.secretId).filter((row) => row.kind === 'seance'))
    .toEqual([ritualRow]);

  const paper = paperWorld();
  applyShow(paper, 'a0', 'ada', paper.tick, [CIRCLE]);
  const viewing = artifactRows(paper).at(-1)!;
  const claim = linkedClaim(paper, viewing, 'ada');
  expect(paper.chronicle).toContain(viewing);
  expect(threadOf(paper, claim.family)).toEqual([]);
});
