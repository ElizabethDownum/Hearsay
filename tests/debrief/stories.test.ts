import { describe, expect, it } from 'vitest';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { TICKS_PER_DAY } from '../../src/core/time';
import { storyThreads, artifactThreads, unresolvedStoryEvents } from '../../src/sim/debrief/stories';
import { applyForge, applyShow } from '../../src/sim/artifacts';
import { hashWorld } from '../../src/sim/hash';
import { diffClaims, mintClaim, type Claim } from '../../src/sim/rumors/claim';
import { STANCE } from '../../src/sim/rumors/propagation';
import type { TellingRecord, WorldState } from '../../src/sim/types';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from '../sim/helpers/minitown';

const spec = { subject: 'cyn', predicate: 'stole', object: null, count: 2,
  severity: 4 as const, place: 'square', attribution: 'someone' };
function fixture() {
  const world = buildWorld(miniTown(), 'story-history', RULES);
  enrollPlayer(world, { home: 'square' }); return world;
}
function claim(world: WorldState, over: Partial<Omit<Claim, 'id'>> = {}) {
  const value = mintClaim(world, { ...spec, family: 'f0', parent: null, ...over });
  world.claims[value.id] = value; return value;
}
function speech(value: Claim, over: Partial<TellingRecord> = {}): TellingRecord {
  return { kind: 'telling', tick: 15, venue: 'square', speaker: 'ada', addressedTo: 'bez',
    mode: 'telling', claimId: value.id, heardBy: [{ id: 'bez', addressed: true }, { id: 'cyn', addressed: false }], ...over };
}
function belief(world: WorldState, value: Claim, credence: number) {
  world.beliefs.ada![value.family] = { claim: value, credence, heardFrom: 'injected', heardAt: 0,
    firstHeardAt: 0, timesHeard: 1, apparentSources: [], discretion: false, counterSpun: false };
}
function shownWorld() {
  const world = fixture(); applyForge(world, spec, 0, RULES);
  world.tick = TICKS_PER_DAY;
  applyShow(world, 'a0', 'ada', world.tick, [{ venue: 'square', members: ['you', 'ada', 'bez'] }]);
  return world;
}

describe('complete story lineage and actual event copies', () => {
  it('does not invent stories in an untouched world', () => {
    expect(storyThreads(fixture())).toEqual([]);
    expect(unresolvedStoryEvents(fixture())).toEqual([]);
  });
  it('retains origin, every actual audience, and the exact seven-field parent diff', () => {
    const world = fixture(); const root = claim(world); const changed = claim(world, { parent: root.id, count: 7 });
    world.tick = 30;
    world.chronicle.push({ kind: 'inject', tick: 0, target: 'ada', by: 'player', claimId: root.id }, speech(changed));
    const thread = storyThreads(world)[0]!;
    expect(thread.originEventIndexes).toEqual([0]);
    expect(thread.events.map((event) => event.chronicleIndex)).toEqual([0, 1]);
    expect(thread.events[1]).toMatchObject({ changes: diffClaims(root, changed), changedBy: 'ada',
      record: { heardBy: [{ id: 'bez', addressed: true }, { id: 'cyn', addressed: false }] } });
  });
  it('an unchanged retelling has an empty diff and names no mind as changing it', () => {
    const world = fixture(); const root = claim(world); const repeated = claim(world, { parent: root.id });
    world.tick = 15; world.chronicle.push(speech(repeated));
    expect(storyThreads(world)[0]!.events[0]).toMatchObject({ changes: [], changedBy: null });
  });
  it('branches compare with their actual parent rather than the preceding chronicle event', () => {
    const world = fixture(); const root = claim(world);
    const branchA = claim(world, { parent: root.id, count: 7 });
    const branchB = claim(world, { parent: root.id, severity: 5 });
    world.tick = 30; world.chronicle.push(speech(branchA), speech(branchB, { tick: 30, speaker: 'bez' }));
    expect(storyThreads(world)[0]!.events[1]!.changes).toEqual([{ field: 'severity', from: 4, to: 5 }]);
  });
  it('preserves repeated events and original ordering when two records share a tick', () => {
    const world = fixture(); const value = claim(world); world.tick = 15;
    world.chronicle.push(speech(value), speech(value));
    expect(storyThreads(world)[0]!.events.map((event) => event.chronicleIndex)).toEqual([0, 1]);
  });
  it('keeps missing parent and missing event claims explicit without inventing a mutation', () => {
    const world = fixture(); const value = claim(world, { parent: 'missing' }); world.tick = 15;
    world.chronicle.push(speech(value), speech(value, { claimId: 'absent' }));
    expect(storyThreads(world)[0]!.versions[0]).toMatchObject({ parentState: 'missing', changes: null });
    expect(storyThreads(world)[0]!.events[0]!.changedBy).toBeNull();
    expect(unresolvedStoryEvents(world)).toEqual([{ chronicleIndex: 1, record: world.chronicle[1] }]);
  });
  it('does not treat a different family as a valid lineage parent', () => {
    const world = fixture(); const other = claim(world, { family: 'f-other' });
    claim(world, { parent: other.id });
    expect(storyThreads(world).find((row) => row.family === 'f0')!.versions[0]).toMatchObject({ parentState: 'other-family', changes: null });
  });
  it('uses the two-day inactivity condition together with the live REPEAT belief threshold', () => {
    const world = fixture(); const value = claim(world); world.chronicle.push(speech(value, { tick: 0 }));
    world.tick = 2 * TICKS_PER_DAY - 1; expect(storyThreads(world)[0]!.died).toBe(false);
    world.tick += 1; expect(storyThreads(world)[0]!.died).toBe(true);
    belief(world, value, STANCE.REPEAT); expect(storyThreads(world)[0]!.died).toBe(false);
    world.beliefs.ada![value.family]!.credence = STANCE.REPEAT - 0.01;
    expect(storyThreads(world)[0]!.died).toBe(true);
  });
  it('retains unknown activity for an orphan family and excludes unprocessed future events', () => {
    const world = fixture(); const value = claim(world); world.chronicle.push(speech(value));
    expect(storyThreads(world)[0]).toMatchObject({ lastActivityAt: null, died: null, events: [] });
  });
  it('links terminal enemy evidence by immutable family, preserving actual evidence indexes', () => {
    const world = fixture(); const value = claim(world);
    world.enemy.evidence.push({ kind: 'utterance', tick: 0, venue: 'square', observer: 'bez', overheard: false,
      speaker: 'ada', addressedTo: 'bez', mode: 'answer', claimId: value.id, family: value.family,
      reported: { ...spec, subject: 'dov' }, about: null });
    expect(storyThreads(world)[0]!.becameEvidence).toEqual([0]);
  });
  it('a real paper viewing appears in its fresh story family and preserves evidence-weight belief', () => {
    const world = shownWorld(); const thread = storyThreads(world)[0]!;
    expect(thread.artifactIds).toEqual(['a0']);
    expect(thread.events).toHaveLength(1); expect(thread.events[0]!.record.kind).toBe('artifact');
    expect(thread.beliefs[0]).toMatchObject({ npc: 'ada', belief: { credence: 0.97 } });
    expect(thread.originEventIndexes).toEqual([1]);
  });
});

describe('paper operations preserve exact viewing identity', () => {
  it('retains the actual forge and show, separating current custody from the reader', () => {
    const world = shownWorld(); const thread = artifactThreads(world)[0]!;
    expect(thread.artifact!.heldBy).toBe('you');
    expect(thread.events.map((event) => event.claimLink)).toEqual(['not-a-viewing', 'linked']);
    expect(thread.events[1]!.record.to).toBe('ada');
    expect(thread.storyFamilies).toEqual([thread.events[1]!.claim!.family]);
  });
  it('identical papers shown in the same beat still link to their own minted claims', () => {
    const world = fixture(); applyForge(world, spec, 0, RULES); applyForge(world, spec, 0, RULES);
    world.tick = TICKS_PER_DAY;
    const offered = [{ venue: 'square', members: ['you', 'ada'] }];
    applyShow(world, 'a0', 'ada', world.tick, offered); applyShow(world, 'a1', 'ada', world.tick, offered);
    const papers = artifactThreads(world);
    expect(papers.map((row) => row.events[1]!.claimLink)).toEqual(['linked', 'linked']);
    expect(papers[0]!.events[1]!.claim!.id).not.toBe(papers[1]!.events[1]!.claim!.id);
    expect(papers[0]!.storyFamilies).not.toEqual(papers[1]!.storyFamilies);
  });
  it('a legacy viewing without a claim id never guesses from matching text and tick', () => {
    const world = shownWorld(); const row = world.chronicle[1]!;
    if (row.kind !== 'artifact') throw new Error('missing viewing');
    delete row.claimId;
    expect(artifactThreads(world)[0]!.events[1]).toMatchObject({ claimLink: 'unrecorded', claim: null, family: null });
  });
  it('distinguishes an explicit missing claim from a missing link', () => {
    const world = shownWorld(); const row = world.chronicle[1]!;
    if (row.kind !== 'artifact') throw new Error('missing viewing');
    row.claimId = 'missing';
    expect(artifactThreads(world)[0]!.events[1]).toMatchObject({ claimLink: 'missing-claim', claim: null });
  });
  it('preserves an orphaned paper event when the artifact object is absent', () => {
    const world = fixture(); world.chronicle.push({ kind: 'artifact', tick: 0, act: 'forge', artifact: 'old', by: 'you', to: null });
    expect(artifactThreads(world)[0]).toMatchObject({ artifactId: 'old', artifact: null, storyFamilies: [] });
    expect(artifactThreads(world)[0]!.events).toHaveLength(1);
  });
  it('returns independent nested copies without mutating the world or another output view', () => {
    const world = shownWorld(); const before = hashWorld(world);
    const stories = storyThreads(world); const papers = artifactThreads(world);
    papers[0]!.artifact!.spec.count = 99; papers[0]!.events[1]!.record.to = 'changed';
    stories[0]!.beliefs[0]!.belief.credence = 0;
    expect(hashWorld(world)).toBe(before);
    expect(stories[0]!.events[0]!.record).toMatchObject({ to: 'ada' });
    expect(storyThreads(world)[0]!.beliefs[0]!.belief.credence).toBe(0.97);
  });
});
