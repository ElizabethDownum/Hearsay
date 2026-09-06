import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EvidenceBoard } from '../../app/src/panels/EvidenceBoard';
import { EveningReport } from '../../app/src/panels/EveningReport';
import { Codex } from '../../app/src/panels/Codex';
import { WebViewPanel } from '../../app/src/panels/WebViewPanel';
import { InformantLedger } from '../../app/src/panels/InformantLedger';
import { resolveSlot, UI_GLYPHS } from '../../app/src/assets';
import { boardView } from '../../src/intel/board';
import { eveningReport } from '../../src/intel/report';
import { webView } from '../../src/intel/web';
import { informantLedger } from '../../src/intel/ledger';
import { blankIntel } from '../../src/sim/fieldwork';
import type { IntelEntry } from '../../src/intel/entry';
import { STANDARD_RULES } from '../../src/content/rules';

const entry: IntelEntry = { ...blankIntel(), tick: 1440, venue: 'hall', kind: 'utterance',
  via: 'scrying', provenance: { kind: 'magic', spell: 'scrying', operation: 's0' },
  overheard: true, family: 'f0', claimId: 'c0', speaker: 'a', addressedTo: 'b', mode: 'telling',
  reported: { subject: 'a', predicate: 'stole', object: null, count: 2, severity: 3,
    place: null, attribution: 'someone' } };
const noop = () => {};

describe('existing panels render explicit spell provenance', () => {
  it('raw and clustered boards label magic; web has no synthetic carrier', () => {
    for (const level of [0, 3] as const) {
      const html = renderToStaticMarkup(<EvidenceBoard view={boardView([entry], level, STANDARD_RULES)}
        tags={[]} onAddTag={noop} onRemoveTag={noop} />);
      expect(html).toContain('scrying (magic)');
    }
    const html = renderToStaticMarkup(<WebViewPanel web={webView([entry], { kind: 'npc', id: 'a' })} onSelectNpc={noop} />);
    expect(html).not.toContain('web spoke scrying');
    expect(html).toContain('observation(s)');
  });
  it('report and mixed-channel lock use honest channel wording', () => {
    expect(renderToStaticMarkup(<EveningReport report={eveningReport([entry], 1)} onOpenBoard={noop} />)).toContain('scrying');
    const html = renderToStaticMarkup(<Codex rows={[{ npc: 'b', trait: 'exaggerator', hits: 3,
      locked: true, pairs: [], singleChannelVia: 'ada', hasMagic: true }]} />);
    expect(html).toContain('one informant channel');
    expect(html).not.toContain('rests entirely on');
  });
  it('the already-planned icon resolves to its primitive fallback', () => {
    expect(resolveSlot('icon.ui.scrying')).toEqual({ kind: 'fallback' });
    expect(UI_GLYPHS.scrying).toBe('◉');
  });
  it('a physically reported trace uses registered vocabulary in an informant ledger', () => {
    const residue: IntelEntry = { ...blankIntel(), tick: 1440, venue: 'hall', kind: 'arcane-residue',
      via: 'ada', overheard: false, residueId: 's0' };
    const html = renderToStaticMarkup(<InformantLedger ledger={informantLedger([residue], 'ada')} onSelectFamily={noop} />);
    expect(html).toContain('Arcane residue');
    expect(html).toContain('Physical trace at hall');
  });
});
