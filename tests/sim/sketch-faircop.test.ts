import { describe, expect, it } from 'vitest';
import { runUntil, step } from '../../src/sim/step';
import { applyInject } from '../../src/sim/actions';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { buildTownMap, buildWorld, enrollPlayer } from '../../src/sim/world';
import type { DirectiveBrief } from '../../src/sim/directives/types';
import type { Npc, TownFixture, WorldState } from '../../src/sim/types';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { cloneSerializable } from '../../src/sim/hash';
import type { SketchEvidenceRef, SketchFeature } from '../../src/sim/enemy/state';
import { watchfordWorld } from './helpers/watchford-world';
import { scryWorld } from './helpers/scry-world';
import { auditSketch } from './helpers/sketch-audit';

describe('sketch fair-cop — every feature traces to a chronicle record the observer heard', () => {
  it('holds over an emergent multi-day Watchford world', () => {
    const world = watchfordWorld('faircop-1');
    world.network.spymaster = 'gale'; // embodied handler's own heard feed drives the fair-cop chain
    applyInject(world, 'mira', { subject: 'otto', predicate: 'stole', object: null,
      count: 2, severity: 4, place: null, attribution: SOMEONE });
    applyInject(world, 'quill', { subject: 'hugo', predicate: 'is-having-an-affair-with', object: 'rosa',
      count: null, severity: 3, place: null, attribution: SOMEONE });
    runUntil(world, at(4, 0), STANDARD_RULES);

    // Non-vacuous: the emergent run must actually have grown a sketch to audit.
    expect(world.enemy.sketch.length).toBeGreaterThan(0);
    auditSketch(world);
  });

  it('holds for a NETWORK ref too — a brief lead resolves to the speech the spymaster heard', () => {
    const npc = (id: string, home: string, occupation = 'grocer'): Npc => ({
      id, name: id, home, occupation, faction: 'none', traits: ['literalist'],
      rivals: [], schedule: [{ days: 'all', from: 0, to: 1439, venue: home }], edges: [],
    });
    const fixture: TownFixture = {
      venues: [
        { id: 'square', district: 'd0', access: 'public' },
        { id: 'home-mira', district: 'd0', access: 'private' },
      ],
      npcs: [npc('boss', 'square', 'clerk'), npc('gale', 'square', 'guard'),
        npc('mira', 'home-mira'), npc('mole', 'square')],
    };
    const world = buildWorld(fixture, 'faircop-network', STANDARD_RULES);
    world.enemy.map = buildTownMap(fixture);
    world.enemy.observers = [{ id: 'gale', vigilance: 1 }];
    world.network.spymaster = 'boss';
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push({
      id: 'mole', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [], turned: true,
    });
    world.npcs.mole!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });

    const brief: DirectiveBrief = {
      mission: { kind: 'shape', operation: 'spread', redirectTo: null,
        audience: { kind: 'person', id: 'mira' },
        payload: { family: 'f-decoy', parent: null, claim: { subject: 'mira', predicate: 'stole',
          object: null, count: 2, severity: 4, place: null, attribution: SOMEONE } } },
      priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 0, until: at(0, 23, 59) },
      report: 'outcome', reportBy: null, purpose: null,
    };
    const log: Action[] = [{ tick: 0, kind: 'directive', recipient: 'mole',
      handoff: { outboundVia: [], reportVia: [] }, brief }];
    runLogOn(world, STANDARD_RULES, log, at(1, 0));

    // Non-vacuous in the exact new way: at least one ref names a MESSAGE, not a claim.
    const networkRefs = world.enemy.sketch.flatMap((f) => f.evidence)
      .filter((ref) => ref.messageId !== null);
    expect(networkRefs.length).toBeGreaterThan(0);
    expect(world.enemy.sketch.some((f) => f.subject === 'mira')).toBe(true);
    auditSketch(world);
  });
});

function residueAuditWorld(remote: boolean): WorldState {
  const world = scryWorld();
  applyAction(world, { tick: 0, kind: 'scry', venue: 'hall', day: 1, from: 0, to: 60 }, STANDARD_RULES);
  if (!remote) world.npcs.boss!.schedule = [{ days: 'all', from: 0, to: 1440, venue: 'hall' }];
  world.tick = 1440;
  if (remote) runUntil(world, 1486, STANDARD_RULES);
  else step(world, STANDARD_RULES);
  const decision = enemyDigest(world.enemy, 1, STANDARD_RULES);
  world.enemy.sketch.push(...decision.features);
  expect(world.enemy.sketch.some((feature) => feature.kind === 'arcane-residue')).toBe(true);
  return world;
}

describe('physical residue fair-cop chain', () => {
  it.each([false, true])('accepts a real direct or physically reported sighting (remote=%s)', (remote) => {
    const world = residueAuditWorld(remote);
    const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue')!;
    expect(entry.receipt !== undefined).toBe(remote);
    auditSketch(world);
  });

  it.each([
    'no-evidence', 'no-creation', 'no-sighting', 'wrong-witness', 'no-receipt',
    'wrong-message', 'no-envelope', 'not-heard', 'omitted-atom', 'wrong-spoken-witness',
    'wrong-spoken-venue', 'wrong-spoken-time', 'wrong-ref-channel', 'missing-ref-discriminant',
  ] as const)('rejects a broken remote chain: %s', (fault) => {
    const world = cloneSerializable(residueAuditWorld(true));
    const entry = world.enemy.evidence.find((row) => row.kind === 'arcane-residue');
    if (entry?.kind !== 'arcane-residue' || entry.receipt === undefined) throw new Error('test needs received residue');
    const feature = world.enemy.sketch.find((row) => row.kind === 'arcane-residue')!;
    const ref = feature.evidence[0]!;
    const receipt = { ...entry.receipt };
    const speech = world.chronicle.find((row) => row.kind === 'network-speech'
      && row.tick === receipt.tick && row.messageId === receipt.messageId);
    if (speech?.kind !== 'network-speech' || speech.spoken.kind !== 'field-report') throw new Error('test needs actual report');
    const atom = speech.spoken.items.find((item) => item.observation.kind === 'arcane-residue')?.observation;
    if (atom?.kind !== 'arcane-residue') throw new Error('test needs spoken residue');
    if (fault === 'no-evidence') world.enemy.evidence = world.enemy.evidence.filter((row) => row !== entry);
    if (fault === 'no-creation' || fault === 'no-sighting') world.chronicle = world.chronicle.filter((row) =>
      !(row.kind === 'residue' && row.residueId === entry.residue.id
        && row.act === (fault === 'no-creation' ? 'created' : 'observed')));
    if (fault === 'wrong-witness') {
      entry.observer = 'citizen'; entry.residue.witness = 'citizen';
      ref.observer = 'citizen'; ref.residue!.witness = 'citizen';
    }
    if (fault === 'no-receipt') delete entry.receipt;
    if (fault === 'wrong-message') entry.receipt!.messageId = 'missing-message';
    if (fault === 'no-envelope') world.chronicle = world.chronicle.filter((row) => row !== speech);
    if (fault === 'not-heard') speech.heardBy = speech.heardBy.filter((row) => row.id !== receipt.observer);
    if (fault === 'omitted-atom') speech.spoken.items = speech.spoken.items.filter((item) => item.observation !== atom);
    if (fault === 'wrong-spoken-witness') atom.witness = 'citizen';
    if (fault === 'wrong-spoken-venue') atom.venue = 'away';
    if (fault === 'wrong-spoken-time') atom.observedAt += 1;
    if (fault === 'wrong-ref-channel') ref.claimId = 'invented-claim';
    if (fault === 'missing-ref-discriminant') delete ref.residue;
    expect(() => auditSketch(world)).toThrow();
  });

it('the night-visit marker precondition runs before the residue value branch', () => {
  const world = residueAuditWorld(true);
  const feature = world.enemy.sketch.find((row) => row.kind === 'arcane-residue')!;
  expect(feature.evidence[0]!.residue).toBeDefined();
  feature.kind = 'night-visit';
  expect(() => auditSketch(world)).toThrow();
});
});

/** The same witness heard an ordinary asking at the exact tick and venue of the physical sighting. */
function stageAskingTwin(world: WorldState, ref: SketchEvidenceRef): void {
  world.enemy.evidence.push({
    tick: ref.tick, venue: 'hall', observer: ref.observer, overheard: false,
    speaker: 'citizen', addressedTo: ref.observer, kind: 'asking', mode: null,
    claimId: null, family: 'f-twin', reported: null, about: { family: 'f-twin' },
  });
  world.chronicle.push({
    kind: 'asking', tick: ref.tick, venue: 'hall', speaker: 'citizen', addressedTo: ref.observer,
    about: { family: 'f-twin' }, authority: false,
    heardBy: [{ id: ref.observer, addressed: true }],
  });
}

/** A lawful legacy asking ref: both speech ids null and no physical discriminant. */
const legacyAskingFeature = (ref: SketchEvidenceRef): SketchFeature => ({
  id: 'legacy-asking-twin', kind: 'entry-point', day: 1, family: 'f-twin', subject: null, district: 'd0',
  detail: 'staged legacy asking ref beside a physical sighting',
  evidence: [{ tick: ref.tick, observer: ref.observer, claimId: null, messageId: null }],
});

describe('a physical ref cannot borrow an ordinary asking heard at the same tick', () => {
  function twinWorld(): { world: WorldState; feature: SketchFeature; ref: SketchEvidenceRef } {
    const world = cloneSerializable(residueAuditWorld(true));
    const feature = world.enemy.sketch.find((row) => row.kind === 'arcane-residue')!;
    const ref = feature.evidence[0]!;
    expect(ref).toMatchObject({ tick: 1440, observer: 'guard', claimId: null, messageId: null });
    expect(ref.residue).toBeDefined();
    stageAskingTwin(world, ref);
    world.enemy.sketch.push(legacyAskingFeature(ref));
    return { world, feature, ref };
  }

  it('positive legacy path: an intact residue ref and a lawful asking ref coexist on one tick/observer', () => {
    const { world, ref } = twinWorld();
    // Non-vacuous: two evidence rows now share the ref's tick, observer and null speech ids.
    expect(world.enemy.evidence.filter((row) => row.tick === ref.tick && row.observer === ref.observer
      && row.claimId === null && (row.network?.messageId ?? null) === null).map((row) => row.kind))
      .toEqual(['arcane-residue', 'asking']);
    auditSketch(world);
  });

  it('corrupted copy: a stripped residue discriminant is rejected although the asking twin would resolve', () => {
    const { world, feature, ref } = twinWorld();
    auditSketch(world); // the identical world passes before corruption
    delete ref.residue;
    expect(feature.evidence[0]).toEqual({ tick: 1440, observer: 'guard', claimId: null, messageId: null });
    expect(world.chronicle.some((row) => row.kind === 'asking' && row.tick === ref.tick
      && row.heardBy.some((hearer) => hearer.id === ref.observer))).toBe(true);
    expect(() => auditSketch(world)).toThrow();
  });
});
