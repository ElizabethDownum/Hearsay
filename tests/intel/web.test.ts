import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { stableStringify } from '../../src/sim/hash';
import type { IntelEntry } from '../../src/intel/entry';
import type { ReportedClaim } from '../../src/sim/enemy/state';
import { webView, type WebSubject } from '../../src/intel/web';

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

// A claimful utterance row — the only kind webView's families/spokes consider.
function utt(over: Partial<IntelEntry> & { family: string; reported: ReportedClaim }): IntelEntry {
  return entry({
    kind: 'utterance', speaker: 'mira', addressedTo: 'otto', claimId: 'c0', ...over,
  });
}

describe('webView — npc subject: families whose reported.subject matches', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ subject: 'otto' }) }),               // idx0 matches
    utt({ tick: 11, family: 'r2', reported: rc({ subject: 'mira' }) }),               // idx1 non-matching family
    utt({ tick: 12, family: 'r1', reported: rc({ subject: 'otto', count: 4 }) }),     // idx2 same family, 2nd version
  ];
  const subject: WebSubject = { kind: 'npc', id: 'otto' };

  it('picks up only the matching family, counting distinct versions', () => {
    const view = webView(log, subject);
    expect(view.subject).toEqual(subject);
    expect(view.families).toEqual([{ family: 'r1', versions: 2, entryIndexes: [0, 2] }]);
  });

  it('principalsTouched stays empty for an npc subject', () => {
    expect(webView(log, subject).principalsTouched).toEqual([]);
  });
});

describe('webView — spokes: carrier is the speaker for via:self, the informant otherwise', () => {
  const log: IntelEntry[] = [
    utt({
      tick: 10, family: 'r1', reported: rc({ subject: 'otto' }), via: 'self', speaker: 'mira',
    }),                                                                                 // idx0 self -> carrier mira
    utt({
      tick: 11, family: 'r1', reported: rc({ subject: 'otto' }), via: 'gale', speaker: 'quill',
    }),                                                                                 // idx1 gale -> carrier gale (not quill)
    utt({
      tick: 12, family: 'r1', reported: rc({ subject: 'otto' }), via: 'gale', speaker: 'sten',
    }),                                                                                 // idx2 gale again -> same carrier
  ];
  const subject: WebSubject = { kind: 'npc', id: 'otto' };

  it('groups by carrier and sorts by carrier id', () => {
    const view = webView(log, subject);
    expect(view.spokes).toEqual([
      { carrier: 'gale', via: 'gale', families: ['r1'], entryIndexes: [1, 2] },
      { carrier: 'mira', via: 'self', families: ['r1'], entryIndexes: [0] },
    ]);
  });
});

describe('webView — objective subject: unions principals, principalsTouched from damaging families only', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ subject: 'otto' }) }),     // usurper, damaging family
    utt({ tick: 11, family: 'r2', reported: rc({ subject: 'mira' }) }),     // council member, non-damaging family
    utt({ tick: 12, family: 'r3', reported: rc({ subject: 'quill' }) }),    // not a principal at all
  ];
  const subject: WebSubject = { kind: 'objective', usurper: 'otto', council: ['mira', 'rosa'] };

  it('families union every principal (usurper + council), excluding non-principal subjects', () => {
    const view = webView(log, subject, new Set(['r1']));
    expect(view.families.map((f) => f.family)).toEqual(['r1', 'r2']);
  });

  it('principalsTouched includes only principals with a family in damagingIds', () => {
    const view = webView(log, subject, new Set(['r1']));
    expect(view.principalsTouched).toEqual(['otto']);
  });

  it('an empty damagingIds set leaves principalsTouched empty', () => {
    const view = webView(log, subject, new Set());
    expect(view.principalsTouched).toEqual([]);
  });
});

describe('webView — determinism', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ subject: 'otto' }), via: 'gale', speaker: 'mira' }),
    utt({ tick: 11, family: 'r1', reported: rc({ subject: 'otto', count: 5 }), via: 'self', speaker: 'quill' }),
  ];
  const subject: WebSubject = { kind: 'npc', id: 'otto' };

  it('same log twice yields byte-identical views', () => {
    expect(stableStringify(webView(log, subject))).toBe(stableStringify(webView(log, subject)));
  });

  it('never mutates the input log', () => {
    const before = stableStringify(log);
    webView(log, subject);
    expect(stableStringify(log)).toBe(before);
  });
});
