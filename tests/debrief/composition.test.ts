import { at } from '../../src/core/time';
import { captureEvidence } from '../../src/sim/counterintel';
import { featureLinks } from '../../src/sim/debrief/feature-links';
import { operationThreads } from '../../src/sim/debrief/threads';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { prepareTick } from '../../src/sim/phases';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { NetworkSpeech } from '../../src/sim/directives/types';
import type { Resolution } from '../../src/sim/scenario/types';
import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { applyForge, applyShow } from '../../src/sim/artifacts';
import { applyAction } from '../../src/sim/campaign';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { debriefView, type DebriefView } from '../../src/sim/debrief/index';
import { holdFieldObservation, ingestObservedFieldReport, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import type { SketchFeature } from '../../src/sim/enemy/state';
import { blankIntel } from '../../src/sim/fieldwork';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { scenarioNightly } from '../../src/sim/scenario/referee';
import { runUntil, step } from '../../src/sim/step';
import type { AskingRecord, WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';
import { scryWorld } from '../sim/helpers/scry-world';
import { seanceWorld, nightVisitWorld } from '../sim/helpers/seance-town';

const spec = { subject: 'bez', predicate: 'stole', object: null, count: 2,
  severity: 4 as const, place: 'square', attribution: 'someone' };
function fixture() {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'debrief-composition', R); enrollPlayer(world, { home: 'backroom' });
  world.enemy.observers = []; return world;
}
function scenario(world: WorldState, days = Math.floor(world.tick / 1440) + 1) {
  world.scenario = { defId: 'composition', days, win: { kind: 'council-turns', quorum: 1 },
    cast: { usurper: 'bez', council: ['ada'] }, status: 'running', resolution: null };
}
function finish(world: WorldState) { scenario(world); scenarioNightly(world, R); return world; }
function view(world: WorldState): DebriefView { const result = debriefView(world); if (!result) throw new Error('terminal debrief missing'); return result; }
function feature(id = 'opaque-id', over: Partial<SketchFeature> = {}): SketchFeature {
  return { id, kind: 'carrier-profile', day: 0, subject: 'ada', family: null,
    district: null, detail: 'retained conclusion', evidence: [], ...over };
}
function decision(world: WorldState, day: number, features: SketchFeature[]) {
  world.enemy.decisions.push({ day, features, inquiries: [], watches: [], interrogations: [] });
  world.enemy.sketch.push(...features);
}
const question = (tick = 15): AskingRecord => ({ kind: 'asking', tick, venue: 'square', speaker: 'bez', addressedTo: 'ada',
  about: { subject: 'ada' }, authority: true, heardBy: [{ id: 'ada', addressed: true }, { id: 'you', addressed: false }] });
function visibleQuestion(world: WorldState, tick = 15) {
  world.chronicle.push(question(tick));
  world.intel.log.push({ ...blankIntel(), kind: 'asking', tick, venue: 'square', via: 'self',
    speaker: 'bez', addressedTo: 'ada', about: { subject: 'ada' }, authority: true, overheard: true });
}
function hold(world: WorldState, route = ['you']) {
  const id = holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: {
    kind: 'presence', tick: 0, venue: 'square', actor: 'bez',
  } }, null, route, null, []);
  return world.network.directiveState!.heldObservations.find((row) => row.id === id)!;
}
function lateReport() {
  const world = fixture(); hold(world); queueUnqueuedFieldReports(world); runUntil(world, 1440, R);
  expect(world.intel.log).toEqual([]); world.playerVenue = 'square'; runUntil(world, 1441, R); return finish(world);
}
function noReportWatch(report: 'none' | 'full' = 'none') {
  const world = fixture(); world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  const record = world.network.directiveState!.records[0]!;
  const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
  if (packet.payload.kind !== 'directive') throw new Error('watch packet missing');
  record.authored.brief.report = report; packet.payload.version.brief.report = report;
  runUntil(world, 2581, R); runUntil(world, record.received!.version.brief.active.until + 1, R);
  return finish(world);
}

describe('the pure terminal entry has one executable hidden-data gate', () => {
  it.each(['no-scenario', 'running'] as const)('%s returns null before touching any hidden substrate', (state) => {
    const world = fixture(); if (state === 'running') scenario(world, 20);
    for (const key of ['enemy', 'claims', 'chronicle', 'network', 'intel']) Object.defineProperty(world, key, {
      get() { throw new Error('hidden reader ran'); }, configurable: true,
    });
    expect(debriefView(world)).toBeNull();
  });
  it('a real clock resolution opens the debrief with its actual institution evidence', () => {
    const world = finish(fixture());
    expect(view(world).ending).toMatchObject({ status: 'lost-clock', resolutionState: 'consistent', resolution: { day: 0 } });
    expect(view(world).chronicle.some((row) => row.record.kind === 'institution' && row.record.action === 'coronation')).toBe(true);
  });
  it('a real council win preserves the claim that met the quorum', () => {
    const world = fixture(); applyInject(world, 'ada', spec); finish(world);
    expect(world.scenario!.status).toBe('won');
    expect(view(world).ending.resolution).toMatchObject({ kind: 'won', turned: [{ npc: 'ada' }] });
    expect(view(world).operations.stories[0]!.versions[0]!.claim.subject).toBe('bez');
  });
  it('actual carrier identification opens exposure loss without a feature-count threshold', () => {
    const world = fixture(); decision(world, 0, [feature('identity', { subject: 'you' })]); finish(world);
    expect(view(world).ending.status).toBe('lost-exposed');
    expect(view(world).calendar.days[0]!.sketch).toMatchObject({ identified: true, identifiedOnDay: 0 });
  });
  it('an actual caught utterance opens the immediate arrest ending', () => {
    const world = fixture(); scenario(world, 10); world.playerVenue = 'square';
    world.enemy.observers = [{ id: 'bez', vigilance: 1 }]; world.tick = 15;
    applyAction(world, { tick: 15, kind: 'tell', to: 'ada', spec }, R); step(world, R);
    expect(view(world).ending).toMatchObject({ status: 'lost-caught', resolution: { kind: 'lost-caught', heardBy: 'bez', venue: 'square' } });
  });
  it.each(['missing', 'inconsistent'] as const)('a %s retained resolution remains explicit', (state) => {
    const world = finish(fixture()); world.scenario!.resolution = state === 'missing' ? null : { kind: 'won', day: 0, turned: [] };
    expect(view(world).ending.resolutionState).toBe(state);
  });
  it('a future-dated ending cannot masquerade as a consistent resolution at the current clock', () => {
    const world = finish(fixture()); world.scenario!.resolution!.day = 9;
    expect(view(world).ending.resolutionState).toBe('inconsistent');
    expect(view(world).ending.resolution!.day).toBe(9);
  });
  it('current player annotations remain detached and ungraded outside historical days', () => {
    const world = fixture(); world.tick = 3000;
    world.intel.cards.push({ id: 'guess', text: 'the guard knows me', confidence: 3, links: ['opaque-id'], createdTick: 0, updatedTick: 3000 });
    const model = view(finish(world));
    expect(model.annotations).toMatchObject({ timing: 'terminal-current', graded: false, cards: [{ text: 'the guard knows me' }] });
    expect(JSON.stringify(model.calendar)).not.toContain('the guard knows me');
  });
});

describe('received knowledge and retained digests share an honest calendar', () => {
  it('a real day-one report does not put its day-zero observation on the earlier board', () => {
    const world = lateReport(); const days = view(world).calendar.days;
    expect(days.find((row) => row.day === 0)!.player.log).toEqual([]);
    expect(days.find((row) => row.day === 0)!.observationEntryIndexes).toEqual([0]);
    const received = days.find((row) => row.day === 1)!;
    expect(received.player.log[0]!.tick).toBe(0);
    expect(received.player.knowledge[0]).toMatchObject({ learnedAt: 1440, timing: 'report' });
    expect(received.newlyReceivedEntryIndexes).toEqual([0]);
  });
  it('removing the actual receipt preserves unknown board data without a synthetic zero-day event', () => {
    const world = lateReport(); world.chronicle = world.chronicle.filter((row) => row.kind !== 'network-speech');
    const calendar = view(world).calendar;
    expect(calendar.unknownKnowledge).toMatchObject([{ entryIndex: 0, learnedAt: null }]);
    expect(calendar.days.every((row) => row.player.log.length === 0)).toBe(true);
  });
  it('a real physical report received the next day keeps enemy observation and acquisition on separate dates', () => {
    const world = scryWorld(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'away' }];
    applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; runUntil(world, 2880, R);
    expect(world.enemy.evidence.some((row) => row.kind === 'arcane-residue')).toBe(false);
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }]; runUntil(world, 2926, R);
    const index = world.enemy.evidence.findIndex((row) => row.kind === 'arcane-residue'); expect(index).toBeGreaterThanOrEqual(0);
    const model = view(finish(world));
    expect(model.calendar.days.find((row) => row.day === 1)!.observedEvidenceIndexes).toContain(index);
    expect(model.calendar.days.find((row) => row.day === 1)!.newlyAcquiredEvidenceIndexes).not.toContain(index);
    expect(model.calendar.days.find((row) => row.day === 2)!.newlyAcquiredEvidenceIndexes).toContain(index);
    expect(model.operations.enemyEvidence[index]!.arrival).toMatchObject({ observedAt: 1440, learnedAt: 2925, timing: 'report' });
  });
  it('day gaps stay explicit, same-day decisions retain indexes, and append order breaks chronology ties', () => {
    const world = fixture(); world.tick = 4320; visibleQuestion(world, 0);
    decision(world, 2, [feature('first')]); decision(world, 2, [feature('second')]); finish(world);
    const days = view(world).calendar.days;
    expect(days.map((row) => [row.day, row.gapBefore])).toEqual([[0, 0], [2, 1], [3, 0]]);
    expect(days[1]!.decisions.map((row) => row.decisionIndex)).toEqual([0, 1]);
    expect(days[1]!.sketch.known.map((row) => row.id)).toEqual(['first', 'second']);
  });
  it('a future receipt and future digest cannot appear in an earlier calendar', () => {
    const world = lateReport(); decision(world, 9, [feature('future', { subject: 'you' })]); world.tick = 100;
    const calendar = view(world).calendar;
    expect(calendar.days.map((row) => row.day)).toEqual([0]);
    expect(calendar.days[0]!.player.log).toEqual([]); expect(calendar.days[0]!.sketch.identified).toBe(false);
    expect(view(world).recordsBeyondClock.length).toBeGreaterThan(0);
    expect(view(world).recordsBeyondClock.every((row) => row.record.tick > world.tick)).toBe(true);
  });
  it('a retained sketch without a digest day is visible but is never backdated', () => {
    const world = fixture(); world.enemy.sketch.push(feature('orphan', { subject: 'you', day: 0 })); world.tick = 2880;
    const calendar = view(finish(world)).calendar;
    expect(calendar.unrecordedSketch[0]!.id).toBe('orphan');
    expect(calendar.days.every((row) => row.sketch.known.length === 0 && !row.sketch.identified)).toBe(true);
  });
  it('repeated feature keys are descriptive groups while identification follows the actual named carrier and digest day', () => {
    const world = fixture(); world.tick = 6000;
    decision(world, 0, [feature('a'), feature('b')]);
    decision(world, 2, [feature('me', { subject: 'you' })]);
    const days = view(finish(world)).calendar.days;
    expect(days.find((row) => row.day === 0)!.sketch).toMatchObject({ identified: false, evidenceKeys: [
      { kind: 'carrier-profile', subject: 'ada', featureIds: ['a', 'b'] },
    ] });
    expect(days.find((row) => row.day === 2)!.sketch).toMatchObject({ identified: true, identifiedOnDay: 2 });
    expect(days.at(-1)!.sketch.evidenceKeys).toHaveLength(2);
  });
  it('a feature without an act does not invent questioning, watch work or a known signal', () => {
    const world = fixture(); decision(world, 0, [feature('unrelated')]);
    const overlay = view(finish(world)).calendar.days[0]!.overlay;
    expect(overlay.attention.actual).toEqual([]); expect(overlay.signals).toEqual([]);
    expect(overlay.lag.featuresWithoutCounterLinkIds).toEqual(['unrelated']);
  });
  it('repeated board views corroborate one performed asking without requiring a resulting feature', () => {
    const world = fixture(); visibleQuestion(world); world.intel.log.push(cloneSerializable(world.intel.log[0]!)); world.tick = 30;
    const overlay = view(finish(world)).calendar.days[0]!.overlay;
    expect(overlay.attention.actual).toHaveLength(1); expect(overlay.signals[0]).toMatchObject({
      status: 'corroborated-attention', entryIndexes: [0, 1], attentionIds: ['asking:0'], featureIds: [] });
    expect(overlay.lag.unseenAttentionIds).toEqual([]);
  });
  it('a mismatched signal remains unproved even if its key equals a feature ID', () => {
    const world = fixture(); visibleQuestion(world); world.intel.log[0]!.venue = 'elsewhere'; world.tick = 30;
    decision(world, 0, [feature('s:ada')]);
    const overlay = view(finish(world)).calendar.days[0]!.overlay;
    expect(overlay.signals[0]).toMatchObject({ status: 'unproved-signal', featureIds: [], attentionIds: [] });
    expect(overlay.lag.unseenAttentionIds).toEqual(['asking:0']);
  });
  it('partial corroboration preserves both the matched and unproved original entries', () => {
    const world = fixture(); visibleQuestion(world); world.intel.log.push({ ...cloneSerializable(world.intel.log[0]!), venue: 'elsewhere' }); world.tick = 30;
    expect(view(finish(world)).calendar.days[0]!.overlay.signals[0]).toMatchObject({ status: 'partly-corroborated',
      matchedEntryIndexes: [0], unmatchedEntryIndexes: [1], attentionIds: ['asking:0'] });
  });
  it('real no-report watch work survives expiry and is visible without headquarters accounts or a feature', () => {
    const world = noReportWatch(); const model = view(world); const overlay = model.calendar.days.at(-1)!.overlay;
    expect(model.operations.directives[0]!.latestRun!.state).toBe('aborted');
    expect(overlay.attention.actual.some((row) => row.kind === 'watch')).toBe(true);
    expect(overlay.headquartersAccounts).toEqual([]);
    expect(model.operations.directives[0]!.localResults!.some((row) => row.result.enemyAction?.kind === 'watch-worked')).toBe(true);
  });
  it('current headquarters ledger rows never manufacture actual work or old receipt dates', () => {
    const world = fixture(); world.enemy.actionLedger = [{ orderKey: 'reported', kind: 'watch', directiveIds: ['unknown'],
      leadFeatureId: null, subject: 'you', about: null, district: 'd0', scheduleStartDay: 0,
      posts: [{ guard: 'bez', venue: 'square' }], workedDays: [0], askedAt: null }]; world.tick = 3000;
    const model = view(finish(world));
    expect(model.headquartersLedger).toMatchObject({ timing: 'unrecorded', entries: [{ workedDays: [0] }] });
    expect(model.calendar.days.every((row) => row.overlay.attention.actual.length === 0 && row.overlay.headquartersAccounts.length === 0)).toBe(true);
  });
  it('actual reported watch work retains headquarters receipt time separately from the asserted work time', () => {
    const world = noReportWatch('full'); const model = view(world);
    const accounts = model.calendar.days.at(-1)!.overlay.headquartersAccounts;
    expect(accounts.length).toBeGreaterThan(0);
    for (const account of accounts) {
      expect(account.receivedAt).toBe(world.chronicle[account.chronicleIndex]!.tick);
      if (account.copy.enemyAction) expect(account.receivedAt).toBeGreaterThanOrEqual(account.copy.enemyAction.occurredAt);
    }
    const first = accounts[0]!; world.tick = first.receivedAt - 1;
    expect(view(world).calendar.days.at(-1)!.overlay.headquartersAccounts).toEqual([]);
  });
  it.each(['received', 'issued'] as const)('missing %s watch work stays unknown instead of becoming a phantom', (state) => {
    const world = noReportWatch(); const record = world.network.directiveState!.records[0]!;
    const work = record.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!.result.enemyAction!;
    world.intel.log.push({ ...blankIntel(), kind: 'presence', via: 'self', tick: work.occurredAt, venue: work.venue, actor: work.guard, overheard: true });
    delete record.outcomes; if (state === 'issued') record.received = null;
    const signal = view(world).calendar.days.at(-1)!.overlay.signals.find((row) => row.kind === 'watch')!;
    expect(signal.status).toBe(state === 'received' ? 'unrecorded-work' : 'issued-unproved');
    expect(signal.attentionIds).toEqual([]);
  });
});

describe('typed composition retains actual routes, operation variants and orphans', () => {
  it('an actual paper viewing retains both the artifact and its independently minted story', () => {
    const world = fixture(); world.playerVenue = 'square'; applyForge(world, spec, 0, R); world.tick = 1440;
    applyShow(world, 'a0', 'ada', 1440, [{ venue: 'square', members: ['you', 'ada'] }]);
    const operations = view(finish(world)).operations;
    expect(operations.artifacts[0]!.storyFamilies).toEqual([operations.stories[0]!.family]);
    expect(operations.stories[0]!.events[0]!.record.kind).toBe('artifact');
  });
  it('actual scry captures and orphan residue stay reachable independently of physical attention', () => {
    const world = scryWorld(); applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; step(world, R); const model = view(finish(world));
    expect(model.operations.magic.operations[0]!.spell).toBe('scrying');
    expect(model.operations.physical.records.some((row) => row.record.kind === 'residue')).toBe(true);
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'scry');
    expect(view(world).operations.magic.residuesWithoutOperation[0]!.residueId).toBe('s0');
  });
  it('an actual séance stays a magic receipt and a story event without joining a visible chapel visit', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R);
    const model = view(finish(world));
    expect(model.operations.magic.operations[0]!.spell).toBe('seance');
    expect(model.operations.stories.flatMap((row) => row.events).some((row) => row.record.kind === 'seance')).toBe(true);
    expect(model.operations.physical.records.some((row) => row.record.kind === 'night-visit')).toBe(true);
    expect(model.operations.physical.evidence.some((row) => row.entry.kind === 'night-visit')).toBe(true);
  });
  it('missing séance and speech claims stay in the public unresolved section', () => {
    const world = seanceWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); delete world.claims[world.departed!.claimId];
    world.chronicle.push({ kind: 'inject', tick: 0, target: 'you', by: 'player', claimId: 'missing' });
    expect(view(finish(world)).operations.unresolvedStories.map((row) => row.record.kind)).toEqual(['inject', 'seance', 'inject']);
  });
  it('orphan paper, queued report root and network speaking history remain reachable', () => {
    const world = fixture(); const held = hold(world); held.queuedIn = 'missing';
    world.chronicle.push({ kind: 'artifact', tick: 0, act: 'forge', artifact: 'lost-paper', by: 'you', to: null },
      { kind: 'network-speech', tick: 0, venue: 'square', speaker: 'ada', addressedTo: 'you', messageId: 'orphan', cause: null,
        heardBy: [{ id: 'you', addressed: true }], spoken: { kind: 'field-report', onwardTo: null, items: [] }, reportRoots: [] });
    const operations = view(finish(world)).operations;
    expect(operations.artifacts[0]!.artifact).toBeNull();
    expect(operations.reportItems[0]!.packets[0]!.transport).toBe('unrecorded');
    expect(operations.messages[0]).toMatchObject({ messageId: 'orphan', transport: 'unrecorded', stages: [{ tick: 0 }] });
  });
  it('an actual omitted report arrives as an empty envelope and never becomes received knowledge', () => {
    const world = fixture(); world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true });
    const held = hold(world); queueUnqueuedFieldReports(world);
    const packet = world.network.directiveState!.messages[0]!;
    const heard = realizeNetworkForward(world, packet.id, { venue: 'backroom', members: ['ada', 'you'] }, 15, R)!;
    ingestObservedFieldReport(world, 'player', heard); world.tick = 15;
    world.chronicle.push({ kind: 'network-speech', tick: heard.tick, venue: heard.venue, speaker: heard.speaker,
      addressedTo: heard.addressedTo, heardBy: [{ id: 'you', addressed: true }], messageId: heard.messageId,
      spoken: heard.spoken, cause: null, reportRoots: [] });
    const model = view(finish(world));
    expect(held.deliveredAt).toBe(15); expect(model.calendar.days[0]!.player.log).toEqual([]);
    expect(model.calendar.days[0]!.overlay.receivedReportItems[0]!.stage.status).toBe('omitted');
  });
  it('ambiguous root metadata remains unknown in an actually heard report', () => {
    const world = lateReport(); const speech = world.chronicle.find((row) => row.kind === 'network-speech')!;
    if (speech.kind !== 'network-speech') throw new Error('missing speech'); speech.reportRoots = ['duplicate', 'duplicate'];
    expect(view(world).calendar.days.at(-1)!.overlay.receivedReportItems[0]!.stage.status).toBe('unknown');
  });
  it('a real two-hop exaggerated report exposes the mutation and its actual speaker without rewriting the root', () => {
    const world = fixture(); world.npcs.bez!.traits = ['exaggerator'];
    world.npcs.bez!.schedule = [{ days: 'all', from: 0, to: 30, venue: 'square' }, { days: 'all', from: 30, to: 1440, venue: 'backroom' }];
    const claim = applyInject(world, 'ada', spec); const id = claim.id;
    holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: { kind: 'utterance', tick: 0,
      venue: 'square', speaker: 'ada', addressedTo: 'bez', claim, overheard: false, mode: 'telling' } }, null, ['bez', 'you'], null, []);
    queueUnqueuedFieldReports(world); world.tick = 15; runUntil(world, 31, R);
    const model = view(finish(world));
    const received = model.calendar.days[0]!.overlay.receivedReportItems.find((row) => row.stage.speaker === 'bez')!;
    expect(received.stage.status).toBe('spoken'); expect(received.stage.changes!.length).toBeGreaterThan(0);
    expect(received.stage.changes!.some((row) => row.path.includes('/reported/'))).toBe(true);
    expect(world.claims[id]!.count).toBe(2);
  });
  it('every institution and vignette remains reachable even without an operation-family association', () => {
    const world = fixture(); world.chronicle.push({ kind: 'vignette', tick: 0, defId: 'retained', a: 'ada', b: null });
    const model = view(finish(world));
    expect(model.chronicle.map((row) => row.record.kind)).toEqual(['vignette', 'institution']);
  });
  it('composed physical histories own their sightings, receipt and nested evidence independently of magic views', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R); finish(world);
    const before = hashWorld(world); const expected = view(world); const changed = view(world);
    changed.operations.physical.records[0]!.record.tick = 999;
    const evidence = changed.operations.physical.evidence.find((row) => row.entry.kind === 'night-visit')!;
    if (evidence.entry.kind !== 'night-visit') throw new Error('missing night evidence');
    evidence.entry.nightVisit.witness = 'changed'; evidence.sightingIndexes.push(999); evidence.arrival.learnedAt = 999;
    expect(hashWorld(world)).toBe(before); expect(view(world)).toEqual(expected);
  });
});

it('the public view deeply owns calendar, report, claim, sketch, ledger, annotation and terminal arrays', () => {
  const world = lateReport(); decision(world, 1, [feature()]);
  world.intel.cards.push({ id: 'h', text: 'guess', confidence: 1, links: [], createdTick: 0, updatedTick: 1 });
  const before = hashWorld(world); const expected = view(world); const changed = view(world);
  expect(changed).toEqual(expected);
  changed.annotations.cards[0]!.links.push('changed'); changed.calendar.days.at(-1)!.player.log[0]!.actor = 'changed';
  changed.calendar.days.at(-1)!.decisions[0]!.decision.features[0]!.evidence.push({ tick: 0, observer: 'x', claimId: null, messageId: null });
  changed.operations.reportItems[0]!.held[0]!.route.push('changed');
  changed.calendar.days.at(-1)!.overlay.receivedReportItems[0]!.stage.heardBy[0]!.id = 'changed';
  changed.chronicle[0]!.record.tick = 999; changed.headquartersLedger.entries.push({ orderKey: 'fake', kind: 'watch',
    directiveIds: [], leadFeatureId: null, subject: null, about: null, district: 'd0', scheduleStartDay: 0, posts: [], workedDays: [], askedAt: null });
  expect(hashWorld(world)).toBe(before); expect(view(world)).toEqual(expected);
});

function contractReviewWorld(): WorldState {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.edges = []; npc.traits = ['literalist']; }
  const w = buildWorld(town, 'composition-independent-review', R); enrollPlayer(w, { home: 'backroom' });
  w.enemy.observers = []; w.tick = 100;
  w.scenario = { defId: 'composition', days: 1, win: { kind: 'council-turns', quorum: 1 },
    cast: { usurper: 'bez', council: ['ada'] }, status: 'lost-clock',
    resolution: { kind: 'lost-clock', day: 0, turned: [] } };
  return w;
}
function contractReviewFeature(id: string): SketchFeature { return { id, kind: 'carrier-profile', day: 9, subject: 'you', family: null,
  district: null, detail: 'future retained digest', evidence: [] }; }

it('terminal operations do not disclose a retained enemy digest beyond the current clock', () => {
  const w = contractReviewWorld(); const f = contractReviewFeature('future-feature');
  w.enemy.decisions.push({ day: 9, features: [f], inquiries: [], watches: [], interrogations: [] }); w.enemy.sketch.push(f);
  const view = debriefView(w)!;
  expect(view.calendar.days.every((day) => day.day <= 0)).toBe(true);
  expect(view.operations.featureReferences).toEqual([]);
});

it('terminal operations do not disclose enemy evidence recorded beyond the current clock', () => {
  const w = contractReviewWorld(); w.enemy.evidence.push({ kind: 'asking', tick: 200, venue: 'square', observer: 'bez', overheard: true,
    speaker: 'ada', addressedTo: 'bez', mode: null, claimId: null, family: null, reported: null,
    about: { subject: 'you' } });
  expect(debriefView(w)!.operations.enemyEvidence).toEqual([]);
});

it.each<[Resolution['kind'], Resolution]>([
  ['won', { kind: 'won', day: 0, turned: [{ npc: 'ada', family: 'ghost-family', claimId: 'ghost-claim', credence: 4 }] }],
  ['lost-exposed', { kind: 'lost-exposed', day: 0, features: [{ featureId: 'ghost-feature', subject: 'you' }] }],
  ['lost-caught', { kind: 'lost-caught', day: 0, heardBy: 'bez', venue: 'square' }],
])('a %s resolution whose fair-cop payload resolves to no world record is inconsistent', (status, resolution) => {
  const w = contractReviewWorld(); w.scenario!.status = status; w.scenario!.resolution = resolution;
  expect(debriefView(w)!.ending.resolutionState).toBe('inconsistent');
});

function contractEvidence(tick = 0) {
  return { kind: 'asking' as const, tick, venue: 'square', observer: 'bez', overheard: true,
    speaker: 'ada', addressedTo: 'bez', mode: null, claimId: null, family: null, reported: null,
    about: { subject: 'you' } };
}
function contractPhysical(tick = 0) {
  return { kind: 'night-visit' as const, tick, venue: 'chapel-d0', observer: 'bez', overheard: false,
    speaker: null, addressedTo: null, mode: null, claimId: null, family: null, reported: null, about: null,
    nightVisit: { actor: 'you', witness: 'bez', observedAt: tick } };
}
function contractEnding(status: Resolution['kind']) {
  const world = fixture();
  if (status === 'lost-caught') {
    scenario(world, 10); world.playerVenue = 'square'; world.enemy.observers = [{ id: 'bez', vigilance: 1 }]; world.tick = 15;
    applyAction(world, { tick: 15, kind: 'tell', to: 'ada', spec }, R); step(world, R);
  } else {
    if (status === 'won') applyInject(world, 'ada', spec);
    if (status === 'lost-exposed') decision(world, 0, [feature('identity', { subject: 'you' })]);
    finish(world);
  }
  expect(world.scenario!.status).toBe(status); return world;
}

describe('terminal time partitions retain every future and unknown row', () => {
  it('future physical observation appears only in the typed beyond-clock evidence sections', () => {
    const world = finish(fixture()); world.tick = 100; world.enemy.evidence.push(contractPhysical(200));
    const operations = view(world).operations;
    expect(operations.enemyEvidence).toEqual([]); expect(operations.physical.evidence).toEqual([]);
    expect(operations.beyondClock.enemyEvidence).toMatchObject([{ evidenceIndex: 0, entry: { tick: 200 } }]);
    expect(operations.beyondClock.physicalEvidence).toMatchObject([{ evidenceIndex: 0, entry: { tick: 200 } }]);
  });
  it('a retained future physical receipt is beyond the clock even when acquisition cannot yet be resolved', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.evidence.push({ ...contractPhysical(), receipt: { tick: 200, observer: 'ada', messageId: 'future-receipt' } });
    const operations = view(world).operations;
    expect(operations.enemyEvidence).toEqual([]); expect(operations.physical.evidence).toEqual([]);
    expect(operations.beyondClock.physicalEvidence[0]!.arrival).toMatchObject({ learnedAt: null, timing: 'unrecorded' });
  });
  it('a real later physical acquisition cannot appear as current acquisition when the world is rewound', () => {
    const world = scryWorld(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'away' }];
    applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; runUntil(world, 2880, R);
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }]; runUntil(world, 2926, R); finish(world);
    const evidenceIndex = world.enemy.evidence.findIndex((row) => row.kind === 'arcane-residue');
    world.tick = 2000; const operations = view(world).operations;
    expect(operations.enemyEvidence.some((row) => row.evidenceIndex === evidenceIndex)).toBe(false);
    expect(operations.physical.evidence.some((row) => row.evidenceIndex === evidenceIndex)).toBe(false);
    expect(operations.beyondClock.physicalEvidence.some((row) => row.evidenceIndex === evidenceIndex)).toBe(true);
  });
  it('ordinary and physical unknown acquisitions remain reachable without invented dates', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.evidence.push(contractEvidence(), contractPhysical());
    const operations = view(world).operations;
    expect(operations.enemyEvidence.map((row) => row.evidenceIndex)).toEqual([0, 1]);
    expect(operations.enemyEvidence.every((row) => row.arrival.learnedAt === null && row.arrival.timing === 'unrecorded')).toBe(true);
    expect(operations.physical.evidence.map((row) => row.evidenceIndex)).toEqual([1]);
    expect(operations.beyondClock.enemyEvidence).toEqual([]);
  });
  it('unrecorded feature days stay unknown while a retained future feature date is kept separately', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.sketch.push(feature('undated'), feature('future-orphan', { day: 9 }));
    const operations = view(world).operations;
    expect(operations.featureReferences).toMatchObject([{ feature: { id: 'undated' }, recordedDay: null }]);
    expect(operations.beyondClock.featureReferences).toMatchObject([{ feature: { id: 'future-orphan' }, recordedDay: null }]);
  });
  it('a current feature with a future observed reference is kept outside the current historical section', () => {
    const world = finish(fixture()); world.tick = 100;
    decision(world, 0, [feature('future-reference', { evidence: [{ tick: 200, observer: 'bez', claimId: null, messageId: null }] })]);
    const operations = view(world).operations;
    expect(operations.featureReferences).toEqual([]);
    expect(operations.beyondClock.featureReferences[0]!.recordedDay).toBe(0);
  });
  it('the boundary is inclusive, retained indexes are stable, and both partitions own their output', () => {
    const world = finish(fixture()); world.tick = 100;
    world.enemy.evidence.push(contractEvidence(200), contractEvidence(100), contractPhysical(200));
    decision(world, 0, [feature('current')]); decision(world, 9, [feature('future')]);
    const before = hashWorld(world); const expected = view(world); const changed = view(world);
    expect(changed.operations.enemyEvidence.map((row) => row.evidenceIndex)).toEqual([1]);
    expect(changed.operations.beyondClock.enemyEvidence.map((row) => row.evidenceIndex)).toEqual([0, 2]);
    changed.operations.beyondClock.physicalEvidence[0]!.entry.nightVisit!.actor = 'changed';
    expect(changed.operations.beyondClock.enemyEvidence[1]!.entry.nightVisit!.actor).toBe('you');
    changed.operations.beyondClock.featureReferences[0]!.feature.detail = 'changed';
    expect(hashWorld(world)).toBe(before); expect(view(world)).toEqual(expected);
  });
});

describe('resolution pointers require retained status-specific source identity', () => {
  it.each(['won', 'lost-clock', 'lost-exposed', 'lost-caught'] as const)('a real %s ending remains consistent without re-running the referee', (status) => {
    const world = contractEnding(status); const before = hashWorld(world);
    expect(view(world).ending.resolutionState).toBe('consistent'); expect(hashWorld(world)).toBe(before);
  });
  it('a real partial clock result resolves its retained member belief and claim', () => {
    const world = fixture(); applyInject(world, 'ada', spec); scenario(world); world.scenario!.win.quorum = 2; scenarioNightly(world, R);
    expect(view(world).ending).toMatchObject({ status: 'lost-clock', resolutionState: 'consistent' });
    const resolution = world.scenario!.resolution!; if (resolution.kind !== 'lost-clock') throw new Error('wrong ending');
    expect(resolution.turned).toHaveLength(1); delete world.beliefs.ada;
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it.each(['missing-claim', 'family', 'member', 'duplicate-member'] as const)('won %s metadata stays visible and inconsistent', (fault) => {
    const world = contractEnding('won'); const resolution = world.scenario!.resolution!;
    if (resolution.kind !== 'won') throw new Error('wrong ending');
    const turn = resolution.turned[0]!;
    if (fault === 'missing-claim') delete world.claims[turn.claimId];
    if (fault === 'family') turn.family = 'other-family';
    if (fault === 'member') turn.npc = 'other-member';
    if (fault === 'duplicate-member') resolution.turned.push(cloneSerializable(turn));
    expect(view(world).ending.resolutionState).toBe('inconsistent'); expect(view(world).ending.resolution).toEqual(resolution);
  });
  it('a won record resolves historical member identity without using the current council roster', () => {
    const world = contractEnding('won'); world.scenario!.cast.council = [];
    expect(view(world).ending.resolutionState).toBe('consistent');
  });
  it.each(['missing', 'duplicate'] as const)('%s retained institutional ending evidence cannot establish one resolution', (fault) => {
    const world = contractEnding('lost-clock'); const record = world.chronicle.find((row) => row.kind === 'institution')!;
    if (fault === 'missing') world.chronicle = world.chronicle.filter((row) => row !== record);
    else world.chronicle.push(cloneSerializable(record));
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it.each(['subject', 'conflicting-feature', 'conflicting-sketch', 'duplicate-reference', 'future-digest'] as const)('exposure %s cannot masquerade as resolved retained feature identity', (fault) => {
    const world = contractEnding('lost-exposed'); const resolution = world.scenario!.resolution!;
    if (resolution.kind !== 'lost-exposed') throw new Error('wrong ending');
    if (fault === 'subject') resolution.features[0]!.subject = 'other-person';
    if (fault === 'conflicting-feature') world.enemy.decisions[0]!.features.push(feature('identity', { subject: 'you', detail: 'conflicting same-ID copy' }));
    if (fault === 'conflicting-sketch') world.enemy.sketch.push(feature('identity', { subject: 'you', detail: 'conflicting sketch identity' }));
    if (fault === 'duplicate-reference') resolution.features.push(cloneSerializable(resolution.features[0]!));
    if (fault === 'future-digest') world.enemy.decisions[0]!.day = 9;
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it.each(['missing-speech', 'wrong-venue', 'wrong-guard', 'not-heard', 'duplicate-speech'] as const)('caught %s cannot resolve the retained arrest/capture pair', (fault) => {
    const world = contractEnding('lost-caught'); const resolution = world.scenario!.resolution!;
    if (resolution.kind !== 'lost-caught') throw new Error('wrong ending');
    const speech = world.chronicle.find((row) => row.kind === 'telling' && row.speaker === world.playerId)!;
    if (fault === 'missing-speech') world.chronicle = world.chronicle.filter((row) => row !== speech);
    if (fault === 'wrong-venue') resolution.venue = 'other-venue';
    if (fault === 'wrong-guard') resolution.heardBy = 'other-guard';
    if (fault === 'not-heard' && speech.kind === 'telling') speech.heardBy = [];
    if (fault === 'duplicate-speech') world.chronicle.push(cloneSerializable(speech));
    expect(view(world).ending.resolutionState).toBe('inconsistent');
  });
  it('a retained network-speech capture resolves without inventing a claim or requiring the current guard roster', () => {
    const world = contractEnding('lost-caught');
    const at = world.chronicle.findIndex((row) => row.kind === 'telling' && row.speaker === world.playerId);
    const telling = world.chronicle[at]!; if (telling.kind !== 'telling') throw new Error('missing speech');
    world.chronicle[at] = { kind: 'network-speech', tick: telling.tick, venue: telling.venue,
      speaker: telling.speaker, addressedTo: telling.addressedTo, heardBy: cloneSerializable(telling.heardBy),
      messageId: 'retained-captured-envelope', spoken: { kind: 'field-report', items: [], onwardTo: null }, cause: null };
    const arrest = world.chronicle.find((row) => row.kind === 'institution' && row.action === 'arrest')!;
    if (arrest.kind !== 'institution') throw new Error('missing arrest'); arrest.claimIds = [];
    world.enemy.observers = [];
    expect(view(world).ending.resolutionState).toBe('consistent');
  });
});

const RECEIPT_SPEC={subject:'cyn',predicate:'met-secretly-with',object:null,count:2,severity:4 as const,place:'square',attribution:SOMEONE};
const RECEIPT_ANSWER_AT=at(1,9);
function receiptDirect(){const town=miniTown();town.npcs=town.npcs.filter((npc)=>npc.id!=='dov');for(const npc of town.npcs){npc.edges=npc.edges.filter((e)=>e.to!=='dov');npc.traits=npc.id==='bez'?['moralizer']:[];}
 const world=buildWorld(town,'mixed-time-contract-review',R);enrollPlayer(world,{home:'square'});applyForge(world,RECEIPT_SPEC,at(0,8),R);world.tick=at(1,8);
 applyAction(world,{tick:world.tick,kind:'plant',artifact:'a0',to:'ada',venue:null},R,prepareTick(world,R));world.tick=RECEIPT_ANSWER_AT;
 const family=Object.keys(world.beliefs.ada!)[0]!;world.network.spymaster='bez';world.enemy.observers=[];world.inquiries.bez=[{about:{family},from:'enemy',expiresDay:3,asked:[],answersHeard:0,addressee:'ada'}];
 const events=step(world,R);const answer=events.utterances.find((e)=>e.mode==='answer'&&e.speaker==='ada'&&e.claim.family===family)!;
 const feature=enemyDigest(world.enemy,1,R).features.find((f)=>f.kind==='forged-document')!;
 world.enemy.decisions=[{day:1,features:[cloneSerializable(feature)],inquiries:[],interrogations:[],watches:[]}];world.enemy.sketch=[cloneSerializable(feature)];world.tick=2879;
 const index=world.enemy.evidence.findIndex((e)=>e.kind==='utterance'&&e.claimId===answer.claim.id);return{world,feature,index,answer};}
it('a unique current feature remains current when a duplicate receipt is beyond the view clock',()=>{const{world,index}=receiptDirect();const entry=world.enemy.evidence[index]!;if(entry.kind!=='utterance')throw new Error('missing utterance');
 const speech:NetworkSpeech={tick:4320,venue:'square',speaker:entry.observer!,addressedTo:'cyn',circleMembers:[entry.observer!,'cyn'],messageId:'late',cause:null,spoken:{kind:'field-report',onwardTo:null,items:[{factRefs:[],observation:{kind:'utterance',observedAt:entry.tick,venue:entry.venue,speaker:entry.speaker,addressedTo:entry.addressedTo,overheard:entry.overheard,mode:entry.mode,claimId:entry.claimId,family:entry.family,reported:entry.reported,document:true}}]}};
 world.chronicle.push({...speech,kind:'network-speech',heardBy:[{id:'cyn',addressed:true}]});world.network.spymaster='cyn';captureEvidence(world,{tick:4320,positions:{},utterances:[],askings:[],networkSpeeches:[speech]},R);
 const link=featureLinks(world)[0]!;expect(link.references[0]).toMatchObject({resolution:'resolved',evidenceIndexes:[index]});expect(link.references[0]!.laterEvidenceIndexes).toHaveLength(1);
 const later=link.references[0]!.laterEvidenceIndexes[0]!;const before=hashWorld(world);const ops=operationThreads(world);
 expect(ops.enemyEvidence.some((r)=>r.evidenceIndex===later)).toBe(false);expect(ops.beyondClock.enemyEvidence.some((r)=>r.evidenceIndex===later)).toBe(true);
 expect(ops.featureReferences).toHaveLength(1);expect(ops.featureReferences[0]!.references[0]).toMatchObject({resolution:'resolved',evidenceIndexes:[index],laterEvidenceIndexes:[]});
 expect(hashWorld(world)).toBe(before);
});

function receiptMixed(receiptAt = 4320) {
const{world,index}=receiptDirect();const entry=world.enemy.evidence[index]!;if(entry.kind!=='utterance')throw new Error('missing utterance');
 const speech:NetworkSpeech={tick:receiptAt,venue:'square',speaker:entry.observer!,addressedTo:'cyn',circleMembers:[entry.observer!,'cyn'],messageId:'late',cause:null,spoken:{kind:'field-report',onwardTo:null,items:[{factRefs:[],observation:{kind:'utterance',observedAt:entry.tick,venue:entry.venue,speaker:entry.speaker,addressedTo:entry.addressedTo,overheard:entry.overheard,mode:entry.mode,claimId:entry.claimId,family:entry.family,reported:entry.reported,document:true}}]}};
 world.chronicle.push({...speech,kind:'network-speech',heardBy:[{id:'cyn',addressed:true}]});world.network.spymaster='cyn';captureEvidence(world,{tick:receiptAt,positions:{},utterances:[],askings:[],networkSpeeches:[speech]},R);

 return { world, index };
}

describe('current feature projection keeps later receipt context separate', () => {
  it('the current copy excludes the future index while the beyond-clock copy preserves the original link context', () => {
    const { world, index } = receiptMixed(); const original = featureLinks(world)[0]!;
    const later = original.references[0]!.laterEvidenceIndexes[0]!; const operations = operationThreads(world);
    expect(operations.featureReferences).toHaveLength(1); expect(operations.beyondClock.featureReferences).toHaveLength(1);
    expect(operations.featureReferences[0]!.feature).toEqual(original.feature);
    expect(operations.featureReferences[0]!.recordedDay).toBe(original.recordedDay);
    expect(operations.featureReferences[0]!.references[0]).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], laterEvidenceIndexes: [] });
    expect(operations.featureReferences[0]!.references[0]!.attentionIds).toEqual(original.references[0]!.attentionIds);
    expect(operations.beyondClock.featureReferences[0]).toEqual(original);
    expect(operations.beyondClock.enemyEvidence.some((row) => row.evidenceIndex === later)).toBe(true);
  });
  it('an undated competing occurrence is preserved without upgrading the current association', () => {
    const { world, index } = receiptMixed(); const unknown = cloneSerializable(world.enemy.evidence[index]!);
    unknown.venue = 'missing-history'; world.enemy.evidence.push(unknown); const unknownIndex = world.enemy.evidence.length - 1;
    const operations = operationThreads(world); const reference = operations.featureReferences[0]!.references[0]!;
    expect(reference).toMatchObject({ resolution: 'ambiguous', evidenceIndexes: [index], undatedEvidenceIndexes: [unknownIndex], laterEvidenceIndexes: [] });
    expect(operations.enemyEvidence.find((row) => row.evidenceIndex === unknownIndex)!.arrival.learnedAt).toBeNull();
    expect(operations.beyondClock.featureReferences[0]!.references[0]!.laterEvidenceIndexes).toHaveLength(1);
  });
  it('projecting one reference preserves a separate current reference and its original position', () => {
    const { world, index } = receiptMixed();
    const second = { tick: world.enemy.evidence[index]!.tick, observer: 'missing-observer', claimId: 'missing-claim', messageId: null };
    world.enemy.decisions[0]!.features[0]!.evidence.push(second);
    const original = featureLinks(world)[0]!; const operations = operationThreads(world);
    expect(operations.featureReferences[0]!.references).toHaveLength(2);
    expect(operations.featureReferences[0]!.references[0]!.laterEvidenceIndexes).toEqual([]);
    expect(operations.featureReferences[0]!.references[1]).toEqual(original.references[1]);
    expect(operations.featureReferences[0]!.references[1]!.resolution).toBe('missing');
    expect(operations.beyondClock.featureReferences[0]).toEqual(original);
  });
  it('both copies, their arrays and their feature metadata are independent of each other and the source', () => {
    const { world } = receiptMixed(); const before = hashWorld(world); const expected = operationThreads(world); const changed = operationThreads(world);
    changed.featureReferences[0]!.feature.detail = 'changed current'; changed.featureReferences[0]!.references[0]!.ref.observer = 'changed current';
    changed.featureReferences[0]!.references[0]!.evidenceIndexes.push(999);
    expect(changed.beyondClock.featureReferences).toEqual(expected.beyondClock.featureReferences);
    changed.beyondClock.featureReferences[0]!.references[0]!.laterEvidenceIndexes.push(998);
    expect(changed.featureReferences[0]!.references[0]!.laterEvidenceIndexes).toEqual([]);
    expect(hashWorld(world)).toBe(before); expect(operationThreads(world)).toEqual(expected);
  });
  it('a current feature supported only by a future receipt remains current with unrecorded present support', () => {
    const { world, index } = receiptMixed(); world.enemy.evidence.splice(index, 1);
    const original = featureLinks(world)[0]!;
    expect(original.references[0]).toMatchObject({ resolution: 'late', evidenceIndexes: [] });
    expect(original.references[0]!.laterEvidenceIndexes).toHaveLength(1);
    const operations = operationThreads(world);
    expect(operations.featureReferences[0]!.references[0]).toMatchObject({ resolution: 'unrecorded', attentionResolution: 'unrecorded',
      evidenceIndexes: [], undatedEvidenceIndexes: [], laterEvidenceIndexes: [], attentionIds: [] });
    expect(operations.beyondClock.featureReferences[0]).toEqual(original);
  });
  it('the exact receipt clock returns the unchanged full current link with no beyond-clock duplicate', () => {
    const { world } = receiptMixed(); world.tick = 4320; const original = featureLinks(world)[0]!;
    const operations = operationThreads(world);
    expect(operations.featureReferences).toEqual([original]); expect(operations.beyondClock.featureReferences).toEqual([]);
    expect(operations.beyondClock.enemyEvidence).toEqual([]);
  });
  it('clipping a future same-day competing support never invents a newly resolved attention join', () => {
    const { world, index } = receiptMixed(2040); world.tick = 2000;
    const original = featureLinks(world)[0]!; expect(original.references[0]!.resolution).toBe('ambiguous');
    const operations = operationThreads(world); const current = operations.featureReferences[0]!.references[0]!;
    expect(current).toMatchObject({ resolution: 'unrecorded', attentionResolution: 'unrecorded', evidenceIndexes: [index],
      undatedEvidenceIndexes: [], laterEvidenceIndexes: [], attentionIds: [] });
    expect(operations.beyondClock.featureReferences[0]).toEqual(original);
    expect(operations.enemyEvidence.every((row) => row.arrival.learnedAt === null || row.arrival.learnedAt <= world.tick)).toBe(true);
  });
});
