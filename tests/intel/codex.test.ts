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

describe('corroborations pair by when things happened, not by where a report landed in the log (R47, Astra I11)', () => {
  // The same two observations, but the receive reached the board late (an informant's report), so
  // it sits AFTER the tell the player witnessed directly. The receive (tick 15) cannot have caused
  // the tell (tick 0): no pair, so no minimizer corroboration against a literalist.
  const receive = utt({ tick: 15, family: 'r1', speaker: 'mira', addressedTo: 'gale', via: 'self', reported: rc({ count: 4, severity: 4 }) });
  const tell = utt({ tick: 0, family: 'r1', speaker: 'gale', addressedTo: 'mira', via: 'otto', reported: rc({ count: 2, severity: 3 }) });

  it('a receive observed AFTER the tell is never its cause, whatever the log order', () => {
    expect(corroborations([receive, tell], 'gale', 'minimizer', R)).toEqual([]);
    expect(corroborations([tell, receive], 'gale', 'minimizer', R)).toEqual([]);
    expect(suggestTraits([receive, tell], 'r1', R)).not.toContain('minimizer');
  });

  it('a late-arriving receive that DID precede the tell still pairs, keeping the original entry indexes', () => {
    const early = { ...receive, tick: 0 };
    const later = { ...tell, tick: 15 };
    const hits = corroborations([later, early], 'gale', 'minimizer', R);   // the receive landed late on the board
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ family: 'r1', receivedIndex: 1, toldIndex: 0 });
  });

  it('the LATEST preceding receive by tick is the one paired, not the latest in the log', () => {
    const first = utt({ tick: 0, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ count: 8, severity: 5 }) });
    const second = utt({ tick: 10, family: 'r1', speaker: 'otto', addressedTo: 'gale', reported: rc({ count: 4, severity: 4 }) });
    const told = utt({ tick: 20, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 2, severity: 3 }) });
    const hits = corroborations([second, told, first], 'gale', 'minimizer', R);   // `first` reported late
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ receivedIndex: 0, toldIndex: 1 });
    expect(hits[0]!.changes).toEqual([{ field: 'count', from: 4, to: 2 }, { field: 'severity', from: 4, to: 3 }]);
  });

  // R47-1 (R47 review I1): every utterance in a beat is chosen from beliefs held BEFORE the beat
  // (speech is collected and logged, and only then do hearers ingest), so a receive at the tell's
  // own tick cannot have caused it, whichever row the log holds first.
  it('same tick: a receive in the same beat is never the cause, whatever the log order', () => {
    const sameBeat = [{ ...receive, tick: 30 }, { ...tell, tick: 30 }];
    expect(corroborations(sameBeat, 'gale', 'minimizer', R)).toEqual([]);
    expect(corroborations([sameBeat[1]!, sameBeat[0]!], 'gale', 'minimizer', R)).toEqual([]);
    expect(suggestTraits(sameBeat, 'r1', R)).not.toContain('minimizer');
  });

  // R47-1 (R47 review M4): two receives at the same earlier tick tie on time; the row logged FIRST
  // is the pair, the copy the player saw first (the avatar's own hearing precedes an informant's
  // later copy of the same physical receive, whose content that informant may have filtered).
  it('ties between same-tick receives go to the row logged first', () => {
    const direct = utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', via: 'self', reported: rc({ count: 2, severity: 3 }) });
    const copy = utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', via: 'otto', reported: rc({ count: 4, severity: 4 }) });
    const told = utt({ tick: 20, family: 'r1', speaker: 'gale', addressedTo: 'mira', via: 'self', reported: rc({ count: 2, severity: 3 }) });
    expect(corroborations([direct, told, copy], 'gale', 'minimizer', R)).toEqual([]);   // faithful against the direct row
    const hits = corroborations([copy, told, direct], 'gale', 'minimizer', R);        // the filtered copy was logged first
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ receivedIndex: 0, toldIndex: 1 });
  });
});

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

describe('suggestTraits — a family filter changes the work, never the answer (R47-2, R47-1 re-check A)', () => {
  // Two families interleaved on the same pair of mouths. Family r1 holds an exaggeration (a count 2 /
  // sev 3 receive retold as count 4 / sev 4); family r2 holds a faithful retelling. The answer for r1
  // on the mixed log must be the answer on r1's rows alone, and r2's must stay clean: no row of the
  // other family may be indexed as a cause, however the index is built.
  const r1receive = utt({ tick: 10, family: 'r1', speaker: 'mira', addressedTo: 'gale', reported: rc({ count: 2, severity: 3 }) });
  const r2receive = utt({ tick: 12, family: 'r2', speaker: 'mira', addressedTo: 'gale', reported: rc({ predicate: 'poisoned', count: 1, severity: 5 }) });
  const r1tell = utt({ tick: 20, family: 'r1', speaker: 'gale', addressedTo: 'mira', reported: rc({ count: 4, severity: 4 }) });
  const r2tell = utt({ tick: 22, family: 'r2', speaker: 'gale', addressedTo: 'mira', reported: rc({ predicate: 'poisoned', count: 1, severity: 5 }) });
  const mixed = [r1receive, r2receive, r1tell, r2tell];
  it('each family answers as it would alone', () => {
    const alone = (family: string) => suggestTraits(mixed.filter((row) => row.family === family), family, R);
    expect(alone('r1')).toEqual(['exaggerator', 'partisan']);          // non-vacuous: r1 has a hit
    expect(suggestTraits(mixed, 'r1', R)).toEqual(alone('r1'));
    expect(suggestTraits(mixed, 'r2', R)).toEqual(alone('r2'));
    expect(suggestTraits(mixed, 'r2', R)).toEqual([]);
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
  // A staged real-room field day: the avatar watches four one-beat Mira/Gale contacts. At 480 Mira
  // gives Gale the moralized count-2 version; at 720/960/1200 Gale emits the count-4 version after
  // the exact 240-tick cooldown. Outside those contacts they are separated, so the vehicle creates
  // exactly the three observable receive→emit pairs required by the lock law.
  function build() {
    const world = watchfordWorld('codex-int');
    enrollPlayer(world, { home: 'home-gs' });
    world.playerVenue = 'square-w0';
    const fieldWindows = [480, 720, 960, 1200].map((from) => ({
      fromDay: 0, toDay: 1, from, to: from + 15,
      venue: 'square-w0', source: 'vignette' as const,
    }));
    world.scheduleOverrides.gale = [
      ...fieldWindows,
      { fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'home-gs', source: 'vignette' },
    ];
    world.scheduleOverrides.mira = [
      ...fieldWindows.map((window) => ({ ...window })),
      { fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'home-mo', source: 'vignette' },
    ];
    // Otto would otherwise be Mira's higher-relevance addressee; Sten would make five occupants
    // and split the witnessed room. Keep both real NPCs at the other square for this field probe.
    world.scheduleOverrides.otto = [{
      fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'square-w1', source: 'vignette',
    }];
    world.scheduleOverrides.sten = [{
      fromDay: 0, toDay: null, from: 0, to: 1440, venue: 'square-w1', source: 'vignette',
    }];
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
