import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { stableStringify } from '../../src/sim/hash';
import { at } from '../../src/core/time';
import type { IntelEntry } from '../../src/intel/entry';
import type { ReportedClaim } from '../../src/sim/enemy/state';
import { eveningReport } from '../../src/intel/report';

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

// A claimful utterance row.
function utt(over: Partial<IntelEntry> & { family: string; reported: ReportedClaim }): IntelEntry {
  return entry({
    kind: 'utterance', speaker: 'mira', addressedTo: 'otto', claimId: 'c0', ...over,
  });
}

describe('eveningReport — day-scoped, new-vs-old family split, authority/presence sightings', () => {
  const log: IntelEntry[] = [
    utt({ tick: at(0, 8), family: 'r1', reported: rc(), via: 'self' }),                          // idx0 day0, r1 first heard
    utt({ tick: at(0, 9), family: 'r1', reported: rc({ count: 4 }), via: 'gale' }),               // idx1 day0, r1 again
    entry({
      tick: at(0, 10), kind: 'asking', via: 'self', authority: true, about: { family: 'r1' }, family: 'r1',
    }),                                                                                           // idx2 day0, authority asking
    entry({ tick: at(0, 11), kind: 'presence', via: 'gale', actor: 'hugo' }),                      // idx3 day0, watch-presence
    utt({ tick: at(1, 8), family: 'r2', reported: rc({ subject: 'mira' }), via: 'self' }),         // idx4 day1, r2 first heard
    utt({ tick: at(1, 9), family: 'r1', reported: rc({ count: 9 }), via: 'self' }),                // idx5 day1, r1 re-heard (not new)
  ];

  it('day 0: r1 is new, entries grouped by via, authority + presence sightings captured', () => {
    const report = eveningReport(log, 0);
    expect(report.day).toBe(0);
    expect(report.newFamilies).toEqual(['r1']);
    expect(report.entriesByVia).toEqual({ self: [0, 2], gale: [1, 3] });
    expect(report.authoritySightings).toEqual([2, 3]);
  });

  it('day 1: r2 is new, r1 (first heard day 0) is not; only day-1 entries counted', () => {
    const report = eveningReport(log, 1);
    expect(report.day).toBe(1);
    expect(report.newFamilies).toEqual(['r2']);
    expect(report.entriesByVia).toEqual({ self: [4, 5] });
    expect(report.authoritySightings).toEqual([]);
  });

  it('a day with no captured entries yields empty everything', () => {
    const report = eveningReport(log, 5);
    expect(report).toEqual({
      day: 5, newFamilies: [], entriesByVia: {}, authoritySightings: [],
    });
  });
});

describe('eveningReport — determinism', () => {
  const log: IntelEntry[] = [
    utt({ tick: at(0, 8), family: 'r1', reported: rc(), via: 'gale' }),
    utt({ tick: at(0, 9), family: 'r1', reported: rc({ count: 4 }), via: 'self' }),
  ];

  it('same log twice yields byte-identical reports', () => {
    expect(stableStringify(eveningReport(log, 0))).toBe(stableStringify(eveningReport(log, 0)));
  });

  it('never mutates the input log', () => {
    const before = stableStringify(log);
    eveningReport(log, 0);
    expect(stableStringify(log)).toBe(before);
  });
});
