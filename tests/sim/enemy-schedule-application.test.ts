import { describe, expect, it } from 'vitest';
import { buildWorld, buildTownMap } from '../../src/sim/world';
import { applyEnemyDecision } from '../../src/sim/counterintel';
import { enemyDigest } from '../../src/sim/enemy/digest';
import { circlesAt, positionOf } from '../../src/sim/agents';
import { STANDARD_RULES } from '../../src/content/rules';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { at } from '../../src/core/time';
import { emptyEnemyState, type EnemyState, type EvidenceEntry } from '../../src/sim/enemy/state';
import type { Npc, TownFixture, WorldState } from '../../src/sim/types';

/**
 * Task 10 FIX WAVE — review findings I-1 and I-2. Both defects live one layer BELOW the
 * decision object: `enemyDigest`'s output looked fine (right counts, right-looking fields),
 * but applying it via `applyEnemyDecision` and reading the resulting SCHEDULE through the real
 * `circlesAt`/`positionOf` exposed silent merges (I-1) and silent phantoms (I-2). These tests
 * exercise exactly that layer — never asserting on the decision object alone.
 *
 * A real minimal TownFixture (not the hand-rolled EnemyState.map alone) so overridden guards
 * and targets are REAL npcs `circlesAt`/`positionOf` can place — mirrors the reviewer's own
 * repro methodology (buildWorld + a small real fixture, not a stub).
 */
const RULES = STANDARD_RULES;

function npc(id: string, home: string, occupation = 'guard'): Npc {
  return { id, name: id, home, occupation, faction: 'none', traits: [], rivals: [], schedule: [], edges: [] };
}

const FIXTURE: TownFixture = {
  venues: [
    { id: 'home-w0', district: 'w0', access: 'private' },
    { id: 'home-w1', district: 'w1', access: 'private' },
    { id: 'square-w0', district: 'w0', access: 'public' },
    { id: 'square-w1', district: 'w1', access: 'public' },
    { id: 'guard-post-w0', district: 'w0', access: 'invitational' },
    { id: 'guard-post-w1', district: 'w1', access: 'invitational' },
  ],
  npcs: [
    // guards — enough of them (6) to also stand up the generous-roster control (e).
    npc('gale', 'home-w0'), npc('gorm', 'home-w0'), npc('ida', 'home-w0'),
    npc('hugo', 'home-w1'), npc('jago', 'home-w1'), npc('lark', 'home-w1'),
    // interrogation targets — real npcs so their CIRCLE presence (or absence) is checkable.
    npc('mira', 'home-w0', 'grocer'), npc('sten', 'home-w0', 'carter'), npc('rosa', 'home-w1', 'weaver'),
  ],
};

function worldWith(observers: EnemyState['observers'], evidence: EvidenceEntry[]): WorldState {
  const world = buildWorld(FIXTURE, `schedule-${observers.map((o) => o.id).join('-')}`);
  world.enemy = { ...emptyEnemyState(), observers, map: buildTownMap(FIXTURE), evidence };
  return world;
}

// ── I-1 fixture: two independent interrogation candidates, family f0 -> sten, family f1 -> mira. ──
function answerNaming(family: string, target: string, speaker: string): EvidenceEntry {
  return {
    tick: 500, venue: 'square-w0', observer: 'gale', overheard: false,
    speaker, addressedTo: 'gale', kind: 'utterance', mode: 'answer',
    claimId: `c-${family}`, family,
    reported: { subject: speaker, predicate: 'stole', object: null, count: 2, severity: 4,
      place: null, attribution: target },
    about: null,
  };
}
const INTERROGATION_EVIDENCE: EvidenceEntry[] = [
  answerNaming('f0', 'sten', 'otto'),
  answerNaming('f1', 'mira', 'quill'),
];

describe('I-1 fix — two interrogations never merge into one circle (schedule-application layer)', () => {
  it('(a) the scarce-guard repro (1 observer, 2 candidates): exactly ONE interrogation ships, degraded — its circle is guard + one target, never a 3-way merge', () => {
    const observers = [{ id: 'gale', vigilance: 0.9 }];
    const state: EnemyState = { ...emptyEnemyState(), observers, map: buildTownMap(FIXTURE), evidence: INTERROGATION_EVIDENCE };
    const d = enemyDigest(state, 1, RULES, 2); // pressure 2 -> interrogation cap 2, only 1 guard exists
    expect(d.interrogations).toHaveLength(1); // cap UNMET — honest degradation, never a merge

    const world = worldWith(observers, INTERROGATION_EVIDENCE);
    applyEnemyDecision(world, d);
    const t = at(2, 0, 950); // day 2 (order.day = day+1), inside INTERROGATION [900,1020)
    const circles = circlesAt(world, t);
    const guardPost = circles.filter((c) => c.venue === 'guard-post-w0');
    expect(guardPost).toHaveLength(1);
    expect(guardPost[0]!.members.slice().sort()).toEqual(['gale', 'mira'].sort());
  });

  it('(b) two DISTINCT guards sharing a district, 2 candidates: no merged circle — degradation to one order', () => {
    const observers = [{ id: 'gale', vigilance: 0.9 }, { id: 'gorm', vigilance: 0.9 }]; // both district w0
    const state: EnemyState = { ...emptyEnemyState(), observers, map: buildTownMap(FIXTURE), evidence: INTERROGATION_EVIDENCE };
    const d = enemyDigest(state, 1, RULES, 2);
    expect(d.interrogations).toHaveLength(1); // the SAME-district venue collision degrades it too

    const world = worldWith(observers, INTERROGATION_EVIDENCE);
    applyEnemyDecision(world, d);
    const t = at(2, 0, 950);
    const circles = circlesAt(world, t);
    const guardPost = circles.filter((c) => c.venue === 'guard-post-w0');
    expect(guardPost).toHaveLength(1);
    expect(guardPost[0]!.members).toHaveLength(2); // never the 4-way {gale,gorm,mira,sten} merge
    // the guard NOT chosen for the emitted order never appears in a circle with a target.
    const chosenTarget = d.interrogations[0]!.target;
    const otherTarget = chosenTarget === 'mira' ? 'sten' : 'mira';
    expect(positionOf(world, world.npcs[otherTarget]!, t)).not.toBe('guard-post-w0');
  });

  it('(c) two guards in DIFFERENT districts: both interrogations fire, two separate circles, both targets interrogated (non-vacuity control)', () => {
    const observers = [{ id: 'gale', vigilance: 0.9 }, { id: 'hugo', vigilance: 0.3 }]; // w0 / w1
    const state: EnemyState = { ...emptyEnemyState(), observers, map: buildTownMap(FIXTURE), evidence: INTERROGATION_EVIDENCE };
    const d = enemyDigest(state, 1, RULES, 2);
    expect(d.interrogations).toHaveLength(2); // the cap actually delivers 2 when geometry allows

    const world = worldWith(observers, INTERROGATION_EVIDENCE);
    applyEnemyDecision(world, d);
    const t = at(2, 0, 950);
    const circles = circlesAt(world, t);
    const postW0 = circles.find((c) => c.venue === 'guard-post-w0');
    const postW1 = circles.find((c) => c.venue === 'guard-post-w1');
    expect(postW0?.members.slice().sort()).toEqual(['gale', 'mira'].sort());
    expect(postW1?.members.slice().sort()).toEqual(['hugo', 'sten'].sort());
  });
});

// ── I-2 fixture: two watchable districts (w0, w1) plus one origin-vague feature (required for
// ANY watch to fire at all) — mirrors combinedEvidence's own construction, adapted to real npcs. ──
function watchEv(over: Partial<Extract<EvidenceEntry, { kind: 'utterance' }>>): EvidenceEntry {
  return {
    tick: 480, venue: 'square-w0', observer: 'gale', overheard: true,
    speaker: 'ann', addressedTo: 'bea', kind: 'utterance', mode: 'telling',
    claimId: 'wc0', family: 'fw0',
    reported: { subject: 'ann', predicate: 'stole', object: null, count: 2, severity: 4,
      place: null, attribution: SOMEONE },
    about: null, ...over,
  };
}
const WATCH_EVIDENCE: EvidenceEntry[] = [
  watchEv({ tick: 480, claimId: 'wc0', family: 'fw0', speaker: 'ann', addressedTo: 'bea' }),
  watchEv({ tick: 540, claimId: 'wc1', family: 'fw0', speaker: 'bea', addressedTo: 'ann' }),
  watchEv({ tick: 560, claimId: 'wc2', family: 'fw0', speaker: 'cate', addressedTo: 'gale',
    mode: 'answer', overheard: false }),
  watchEv({ tick: 580, claimId: 'wc3', family: 'fw1', venue: 'square-w1', observer: 'hugo',
    speaker: 'dot', addressedTo: 'ed' }),
  watchEv({ tick: 600, claimId: 'wc4', family: 'fw1', venue: 'square-w1', observer: 'hugo',
    speaker: 'ed', addressedTo: 'dot' }),
];

describe('I-2 fix — a watch order is never a phantom (schedule-application layer)', () => {
  it('(d) the reviewer\'s 2-guard/2-district full-reuse repro: every EMITTED watch order is honestly staffed at its venue — no phantom order', () => {
    const observers = [{ id: 'gale', vigilance: 0.9 }, { id: 'hugo', vigilance: 0.3 }]; // exactly 2 total guards
    const state: EnemyState = { ...emptyEnemyState(), observers, map: buildTownMap(FIXTURE), evidence: WATCH_EVIDENCE };
    const d = enemyDigest(state, 1, RULES, 1); // pressure 1 -> watch cap 2, forcing full reuse
    expect(d.watches.length).toBeGreaterThan(0); // non-vacuous: at least one order still fires

    const world = worldWith(observers, WATCH_EVIDENCE);
    applyEnemyDecision(world, d);
    const t = at(2, 0, 1000); // day 2 (startDay = day+1), inside WATCH [960,1140)
    // the honest-degradation invariant: EVERY watch order this digest emitted really has its
    // posted guards standing at that order's own venue — never a sibling order's silent override.
    for (const w of d.watches) {
      for (const post of w.posts) {
        expect(positionOf(world, world.npcs[post.guard]!, t)).toBe(post.venue);
      }
    }
    // with only 2 total guards fully claimed by the first watch, the second watchable
    // district gets NO order at all — dropped, not a phantom nobody staffs.
    expect(d.watches.some((w) => w.district === 'w1')).toBe(false);
  });

  it('(e) generous-roster control (6 guards): two watches, DISJOINT guards, both staffed — degradation only engages under real scarcity', () => {
    const observers = [
      { id: 'gale', vigilance: 0.9 }, { id: 'gorm', vigilance: 0.9 }, { id: 'ida', vigilance: 0.9 },
      { id: 'hugo', vigilance: 0.3 }, { id: 'jago', vigilance: 0.3 }, { id: 'lark', vigilance: 0.3 },
    ];
    const state: EnemyState = { ...emptyEnemyState(), observers, map: buildTownMap(FIXTURE), evidence: WATCH_EVIDENCE };
    const d = enemyDigest(state, 1, RULES, 1);
    expect(d.watches).toHaveLength(2);
    expect(d.watches.map((w) => w.district).sort()).toEqual(['w0', 'w1']);
    const guardsUsed = d.watches.map((w) => new Set(w.posts.map((p) => p.guard)));
    expect([...guardsUsed[0]!].some((g) => guardsUsed[1]!.has(g))).toBe(false); // disjoint

    const world = worldWith(observers, WATCH_EVIDENCE);
    applyEnemyDecision(world, d);
    const t = at(2, 0, 1000);
    for (const w of d.watches) {
      for (const post of w.posts) {
        expect(positionOf(world, world.npcs[post.guard]!, t)).toBe(post.venue);
      }
    }
  });
});
