import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import type { IntelEntry } from '../../src/intel/entry';
import { sourceOf, sourceKey, sourceLabel } from '../../src/intel/provenance';

const row = (over: Partial<IntelEntry> = {}): IntelEntry => ({
  ...blankIntel(), tick: 0, venue: 'hall', via: 'scrying', kind: 'utterance', overheard: true,
  speaker: 'a', addressedTo: 'b', claimId: 'c0', family: 'f0', mode: 'telling',
  reported: { subject: 'a', predicate: 'stole', object: null, count: 2,
    severity: 3, place: null, attribution: 'someone' }, ...over,
});
const magic = (entry: IntelEntry, operation = 's0'): IntelEntry => ({ ...entry,
  via: 'scrying', provenance: { kind: 'magic', spell: 'scrying', operation } });

describe('magic provenance is additive and distinct from an NPC id', () => {
  it.each(['scrying', 'seance'])('keeps the real NPC named %s an informant', (id) => {
    const entry = row({ via: id });
    const bytes = JSON.stringify(entry);
    expect(sourceOf(entry)).toEqual({ kind: 'informant', id });
    expect(sourceKey(entry)).not.toBe(sourceKey(magic(entry)));
    expect(sourceLabel(entry)).toBe(id);
    expect(JSON.stringify(entry)).toBe(bytes);
    expect(Object.hasOwn(entry, 'provenance')).toBe(false);
  });
});
