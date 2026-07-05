import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import { stableStringify } from '../../src/sim/hash';
import { watchfordWorld } from '../sim/helpers/watchford-world';
import { enrollPlayer } from '../../src/sim/world';
import { runLogOn, type ActionLog } from '../../src/sim/campaign';
import { STANDARD_RULES as R } from '../../src/content/rules';
import { at } from '../../src/core/time';
import type { IntelEntry, CodexHypothesis } from '../../src/intel/entry';
import type { ReportedClaim } from '../../src/sim/enemy/state';
import { corroborations, codexStatus, suggestTraits } from '../../src/intel/codex';

// A ReportedClaim with the shared 7 content fields; override any for a variant.
function rc(over: Partial<ReportedClaim> = {}): ReportedClaim {
  return {
    subject: 'otto', predicate: 'stole', object: null,
    count: 2, severity: 3, place: null, attribution: 'someone', ...over,
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

// A claimful utterance row — the only kind corroboration considers.
function utt(over: Partial<IntelEntry> & { family: string; reported: ReportedClaim }): IntelEntry {
  return entry({ kind: 'utterance', claimId: 'c0', speaker: 'mira', addressedTo: 'gale', ...over });
}

describe('corroborations — observed receive→emit pairs matched by fingerprint', () => {
  it('an addressed receive then a doubled emit corroborates exaggerator (hits === 1)', () => {
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ count: 2, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 4, severity: 4 }) }),
    ];
    const hits = corroborations(log, 'gale', 'exaggerator', R);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ family: 'r1', receivedIndex: 0, toldIndex: 1 });
    expect(hits[0]!.changes).toEqual([
      { field: 'count', from: 2, to: 4 },
      { field: 'severity', from: 3, to: 4 },
    ]);
  });

  it('a receive the npc was NOT addressed by contributes nothing (epistemic honesty)', () => {
    // Overheard row addressed to otto — the player saw gale told only if gale was the addressee.
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'otto', reported: rc({ count: 2, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 4, severity: 4 }) }),
    ];
    expect(corroborations(log, 'gale', 'exaggerator', R)).toHaveLength(0);
  });

  it('pair order matters — an emit before the receive is not a pair', () => {
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 4, severity: 4 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ count: 2, severity: 3 }) }),
    ];
    expect(corroborations(log, 'gale', 'exaggerator', R)).toHaveLength(0);
  });

  it('a byte-identical retell (empty changes) corroborates nothing, for any trait', () => {
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ predicate: 'stole', count: 2, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ predicate: 'stole', count: 2, severity: 3 }) }),
    ];
    expect(corroborations(log, 'gale', 'exaggerator', R)).toHaveLength(0);
    expect(corroborations(log, 'gale', 'partisan', R)).toHaveLength(0);
    expect(suggestTraits(log, 'r1', R)).toEqual([]);
  });

  it('an unknown trait yields no hits (rules are the glossary)', () => {
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ count: 2, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 4, severity: 4 }) }),
    ];
    expect(corroborations(log, 'gale', 'nonesuch', R)).toHaveLength(0);
  });
});

describe('corroborations — fingerprint overlap is the deduction game, not a bug', () => {
  it('a sev-only +1 on a factionRelevant predicate with count null corroborates BOTH exaggerator and partisan', () => {
    // count null so exaggerator fires only on its severity branch; stole is factionRelevant.
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ predicate: 'stole', count: null, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ predicate: 'stole', count: null, severity: 4 }) }),
    ];
    expect(corroborations(log, 'gale', 'exaggerator', R)).toHaveLength(1);
    expect(corroborations(log, 'gale', 'partisan', R)).toHaveLength(1);
    expect(suggestTraits(log, 'r1', R)).toEqual(['exaggerator', 'partisan']);
  });
});

describe('codexStatus — the three-confirm lock', () => {
  // One clean exaggerator pair per family; gale receives (count 2) and emits (count 4).
  const pair = (family: string, base: number): IntelEntry[] => [
    utt({ tick: base, family, speaker: 'mira', addressedTo: 'gale', reported: rc({ count: 2, severity: 3 }) }),
    utt({ tick: base + 1, family, speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 4, severity: 4 }) }),
  ];
  const codex: CodexHypothesis[] = [{ npc: 'gale', trait: 'exaggerator', proposedAt: 0 }];

  it('three distinct corroborating pairs lock the hypothesis', () => {
    const log = [...pair('r1', 10), ...pair('r2', 20), ...pair('r3', 30)];
    expect(codexStatus(log, codex, R)).toEqual([
      { npc: 'gale', trait: 'exaggerator', hits: 3, locked: true },
    ]);
  });

  it('two pairs is not enough — the lock needs three', () => {
    const log = [...pair('r1', 10), ...pair('r2', 20)];
    expect(codexStatus(log, codex, R)[0]).toMatchObject({ hits: 2, locked: false });
  });

  it('reports each hypothesis in codex order', () => {
    const log = [...pair('r1', 10)];
    const many: CodexHypothesis[] = [
      { npc: 'gale', trait: 'exaggerator', proposedAt: 0 },
      { npc: 'mira', trait: 'moralizer', proposedAt: 0 },
    ];
    const status = codexStatus(log, many, R);
    expect(status.map((s) => `${s.npc}:${s.trait}`)).toEqual(['gale:exaggerator', 'mira:moralizer']);
    expect(status[0]).toMatchObject({ hits: 1, locked: false });
    expect(status[1]).toMatchObject({ hits: 0, locked: false });
  });
});

describe('suggestTraits — the family candidates, sorted', () => {
  it('surfaces every trait with at least one matching pair in the family, sorted', () => {
    const log: IntelEntry[] = [
      // moralizer pair (mira): met-secretly-with received un-moralized, emitted in the sin register.
      utt({ tick: 10, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ predicate: 'met-secretly-with', count: null, severity: 3 }) }),
      utt({ tick: 11, family: 'r1', speaker: 'mira', addressedTo: 'otto', reported: rc({ predicate: 'is-having-an-affair-with', count: null, severity: 3 }) }),
      // exaggerator pair (sten): non-factionRelevant predicate so partisan stays out; count doubled.
      utt({ tick: 12, family: 'r1', speaker: 'otto', addressedTo: 'sten', reported: rc({ predicate: 'is-having-an-affair-with', count: 2, severity: 3 }) }),
      utt({ tick: 13, family: 'r1', speaker: 'sten', addressedTo: 'quill', reported: rc({ predicate: 'is-having-an-affair-with', count: 4, severity: 4 }) }),
    ];
    expect(suggestTraits(log, 'r1', R)).toEqual(['exaggerator', 'moralizer']);
  });

  it('a family with no field-changing pairs suggests nothing', () => {
    const log: IntelEntry[] = [
      utt({ tick: 10, family: 'r9', speaker: 'mira', addressedTo: 'gale', reported: rc({ predicate: 'stole', count: 2, severity: 3 }) }),
      utt({ tick: 11, family: 'r9', speaker: 'gale', addressedTo: 'mira', reported: rc({ predicate: 'stole', count: 2, severity: 3 }) }),
    ];
    expect(suggestTraits(log, 'r9', R)).toEqual([]);
  });
});

describe('the flagship — a real Watchford field day locks gale as an exaggerator', () => {
  // Probed the real intel log FIRST (see task report): seed 'codex-int', avatar parked at
  // square-w0 (self-only capture, no informant), a single 'met-secretly-with' inject to mira on
  // day 0. mira moralizes it to 'is-having-an-affair-with' before it reaches gale; gale (a genuine
  // exaggerator) receives (count 2, sev 3) and re-tells the doubled (count 4, sev 4) version three
  // times in the day-3 horizon. Three observed receive→emit pairs → the three-confirm lock, and it
  // is ground-truth-correct: gale's real traits are [exaggerator, literalist].
  function build() {
    const world = watchfordWorld('codex-int');
    enrollPlayer(world, { home: 'home-gs' });
    world.playerVenue = 'square-w0';
    return world;
  }
  const injectLog: ActionLog = [{
    tick: 0, kind: 'inject', target: 'mira',
    spec: { subject: 'otto', predicate: 'met-secretly-with', object: 'sten', count: 2, severity: 3, place: null, attribution: 'someone' },
  }];

  it('propose (gale, exaggerator) and the real log corroborates it three times → locked', () => {
    const world = runLogOn(build(), R, injectLog, at(3, 0));
    const log = world.intel.log;

    const hits = corroborations(log, 'gale', 'exaggerator', R);
    expect(hits.length).toBe(3);
    // Cite the exact pair: gale doubled a count-2 telling to count-4, bumping severity 3→4.
    for (const h of hits) {
      expect(h.changes).toEqual([
        { field: 'count', from: 2, to: 4 },
        { field: 'severity', from: 3, to: 4 },
      ]);
      expect(log[h.receivedIndex]!.addressedTo).toBe('gale');
      expect(log[h.toldIndex]!.speaker).toBe('gale');
    }

    const codex: CodexHypothesis[] = [{ npc: 'gale', trait: 'exaggerator', proposedAt: 0 }];
    expect(codexStatus(log, codex, R)).toEqual([
      { npc: 'gale', trait: 'exaggerator', hits: 3, locked: true },
    ]);
  });

  it('corroborations reads only the log — perturbing the world after capture changes nothing', () => {
    const world = runLogOn(build(), R, injectLog, at(3, 0));
    const log = world.intel.log;
    const before = stableStringify(corroborations(log, 'gale', 'exaggerator', R));

    // Rewrite ground truth wholesale: beliefs, claims, even gale's traits. corroborations must
    // not consult any of it — the deduction stands on observed pairs alone.
    world.beliefs = {};
    world.claims = {};
    world.npcs['gale']!.traits = [];

    const after = stableStringify(corroborations(log, 'gale', 'exaggerator', R));
    expect(after).toBe(before);
  });
});
