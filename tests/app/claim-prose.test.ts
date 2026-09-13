import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClaimReading } from '../../app/src/panels/ClaimReading';
import { EvidenceBoard, ClusterDetail } from '../../app/src/panels/EvidenceBoard';
import { Directives } from '../../app/src/panels/Directives';
import { DayPlanner } from '../../app/src/panels/DayPlanner';
import { boardView } from '../../src/intel/board';
import type { IntelEntry } from '../../src/intel/entry';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { claimNames, playerView, networkView } from '../../src/sim/fieldwork';
import type { DirectiveLedgerRow } from '../../src/sim/directives/view';
import { miniTown } from '../sim/helpers/minitown';

const claim = { subject: 'ada', predicate: 'met-secretly-with', object: 'bez', count: 0,
  severity: 4 as const, place: 'backroom', attribution: 'cyn' };
const names: Record<string, string> = { ada: 'Adelaide', bez: 'Benedict', backroom: 'the back room', cyn: 'Cecily' };
const nameOf = (id: string) => names[id] ?? id;
const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
const noop = () => {};
function heard(over: Partial<IntelEntry> = {}): IntelEntry {
  return { tick: 0, venue: 'square', via: 'self', kind: 'utterance', overheard: false,
    speaker: 'cyn', addressedTo: 'you', mode: 'telling', authority: false,
    claimId: 'c0', family: 'f0', reported: { ...claim }, about: null, actor: null,
    npc: null, trait: null, edgeFrom: null, edgeTo: null, edgeKind: null,
    hintAbout: null, hintWitness: null, ...over };
}

describe('received claim prose on the existing panels', () => {
  it('keeps the reading line and the exact structured detail, including zero', () => {
    const page = html(createElement(ClaimReading, { claim, nameOf }));
    expect(page).toContain('Adelaide met Benedict in secret');
    expect(page).toContain('Cecily swears it');
    expect(page).toContain('<details>');
    expect(page).toContain('met-secretly-with');
    expect(page).toContain('<dd>0</dd>');
    expect(page).toContain('<dd>ada</dd>');
  });

  it('escapes names as text instead of admitting markup', () => {
    const page = html(createElement(ClaimReading, { claim, nameOf: () => '<script>bad</script>' }));
    expect(page).not.toContain('<script>');
    expect(page).toContain('&lt;script&gt;');
  });

  it('the raw board reads the reported claim and preserves its provenance badge', () => {
    const view = boardView([heard()], 0, RULES);
    const page = html(createElement(EvidenceBoard, {
      view, nameOf, tags: [], onAddTag: noop, onRemoveTag: noop,
    }));
    expect(page).toContain('Adelaide met Benedict in secret');
    expect(page).toContain('badge-via');
    expect(page).toContain('self');
    expect(page).toContain('Read the fields');
  });

  it('cluster prose and exact changed-field detail both survive', () => {
    const view = boardView([heard(), heard({ tick: 15, claimId: 'c1', reported: { ...claim, count: 2 } })], 1, RULES);
    const page = html(createElement(ClusterDetail, { cluster: view.clusters![0]!, view, nameOf }));
    expect(page).toContain('count given is 0');
    expect(page).toContain('count given is 2');
    expect(page).toContain('Compare the fields');
    expect(page).toContain('class="diff-cell"');
  });

  it('the directive desk renders only the report copy and keeps non-claim observations verbatim', () => {
    const row: DirectiveLedgerRow = {
      id: 'd0', recipient: 'ada', issuedAt: 0, clock: 'active', handoff: { outboundVia: [], reportVia: [] },
      authored: { mission: { kind: 'learn', target: { kind: 'person', id: 'bez' } },
        priority: 'routine', authority: 'request', discretion: 'open', specificity: 'guided',
        guidance: [], active: { from: 0, until: 1440 }, report: 'full', reportBy: null, purpose: null },
      reports: [{ receivedAt: 15, via: 'ada', report: { outcome: null, reason: null, source: null,
        uncertainty: null, evidence: [{ kind: 'claim', claimId: 'c0', reported: claim },
          { kind: 'observation', text: 'The shutters were closed.' }] } }],
    };
    const page = html(createElement(Directives, { view: { rows: [row] }, nameOf }));
    expect(page).toContain('Adelaide met Benedict in secret');
    expect(page).toContain('The shutters were closed.');
    expect(page).toContain('met-secretly-with');
    row.reports = [];
    const empty = html(createElement(Directives, { view: { rows: [row] }, nameOf }));
    expect(empty).not.toContain('Adelaide met Benedict in secret');
    expect(empty).toContain('Nothing has come back yet.');
  });

  function planner(entries: IntelEntry[]) {
    const fixture = miniTown();
    fixture.npcs = fixture.npcs.filter((npc) => npc.id !== 'dov');
    for (const npc of fixture.npcs) npc.edges = npc.edges.filter((edge) => edge.to !== 'dov');
    const world = buildWorld(fixture, 'prose-panel', RULES);
    enrollPlayer(world, { home: 'square' });
    world.network.assets.push({ id: 'ada', mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    const view = playerView(world);
    const labels = claimNames(world);
    return html(createElement(DayPlanner, { view, paused: true, coin: world.coin, economy: RULES.economy,
      onVerb: noop, onRequestLocal: noop, localPending: false, onLocal: noop,
      nameOf: (id: string) => labels[id] ?? id, net: networkView(world), board: boardView(entries, 0, RULES),
      offer: { tick: view.tick, venue: view.avatar.venue!, circleMembers: view.avatar.circleMembers, token: 'test-offer' },
    }));
  }

  it('story controls keep family values while displaying the delivered version and exact preview', () => {
    const page = planner([heard()]);
    for (const label of ['sell story', 'courier story', 'directive mission story']) {
      const select = page.match(new RegExp('<select[^>]*aria-label="' + label + '"[^>]*>([\\s\\S]*?)</select>'));
      expect(select, label).not.toBeNull();
      expect(select![1]).toContain('value="f0"');
      expect(select![1]).toContain('Ada met Bez in secret');
    }
    expect(page).toContain('Read the fields');
    expect(page).not.toContain('no delivered story to send');
  });

  it('an empty board keeps its honest refusal and offers no fabricated story', () => {
    const page = planner([]);
    expect(page).toContain('no delivered story to send');
    expect(page).not.toContain('value="f0"');
    expect(page).not.toContain('They loudly say');
  });
});
