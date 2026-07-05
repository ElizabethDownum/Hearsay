import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { stableStringify } from '../../src/sim/hash';
import { watchfordWorld } from '../sim/helpers/watchford-world';
import { enrollPlayer } from '../../src/sim/world';
import { runLogOn, type ActionLog } from '../../src/sim/campaign';
import { STANDARD_RULES } from '../../src/content/rules';
import { at } from '../../src/core/time';
import type { IntelEntry } from '../../src/intel/entry';
import type { ReportedClaim } from '../../src/sim/enemy/state';
import {
  diffReported, clustersOf, versionDiffs, routeOf, boardView,
} from '../../src/intel/board';

// A ReportedClaim with the shared 7 content fields; override any for a variant.
function rc(over: Partial<ReportedClaim> = {}): ReportedClaim {
  return {
    subject: 'otto', predicate: 'stole', object: null,
    count: 2, severity: 3, place: null, attribution: SOMEONE, ...over,
  };
}

// Hand-built log rows over the Task-2 blank pattern: fill the 5 required, override the rest.
function entry(over: Partial<IntelEntry> = {}): IntelEntry {
  return {
    ...blankIntel(),
    tick: 0, venue: 'square-w0', via: 'self', kind: 'utterance', overheard: true,
    ...over,
  };
}

// A claimful utterance row — the only kind clustering/routing consider.
function utt(over: Partial<IntelEntry> & { family: string; reported: ReportedClaim }): IntelEntry {
  return entry({
    kind: 'utterance', speaker: 'mira', addressedTo: 'otto', claimId: 'c0', ...over,
  });
}

describe('diffReported — structural diff over the 7 content fields', () => {
  it('lists exactly the changed fields, empty when identical', () => {
    expect(diffReported(rc(), rc())).toEqual([]);
    const changes = diffReported(rc({ count: 2, severity: 3 }), rc({ count: 4, severity: 4 }));
    expect(changes).toEqual([
      { field: 'count', from: 2, to: 4 },
      { field: 'severity', from: 3, to: 4 },
    ]);
  });
});

describe('clustersOf — versions of the same rumor family, first-seen order', () => {
  // Two families; r1 has three entries collapsing to two versions then a third.
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ count: 2, severity: 3 }) }),        // idx0 v0
    utt({ tick: 11, family: 'r2', reported: rc({ subject: 'quill' }) }),             // idx1 (other family)
    utt({ tick: 12, family: 'r1', reported: rc({ count: 2, severity: 3 }) }),        // idx2 → collapses into v0
    utt({ tick: 13, family: 'r1', reported: rc({ count: 4, severity: 3 }) }),        // idx3 v1
    utt({ tick: 14, family: 'r1', reported: rc({ count: 4, severity: 4 }) }),        // idx4 v2
  ];

  it('groups by family sorted by family id', () => {
    const clusters = clustersOf(log);
    expect(clusters.map((c) => c.family)).toEqual(['r1', 'r2']);
  });

  it('identical reported objects collapse into one version with two entryIndexes', () => {
    const r1 = clustersOf(log)[0]!;
    expect(r1.versions).toHaveLength(3);
    expect(r1.versions[0]!.entryIndexes).toEqual([0, 2]);
    expect(r1.versions[0]!.firstSeenTick).toBe(10);
    expect(r1.versions[1]!.entryIndexes).toEqual([3]);
    expect(r1.versions[2]!.entryIndexes).toEqual([4]);
    expect(r1.entryIndexes).toEqual([0, 2, 3, 4]);
  });

  it('a distinct reported becomes a new version in first-seen order', () => {
    const r1 = clustersOf(log)[0]!;
    expect(r1.versions[1]!.reported.count).toBe(4);
    expect(r1.versions[2]!.reported.severity).toBe(4);
  });

  it('ignores non-utterance and claimless rows', () => {
    const noise: IntelEntry[] = [
      entry({ tick: 1, kind: 'presence', actor: 'hugo' }),
      entry({ tick: 2, kind: 'asking', family: 'r1', about: { family: 'r1' } }),
    ];
    expect(clustersOf(noise)).toEqual([]);
  });
});

describe('versionDiffs — consecutive-version field diffs, empty never emitted', () => {
  it('lists exactly the changed fields between consecutive versions', () => {
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', reported: rc({ count: 2, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', reported: rc({ count: 4, severity: 3 }) }),
      utt({ tick: 12, family: 'r1', reported: rc({ count: 4, severity: 4 }) }),
    ];
    const diffs = versionDiffs(clustersOf(log)[0]!);
    expect(diffs).toEqual([
      { fromVersion: 0, toVersion: 1, changes: [{ field: 'count', from: 2, to: 4 }] },
      { fromVersion: 1, toVersion: 2, changes: [{ field: 'severity', from: 3, to: 4 }] },
    ]);
  });

  it('a single-version cluster yields no diffs', () => {
    const log: IntelEntry[] = [utt({ tick: 10, family: 'r1', reported: rc() })];
    expect(versionDiffs(clustersOf(log)[0]!)).toEqual([]);
  });
});

describe('routeOf — the family time-ordered observed hops, via preserved', () => {
  const log: IntelEntry[] = [
    utt({ tick: 30, family: 'r1', reported: rc(), via: 'gale', speaker: 'mira', addressedTo: 'otto', venue: 'v3' }),
    utt({ tick: 10, family: 'r1', reported: rc({ count: 3 }), via: 'self', speaker: 'quill', addressedTo: 'rosa', venue: 'v1' }),
    utt({ tick: 20, family: 'r2', reported: rc(), via: 'self', speaker: 'a', addressedTo: 'b' }),
    entry({ tick: 5, kind: 'presence', actor: 'hugo' }),
    utt({ tick: 15, family: 'r1', reported: rc({ count: 5 }), via: 'dossier', speaker: 'x', addressedTo: 'y', venue: 'v2' }),
  ];

  it('returns only the family hops, time-ordered, with via preserved', () => {
    const route = routeOf(log, 'r1');
    expect(route.map((h) => h.tick)).toEqual([10, 15, 30]);
    expect(route.map((h) => h.via)).toEqual(['self', 'dossier', 'gale']);
    expect(route[0]).toMatchObject({ venue: 'v1', speaker: 'quill', addressedTo: 'rosa' });
  });
});

describe('boardView — assist gating over the whole feed', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ count: 2 }) }),
    utt({ tick: 11, family: 'r1', reported: rc({ count: 4 }) }),
  ];

  it('level 0 reveals nothing but the raw feed', () => {
    const v = boardView(log, 0);
    expect(v.level).toBe(0);
    expect(v.entries).toHaveLength(2);
    expect(v.clusters).toBeNull();
    expect(v.diffs).toBeNull();
    expect(v.suggestions).toBeNull();
    expect(v.routes).toBeNull();
  });

  it('level 1 reveals clusters and diffs but not suggestions or routes', () => {
    const v = boardView(log, 1);
    expect(v.clusters).not.toBeNull();
    expect(v.clusters!.map((c) => c.family)).toEqual(['r1']);
    expect(v.diffs).not.toBeNull();
    expect(v.diffs!['r1']).toEqual([
      { fromVersion: 0, toVersion: 1, changes: [{ field: 'count', from: 2, to: 4 }] },
    ]);
    expect(v.suggestions).toBeNull();
    expect(v.routes).toBeNull();
  });

  it('level 2 still leaves suggestions null this task (Task 5 wires it) and routes null', () => {
    const v = boardView(log, 2);
    expect(v.clusters).not.toBeNull();
    expect(v.suggestions).toBeNull();
    expect(v.routes).toBeNull();
  });

  it('level 3 adds routes, keyed by family', () => {
    const v = boardView(log, 3);
    expect(v.routes).not.toBeNull();
    expect(v.routes!['r1']!.map((h) => h.tick)).toEqual([10, 11]);
    expect(v.suggestions).toBeNull();
  });
});

describe('boardView — determinism and purity', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ count: 2 }) }),
    utt({ tick: 11, family: 'r1', reported: rc({ count: 4 }) }),
    utt({ tick: 12, family: 'r2', reported: rc({ subject: 'quill' }) }),
  ];

  it('same log twice yields byte-identical views at every level', () => {
    for (const level of [0, 1, 2, 3] as const) {
      expect(stableStringify(boardView(log, level))).toBe(stableStringify(boardView(log, level)));
    }
  });

  it('never mutates the input log', () => {
    const before = stableStringify(log);
    clustersOf(log);
    routeOf(log, 'r1');
    boardView(log, 3);
    expect(stableStringify(log)).toBe(before);
  });
});

describe('boardView — integration over a real Watchford field day', () => {
  // A full day of Watchford physics feeds the board: the avatar (self) and gale (an
  // exaggerator informant) sample the same rumors, so a family is heard at more than one
  // version. Intent: a cluster exists, and a non-empty diff surfaces the moment two distinct
  // versions are sampled. The self-vs-gale count split makes that deterministic for this seed
  // (probed across four seeds — no horizon/inject escalation was needed).
  function build() {
    const world = watchfordWorld('board-int');
    enrollPlayer(world, { home: 'home-gs' });
    world.playerVenue = 'square-w0';
    world.intel.informants.push({ id: 'gale', assignedVenue: null });
    return world;
  }
  const log: ActionLog = [{
    tick: 0, kind: 'inject', target: 'mira',
    spec: { subject: 'otto', predicate: 'stole', object: null, count: 2, severity: 4, place: null, attribution: SOMEONE },
  }];

  it('surfaces at least one cluster, and a non-empty diff once two distinct versions are sampled', () => {
    const world = runLogOn(build(), STANDARD_RULES, log, at(1, 0));
    const view = boardView(world.intel.log, 1);

    // A cluster exists — the day captured claimful utterances of a rumor family.
    expect(view.clusters).not.toBeNull();
    expect(view.clusters!.length).toBeGreaterThan(0);

    // Two distinct versions were sampled (self heard it raw; gale reported it exaggerated).
    const multiVersion = view.clusters!.filter((c) => c.versions.length >= 2);
    expect(multiVersion.length).toBeGreaterThan(0);

    // The board surfaces the changed span: every multi-version cluster yields a non-empty diff.
    for (const c of multiVersion) {
      const familyDiffs = view.diffs![c.family]!;
      expect(familyDiffs.length).toBeGreaterThan(0);
      for (const d of familyDiffs) expect(d.changes.length).toBeGreaterThan(0);
    }
  });

  it('gates the real feed by assist level: 0 hides all, 3 adds routes with observed hops', () => {
    const world = runLogOn(build(), STANDARD_RULES, log, at(1, 0));

    const l0 = boardView(world.intel.log, 0);
    expect(l0.clusters).toBeNull();
    expect(l0.routes).toBeNull();
    expect(l0.entries.length).toBe(world.intel.log.length);

    const l3 = boardView(world.intel.log, 3);
    expect(l3.routes).not.toBeNull();
    const family = l3.clusters![0]!.family;
    const route = l3.routes![family]!;
    expect(route.length).toBeGreaterThan(0);
    // Hops are tick-ordered.
    for (let i = 1; i < route.length; i++) expect(route[i]!.tick).toBeGreaterThanOrEqual(route[i - 1]!.tick);
  });
});
