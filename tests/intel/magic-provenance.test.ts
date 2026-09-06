import { describe, expect, it } from 'vitest';
import { blankIntel } from '../../src/sim/fieldwork';
import type { IntelEntry } from '../../src/intel/entry';
import { sourceOf, sourceKey, sourceLabel, singleInformantChannel } from '../../src/intel/provenance';
import { webView } from '../../src/intel/web';
import { informantLedger } from '../../src/intel/ledger';
import { eveningReport } from '../../src/intel/report';
import { corroborations, codexStatus } from '../../src/intel/codex';
import { routeOf } from '../../src/intel/board';
import { counterSignals } from '../../src/intel/countersketch';
import { STANDARD_RULES as R } from '../../src/content/rules';

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
  it('magic is no carrier or ledger cross-check, while actual NPC reports still count', () => {
    const log = [row(), magic(row()), row({ via: 'ada' })];
    expect(webView(log, { kind: 'npc', id: 'a' }).spokes.map((spoke) => spoke.carrier)).toEqual(['ada', 'scrying']);
    expect(webView([magic(row())], { kind: 'npc', id: 'a' })).toMatchObject({
      spokes: [], magicEntryIndexes: [0], families: [{ family: 'f0' }],
    });
    expect(informantLedger(log, 'scrying').rows.map((entry) => entry.entryIndex)).toEqual([0]);
    expect(informantLedger([row({ via: 'ada' }), magic(row())], 'ada').corroboratedElsewhere).toEqual([]);
    expect(singleInformantChannel([row({ via: 'ada' }), magic(row())])).toBe('ada');
    expect(singleInformantChannel([magic(row())])).toBeNull();
    expect(singleInformantChannel([row({ via: 'ada' }), row({ via: 'bez' })])).toBeNull();
  });
  it('board route and report preserve a magic badge without changing an old source bucket', () => {
    const log = [row(), magic(row())];
    expect(routeOf(log, 'f0')[0]).not.toHaveProperty('provenance');
    expect(routeOf(log, 'f0')[1]).toHaveProperty('provenance.spell', 'scrying');
    expect(eveningReport(log, 0)).toMatchObject({ entriesByVia: { scrying: [0] }, magicBySpell: { scrying: [1] } });
    expect(eveningReport([row()], 0)).not.toHaveProperty('magicBySpell');
  });
  it('unfiltered scene occupants are not automatically watch sightings', () => {
    const scene = magic(row({ kind: 'scene-presence', family: null, reported: null, actor: 'a' }));
    expect(counterSignals([scene])).toEqual([]);
    expect(eveningReport([scene], 0).authoritySightings).toEqual([]);
    expect(counterSignals([{ ...scene, kind: 'presence' }])[0]?.kind).toBe('watch');
  });
  it('three copies of one telling do not manufacture a codex lock; three actual acts can', () => {
    const receive = row({ tick: 10, via: 'ada' });
    const tell = row({ tick: 11, via: 'ada', speaker: 'b', addressedTo: 'a', claimId: 'c1',
      reported: { ...row().reported!, count: 4, severity: 4 } });
    const log = [receive, tell, magic(tell), magic(tell, 's1')];
    expect(corroborations(log, 'b', 'exaggerator', R)).toHaveLength(1);
    const hypothesis = [{ npc: 'b', trait: 'exaggerator', proposedAt: 0 }];
    expect(codexStatus(log, hypothesis, R)[0]).toMatchObject({ hits: 1, locked: false });
    const actualActs = [magic(receive), magic(tell), magic({ ...tell, tick: 26 }), magic({ ...tell, tick: 41 })];
    expect(codexStatus(actualActs, hypothesis, R)[0]).toMatchObject({ hits: 3, locked: true });
  });
  it('the shared seance provenance can carry testimony without inventing a living route or carrier', () => {
    const testimony = row({ via: 'seance', speaker: null, addressedTo: null,
      provenance: { kind: 'magic', spell: 'seance', operation: 'seance:departed-0' } });
    expect(sourceLabel(testimony)).toBe('seance (magic)');
    expect(sourceKey(testimony)).not.toBe(sourceKey(row({ via: 'seance' })));
    expect(routeOf([testimony], 'f0')).toEqual([]);
    expect(webView([testimony], { kind: 'npc', id: 'a' })).toMatchObject({
      families: [{ family: 'f0' }], spokes: [], magicEntryIndexes: [0],
    });
    expect(singleInformantChannel([testimony])).toBeNull();
    expect(corroborations([testimony], 'a', 'exaggerator', R)).toEqual([]);
  });
});
