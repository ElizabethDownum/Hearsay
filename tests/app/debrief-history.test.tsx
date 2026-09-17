import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DebriefThreads, type DebriefArt } from '../../app/src/panels/DebriefThreads';
import { DebriefTimeline } from '../../app/src/panels/DebriefTimeline';
import { DebriefOverlay } from '../../app/src/panels/DebriefOverlay';
import { resolveSlot, UI_GLYPHS } from '../../app/src/assets';
import { renderClaim } from '../../src/content/render';
import { at } from '../../src/core/time';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { prepareTick } from '../../src/sim/phases';
import type { NetworkSpeech } from '../../src/sim/directives/types';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { applyForge, applyShow } from '../../src/sim/artifacts';
import { applyAction } from '../../src/sim/campaign';
import { applyEnemyDecision, captureEvidence } from '../../src/sim/counterintel';
import { debriefView } from '../../src/sim/debrief/index';
import { holdFieldObservation, queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { blankIntel, claimNames } from '../../src/sim/fieldwork';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { scenarioNightly } from '../../src/sim/scenario/referee';
import { runUntil, step } from '../../src/sim/step';
import type { WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';
import { scryWorld } from '../sim/helpers/scry-world';
import { nightVisitWorld } from '../sim/helpers/seance-town';
import { terminalStory } from './helpers/debrief-campaign';

const art: DebriefArt = { paper: resolveSlot('texture.paper.debrief'), icons: {
  letter: { resolved: resolveSlot('icon.ui.letter'), fallback: UI_GLYPHS.letter! },
  'forgery-quill': { resolved: resolveSlot('icon.ui.forgery-quill'), fallback: UI_GLYPHS['forgery-quill']! },
  scrying: { resolved: resolveSlot('icon.ui.scrying'), fallback: UI_GLYPHS.scrying! },
  seance: { resolved: resolveSlot('icon.ui.seance'), fallback: UI_GLYPHS.seance! },
} };
function fresh() {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => ['ada', 'bez'].includes(npc.id));
  for (const npc of town.npcs) { npc.traits = ['literalist']; npc.edges = []; }
  const world = buildWorld(town, 'debrief-ui-history', R); enrollPlayer(world, { home: 'backroom' }); world.enemy.observers = [];
  return world;
}
function finish(world: WorldState) {
  world.scenario = { defId: 'ui-history', days: Math.floor(world.tick / 1440) + 1, win: { kind: 'council-turns', quorum: 1 },
    cast: { usurper: 'bez', council: ['ada'] }, status: 'running', resolution: null };
  scenarioNightly(world, R); return world;
}
function render(world: WorldState) {
  const before = hashWorld(world); const view = debriefView(world); if (!view) throw new Error('terminal model missing');
  const names = claimNames(world);
  const result = { view, threads: renderToStaticMarkup(<DebriefThreads view={view} names={names} art={art} />),
    timeline: renderToStaticMarkup(<DebriefTimeline view={view} names={names} />),
    overlay: renderToStaticMarkup(<DebriefOverlay view={view} names={names} />) };
  expect(hashWorld(world)).toBe(before); return result;
}
function watch() {
  const world = fresh(); world.network.spymaster = 'ada';
  world.network.enemyAssets.push({ id: 'bez', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
  world.enemy.observers = [{ id: 'bez', vigilance: 1 }];
  applyEnemyDecision(world, { day: 0, features: [], inquiries: [], interrogations: [], watches: [
    { district: 'd0', posts: [{ guard: 'bez', venue: 'square' }], startDay: 1 },
  ] });
  const record = world.network.directiveState!.records[0]!;
  const packet = world.network.directiveState!.messages.find((row) => row.payload.kind === 'directive')!;
  if (packet.payload.kind !== 'directive') throw new Error('watch packet missing');
  record.authored.brief.report = 'none'; packet.payload.version.brief.report = 'none';
  runUntil(world, 2581, R); runUntil(world, record.received!.version.brief.active.until + 1, R);
  return finish(world);
}

describe('operation and receipt distinctions survive actual rendering', () => {
  it('a fixed forged sheet and its separately minted viewing story are both readable with null-slot glyphs', () => {
    const world = fresh(); world.playerVenue = 'square';
    applyForge(world, { subject: 'bez', predicate: 'stole', object: null, count: 2,
      severity: 4, place: 'square', attribution: 'someone' }, 0, R); world.tick = 1440;
    applyShow(world, 'a0', 'ada', 1440, [{ venue: 'square', members: ['you', 'ada'] }]);
    const result = render(finish(world));
    expect(result.view.operations.artifacts[0]!.storyFamilies).toEqual([result.view.operations.stories[0]!.family]);
    expect(result.threads).toContain('Current holder:'); expect(result.threads).toContain('✉'); expect(result.threads).toContain('✒');
    expect(result.threads).toContain('Paper links:');
  });

  it('actual delayed physical acquisition is displayed after observation without naming a caster or attention act', () => {
    const world = scryWorld(); world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'away' }];
    applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
    world.tick = 1440; runUntil(world, 2880, R);
    world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hq' }]; runUntil(world, 2926, R);
    const result = render(finish(world)); const physical = result.view.operations.physical.evidence[0]!;
    expect(physical.arrival).toMatchObject({ observedAt: 1440, learnedAt: 2925, timing: 'report' });
    const portion = result.threads.split('Physical evidence ')[1]!.split('</article>')[0]!;
    expect(portion).toContain('day 1'); expect(portion).toContain('day 2'); expect(portion).toContain('enemy acquired');
    expect(result.threads).toContain('Residue does not identify a caster');
    expect(result.view.calendar.days.at(-1)!.overlay.attention.actual).toEqual([]);
    expect(result.overlay).toContain('deliberately no semantic attention act');
  });

  it('a real séance and same-place chapel sighting remain separate histories with no invented ritual witness', () => {
    const world = nightVisitWorld(); applyAction(world, { tick: 0, kind: 'seance' }, R); runUntil(world, 46, R);
    const result = render(finish(world));
    expect(result.view.operations.magic.operations).toHaveLength(1);
    expect(result.view.operations.physical.records.some((row) => row.record.kind === 'night-visit')).toBe(true);
    expect(result.threads).toContain('This later testimony is not a newly created story');
    expect(result.threads).toContain('A chapel visit does not prove a ritual'); expect(result.threads).toContain('✧');
  });

  it.each(['omitted', 'unknown'] as const)('an actual retained %s report stage shows no invented spoken account', (state) => {
    const { world } = terminalStory();
    const speech = world.chronicle.find((row) => row.kind === 'network-speech' && row.speaker === 'bez')!;
    if (speech.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') throw new Error('real report missing');
    if (state === 'omitted') { speech.spoken.items = []; speech.reportRoots = []; } else delete speech.reportRoots;
    const result = render(world); const packet = result.view.operations.reportItems[0]!.packets[0]!;
    expect(packet.stages.at(-1)).toMatchObject({ status: state, item: null, changes: null });
    const portion = result.threads.split('<h3>Reported items</h3>')[1]!.split('<h3>')[0]!;
    expect(portion).toContain(state === 'omitted' ? 'Omitted from this speech' : 'Item association unknown');
    expect(portion.match(/This item was spoken\./g)).toHaveLength(1); expect(portion).not.toContain('marked words changed');
  });

  it('a day-one human receipt leaves the earlier board empty and unknown receipts stay off both days', () => {
    const world = fresh(); holdFieldObservation(world, 'player', 'ada', { kind: 'raw', observation: {
      kind: 'presence', tick: 0, venue: 'square', actor: 'bez',
    } }, null, ['you'], null, []);
    queueUnqueuedFieldReports(world); runUntil(world, 1440, R); expect(world.intel.log).toEqual([]);
    world.playerVenue = 'square'; runUntil(world, 1441, R); finish(world);
    const result = render(world); const day0 = result.timeline.split('id="debrief-day-0"')[1]!.split('</article>')[0]!;
    const day1 = result.timeline.split('id="debrief-day-1"')[1]!.split('</article>')[0]!;
    expect(day0).toContain('No received board entries'); expect(day1).not.toContain('No received board entries');
    expect(result.view.calendar.days[1]!.player.knowledge[0]!.learnedAt).toBe(1440);
    world.chronicle = world.chronicle.filter((row) => row.kind !== 'network-speech'); const missing = render(world);
    expect(missing.view.calendar.days.every((day) => day.player.log.length === 0)).toBe(true);
    expect(missing.timeline).toContain('1 player receipt(s)'); expect(missing.timeline).toContain('not placed on day zero');
  });

  it('actual no-report watch work remains readable after expiry without a fabricated headquarters account', () => {
    const result = render(watch()); const overlay = result.view.calendar.days.at(-1)!.overlay;
    expect(overlay.attention.actual.some((act) => act.kind === 'watch')).toBe(true); expect(overlay.headquartersAccounts).toEqual([]);
    expect(result.threads).toContain('Latest execution state: aborted'); expect(result.overlay).toContain('performed');
    expect(result.overlay).toContain('Actual attention without a matched received signal: watch:');
  });

  it.each(['received', 'issued'] as const)('removing actual %s watch history yields readable uncertainty instead of a false phantom', (state) => {
    const world = watch(); const record = world.network.directiveState!.records[0]!;
    const work = record.outcomes!.find((row) => row.result.enemyAction?.kind === 'watch-worked')!.result.enemyAction!;
    world.intel.log.push({ ...blankIntel(), kind: 'presence', via: 'self', tick: work.occurredAt,
      venue: work.venue, actor: work.guard, overheard: true }); delete record.outcomes;
    if (state === 'issued') record.received = null;
    const result = render(world); const signal = result.view.calendar.days.at(-1)!.overlay.signals.find((row) => row.kind === 'watch')!;
    expect(signal.status).toBe(state === 'received' ? 'unrecorded-work' : 'issued-unproved');
    expect(result.overlay).toContain(state === 'received' ? 'Related work history is unrecorded' : 'does not prove it was performed');
    expect(result.overlay).not.toContain('This is a phantom');
  });
});

// Add after the exact independently reviewed 313-case contract has been bound.
it('known future feature references stay in the separate terminal section instead of current conclusions', () => {
  const { world } = terminalStory();
  const future = { id: 'UI_FUTURE_FEATURE', kind: 'carrier-profile' as const, day: 9, subject: 'you',
    family: null, district: null, detail: 'not a current conclusion', evidence: [] };
  world.enemy.decisions.push({ day: 9, features: [future], inquiries: [], watches: [], interrogations: [] });
  world.enemy.sketch.push(future);
  const result = render(world);
  expect(result.view.operations.featureReferences.some((row) => row.feature.id === future.id)).toBe(false);
  expect(result.view.operations.beyondClock.featureReferences.some((row) => row.feature.id === future.id)).toBe(true);
  expect(result.threads.split('<h3>Known future operation records</h3>')[0]).not.toContain(future.id);
  expect(result.threads.split('<h3>Known future operation records</h3>')[1]).toContain(future.id);
  expect(result.timeline).not.toContain(future.id); expect(result.overlay).not.toContain(future.id);
});

it('rewound actual physical receipts remain inspectable in the future partition without a current acquisition card', () => {
  const world = scryWorld(); applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, R);
  world.tick = 1440; runUntil(world, 1486, R); finish(world); world.tick = 1439;
  const result = render(world);
  expect(result.view.operations.physical.evidence).toEqual([]);
  expect(result.view.operations.beyondClock.physicalEvidence.length).toBeGreaterThan(0);
  const physical = result.threads.split('<h3>Physical sightings and acquisition</h3>')[1]!.split('<h3>')[0]!;
  expect(physical).not.toContain('Physical evidence ');
  expect(result.threads).toContain('Read future evidence, physical acquisitions and feature references');
  expect(result.view.operations.beyondClock.physicalEvidence[0]!.evidenceIndex).toBeGreaterThanOrEqual(0);
});

it('a current supported feature stays readable when a duplicate receipt is separately beyond the clock', () => {
  const town = miniTown(); town.npcs = town.npcs.filter((npc) => npc.id !== 'dov');
  for (const npc of town.npcs) { npc.edges = npc.edges.filter((edge) => edge.to !== 'dov'); npc.traits = npc.id === 'bez' ? ['moralizer'] : []; }
  const world = buildWorld(town, 'mixed-time-ui-control', R); enrollPlayer(world, { home: 'square' });
  applyForge(world, { subject: 'cyn', predicate: 'met-secretly-with', object: null, count: 2, severity: 4,
    place: 'square', attribution: 'someone' }, at(0, 8), R); world.tick = at(1, 8);
  applyAction(world, { tick: world.tick, kind: 'plant', artifact: 'a0', to: 'ada', venue: null }, R, prepareTick(world, R));
  world.tick = at(1, 9); const family = Object.keys(world.beliefs.ada!)[0]!;
  world.network.spymaster = 'bez'; world.enemy.observers = [];
  world.inquiries.bez = [{ about: { family }, from: 'enemy', expiresDay: 3, asked: [], answersHeard: 0, addressee: 'ada' }];
  const answer = step(world, R).utterances.find((row) => row.mode === 'answer' && row.speaker === 'ada' && row.claim.family === family)!;
  const feature = enemyDigest(world.enemy, 1, R).features.find((row) => row.kind === 'forged-document')!;
  world.enemy.decisions = [{ day: 1, features: [cloneSerializable(feature)], inquiries: [], interrogations: [], watches: [] }];
  world.enemy.sketch = [cloneSerializable(feature)]; world.tick = 2879;
  const index = world.enemy.evidence.findIndex((row) => row.kind === 'utterance' && row.claimId === answer.claim.id);
  const entry = world.enemy.evidence[index]!; if (entry.kind !== 'utterance') throw new Error('actual current evidence missing');
  const speech: NetworkSpeech = { tick: 4320, venue: 'square', speaker: entry.observer!, addressedTo: 'cyn',
    circleMembers: [entry.observer!, 'cyn'], messageId: 'future-duplicate-ui', cause: null,
    spoken: { kind: 'field-report', onwardTo: null, items: [{ factRefs: [], observation: { kind: 'utterance',
      observedAt: entry.tick, venue: entry.venue, speaker: entry.speaker, addressedTo: entry.addressedTo, overheard: entry.overheard,
      mode: entry.mode, claimId: entry.claimId, family: entry.family, reported: entry.reported, document: true } }] } };
  world.chronicle.push({ ...speech, kind: 'network-speech', heardBy: [{ id: 'cyn', addressed: true }] });
  const capturedFrom = world.enemy.evidence.length;
  world.network.spymaster = 'cyn'; captureEvidence(world, { tick: 4320, positions: {}, utterances: [], askings: [], networkSpeeches: [speech] }, R);
  const duplicateIndex = world.enemy.evidence.findIndex((row, evidenceIndex) => evidenceIndex >= capturedFrom
    && row.kind === 'utterance' && row.claimId === entry.claimId && row.observer === speech.speaker);
  expect(duplicateIndex).toBeGreaterThanOrEqual(capturedFrom);
  const result = render(finish(world)); const current = result.view.operations.featureReferences.find((row) => row.feature.id === feature.id)!;
  expect(current, 'the current supported feature must remain in the rendered current-reference section').toBeDefined();
  expect(current.references[0]).toMatchObject({ resolution: 'resolved', evidenceIndexes: [index], laterEvidenceIndexes: [] });
  const currentDetail = result.threads.split('Every feature and its retained reference resolution</summary>')[1]!.split('</details>')[0]!;
  expect(currentDetail).toContain(feature.id);
  const future = result.view.operations.beyondClock.enemyEvidence;
  expect(future.some((row) => row.entry.kind === 'network' && row.entry.network.messageId === speech.messageId)).toBe(true);
  expect(future.some((row) => row.evidenceIndex === duplicateIndex && row.entry.claimId === entry.claimId)).toBe(true);
  expect(result.view.operations.beyondClock.featureReferences.find((row) => row.feature.id === feature.id)!
    .references[0]!.laterEvidenceIndexes).toContain(duplicateIndex);
  for (const row of future) {
    expect(result.view.operations.enemyEvidence.some((candidate) => candidate.evidenceIndex === row.evidenceIndex)).toBe(false);
    for (const reference of current.references) {
      expect(reference.evidenceIndexes).not.toContain(row.evidenceIndex);
      expect(reference.laterEvidenceIndexes).not.toContain(row.evidenceIndex);
      expect(reference.undatedEvidenceIndexes).not.toContain(row.evidenceIndex);
    }
  }
  expect(result.threads.split('<h3>Known future operation records</h3>')[1]).toContain('future-duplicate-ui');
  expect(result.threads).toContain('Later receipt context for current feature IDs: '+feature.id);
  expect(result.threads).toContain('does not mean it was created again in the future');
});

it('the actual received report copy reads as prose on Overlay without substituting the private original', () => {
  const { world, claimId } = terminalStory(); const result = render(world);
  const item = result.view.calendar.days.at(-1)!.overlay.receivedReportItems.find((row) => row.stage.status === 'spoken')!.stage.item!;
  if (item.observation.kind !== 'utterance') throw new Error('received claim absent');
  const nameOf = (id: string) => claimNames(world)[id] ?? id;
  expect(item.observation.reported.count).toBe(4); expect(world.claims[claimId]!.count).toBe(2);
  const received = renderToStaticMarkup(<p>{renderClaim(item.observation.reported, nameOf)}</p>);
  const original = renderToStaticMarkup(<p>{renderClaim(world.claims[claimId]!, nameOf)}</p>);
  expect(result.overlay).toContain(received); expect(result.overlay).not.toContain(original);
});

it('typed retained headquarters and returned directive claims read as reports with exact details still available', () => {
  const world = watch(); const view = render(world).view; const names = claimNames(world); const directive = view.operations.directives[0]!;
  const reported = { subject: 'bez', predicate: 'stole', object: null, count: 17, severity: 4 as const, place: 'square', attribution: 'someone' };
  const report = { outcome: 'The asset reported this account', reason: null,
    evidence: [{ kind: 'claim' as const, claimId: 'retained-report-reference', reported }], source: 'bez', uncertainty: 'high' as const };
  directive.returnedAccounts.push({ receivedAt: world.tick, via: 'bez', report });
  view.calendar.days.at(-1)!.overlay.headquartersAccounts.push({ chronicleIndex: 999, receivedAt: world.tick,
    copy: { kind: 'directive-report', directiveId: directive.directiveId, report, enemyAction: null, factRefs: [], onwardTo: null } });
  const prose = renderToStaticMarkup(<p>{renderClaim(reported, (id) => names[id] ?? id)}</p>);
  const threads = renderToStaticMarkup(<DebriefThreads view={view} names={names} art={art} />);
  const overlay = renderToStaticMarkup(<DebriefOverlay view={view} names={names} />);
  expect(threads).toContain(prose); expect(overlay).toContain(prose);
  expect(threads).toContain('Read returned accounts'); expect(overlay).toContain('not proof that every claim was true');
});
