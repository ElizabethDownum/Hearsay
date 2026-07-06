import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { stableStringify } from '../../src/sim/hash';
import type { IntelEntry } from '../../src/intel/entry';
import type { ReportedClaim } from '../../src/sim/enemy/state';
import { informantLedger } from '../../src/intel/ledger';

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

describe('informantLedger — rows for one via only, with display summaries', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc({ subject: 'otto', predicate: 'stole' }), via: 'gale' }), // idx0 gale
    entry({ tick: 11, kind: 'presence', via: 'gale', actor: 'hugo' }),                                    // idx1 gale
    utt({ tick: 12, family: 'r1', reported: rc(), via: 'self' }),                                         // idx2 self (other via)
    utt({ tick: 13, family: 'r2', reported: rc({ subject: 'mira' }), via: 'gale' }),                       // idx3 gale, uncorroborated family
    entry({
      tick: 14, kind: 'asking', via: 'dossier', authority: true, about: { family: 'r1' }, family: 'r1',
    }),                                                                                                    // idx4 dossier (other via for r1)
  ];

  it('lists only rows captured through the requested via, in log order', () => {
    const view = informantLedger(log, 'gale');
    expect(view.via).toBe('gale');
    expect(view.rows).toEqual([
      { entryIndex: 0, tick: 10, kind: 'utterance', family: 'r1', summary: 'otto stole' },
      { entryIndex: 1, tick: 11, kind: 'presence', family: null, summary: 'presence' },
      { entryIndex: 3, tick: 13, kind: 'utterance', family: 'r2', summary: 'mira stole' },
    ]);
  });

  it('corroboratedElsewhere lists families this via reported that other vias also carried', () => {
    const view = informantLedger(log, 'gale');
    // r1 was also carried by self (idx2) and dossier's asking (idx4); r2 was carried only by gale.
    expect(view.corroboratedElsewhere).toEqual([
      { family: 'r1', otherVias: ['dossier', 'self'] },
    ]);
  });

  it('an empty via yields empty rows and no corroboration', () => {
    const view = informantLedger(log, 'nobody');
    expect(view.rows).toEqual([]);
    expect(view.corroboratedElsewhere).toEqual([]);
  });
});

describe('informantLedger — determinism', () => {
  const log: IntelEntry[] = [
    utt({ tick: 10, family: 'r1', reported: rc(), via: 'gale' }),
    utt({ tick: 11, family: 'r1', reported: rc({ count: 4 }), via: 'self' }),
  ];

  it('same log twice yields byte-identical views', () => {
    expect(stableStringify(informantLedger(log, 'gale'))).toBe(stableStringify(informantLedger(log, 'gale')));
  });

  it('never mutates the input log', () => {
    const before = stableStringify(log);
    informantLedger(log, 'gale');
    expect(stableStringify(log)).toBe(before);
  });
});
