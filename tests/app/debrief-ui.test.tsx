import { describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveSlot, UI_GLYPHS } from '../../app/src/assets';
import { DebriefEnding } from '../../app/src/panels/DebriefEnding';
import { DebriefThreads, type DebriefArt } from '../../app/src/panels/DebriefThreads';
import { DebriefTimeline } from '../../app/src/panels/DebriefTimeline';
import { DebriefOverlay } from '../../app/src/panels/DebriefOverlay';
import { DebriefClaim } from '../../app/src/panels/DebriefReading';
import { debriefView, type DebriefView } from '../../src/sim/debrief/index';
import { claimNames } from '../../src/sim/fieldwork';
import { cloneSerializable, hashWorld } from '../../src/sim/hash';
import { terminalStory } from './helpers/debrief-campaign';

const navigation = vi.hoisted(() => ({ active: false, ready: false, state: undefined as unknown }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  type Hook = <S, A>(reducer: (state: S, action: A) => S, initial: S) => [S, (action: A) => void];
  const original = actual.useReducer as unknown as Hook;
  const useReducer: Hook = (reducer, initial) => {
    if (!navigation.active) return original(reducer, initial);
    if (!navigation.ready) { navigation.state = initial; navigation.ready = true; }
    return [navigation.state as typeof initial, (action) => { navigation.state = reducer(navigation.state as typeof initial, action); }];
  };
  return { ...actual, useReducer };
});

const art: DebriefArt = { paper: resolveSlot('texture.paper.debrief'), icons: {
  letter: { resolved: resolveSlot('icon.ui.letter'), fallback: UI_GLYPHS.letter! },
  'forgery-quill': { resolved: resolveSlot('icon.ui.forgery-quill'), fallback: UI_GLYPHS['forgery-quill']! },
  scrying: { resolved: resolveSlot('icon.ui.scrying'), fallback: UI_GLYPHS.scrying! },
  seance: { resolved: resolveSlot('icon.ui.seance'), fallback: UI_GLYPHS.seance! },
} };
const fixture = () => { const { world, claimId } = terminalStory(); const view = debriefView(world); if (!view) throw new Error('no terminal model');
  return { world, view, claimId, names: claimNames(world) }; };
const html = (node: ReactNode) => renderToStaticMarkup(node);
type Props = { children?: ReactNode; role?: string; id?: string; onClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void; 'aria-selected'?: boolean; tabIndex?: number };
function elements(node: ReactNode): ReactElement<Props>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : []);
}
function control(view: DebriefView, names: Record<string, string>) {
  navigation.ready = false;
  return () => { navigation.active = true; try { return DebriefEnding({ view, names, art }); } finally { navigation.active = false; } };
}

describe('one real terminal campaign is readable across all three surfaces', () => {
  it('the nightly clock ends a real two-hop exaggerated report campaign, preserving the losing account', () => {
    const { world, view, claimId, names } = fixture();
    expect(world.tick).toBe(1440); expect(world.scenario?.status).toBe('lost-clock');
    expect(world.scenario?.resolution).toMatchObject({ kind: 'lost-clock', turned: [] });
    const packet = view.operations.reportItems.find((row) => row.held.some((held) => held.content.kind === 'raw'
      && held.content.observation.kind === 'utterance' && held.content.observation.claim.id === claimId))!.packets[0]!;
    const spoken = packet.stages.filter((stage) => stage.status === 'spoken');
    expect(spoken.map((stage) => stage.speaker)).toEqual(['ada', 'bez']);
    expect(spoken[0]!.item!.observation).toMatchObject({ kind: 'utterance', reported: { count: 2 } });
    expect(spoken[1]!.item!.observation).toMatchObject({ kind: 'utterance', reported: { count: 4 } });
    expect(world.claims[claimId]!.count).toBe(2);
    const before = hashWorld(world);
    const threads = html(<DebriefThreads view={view} names={names} art={art} />);
    expect(threads).toContain('marked words changed'); expect(threads).toContain('Claim change');
    expect(threads).toContain('Bez'); expect(threads).toContain('debrief-change');
    expect(threads).toContain('Changed'); expect(threads).toContain('current carried copy');
    const timeline = html(<DebriefTimeline view={view} names={names} />);
    expect(timeline).toContain('Your received board at this date'); expect(timeline).toContain('day 0');
    expect(timeline).toContain('Your identity had not been recorded');
    const overlay = html(<DebriefOverlay view={view} names={names} />);
    expect(overlay).toContain('Copies you actually heard'); expect(overlay).toContain('Bez');
    expect(overlay).toContain('Headquarters'); expect(overlay).toContain('Ungraded');
    expect(hashWorld(world)).toBe(before); expect(debriefView(world)).toEqual(view);
  });

  it('the actual open and tab handlers expose each surface, preserve selection and close without a world mutation', () => {
    const { world, view, names } = fixture(); const before = hashWorld(world); const render = control(view, names);
    let tree = render(); expect(html(tree)).toContain('Open the'); expect(html(tree)).not.toContain('role="tabpanel"');
    elements(tree).find((node) => node.type === 'button')!.props.onClick!(); tree = render();
    expect(html(tree)).toContain('what can happen, not what will happen');
    for (const key of ['timeline', 'overlay', 'threads']) {
      elements(tree).find((node) => node.props.id === 'debrief-tab-'+key)!.props.onClick!(); tree = render();
      expect(html(tree)).toContain('id="debrief-panel-'+key+'"');
      const tabs = elements(tree).filter((node) => node.props.role === 'tab');
      expect(tabs.filter((node) => node.props['aria-selected'])).toHaveLength(1);
      expect(tabs.filter((node) => node.props.tabIndex === 0)).toHaveLength(1);
      const tablist = html(tree).split('role="tablist"')[1]!.split('</div>')[0]!;
      expect(tablist.match(/tabindex="0"/g)).toHaveLength(1);
      expect(tablist).not.toContain('<span'); // No nested focusable tooltip defeats the roving tab stop.
    }
    elements(tree).find((node) => node.type === 'button' && node.props.role !== 'tab')!.props.onClick!();
    expect(html(render())).toContain('Open the'); expect(hashWorld(world)).toBe(before);
  });

  it('arrow, Home, End and Escape handlers provide real roving-tab actions with explicit accessible targets', () => {
    const { view, names } = fixture(); const render = control(view, names);
    elements(render()).find((node) => node.type === 'button')!.props.onClick!();
    let tree = render(); const focus = [vi.fn(), vi.fn(), vi.fn()];
    const key = (value: string, tab: string) => {
      const preventDefault = vi.fn(); const stopPropagation = vi.fn();
      const event = { key: value, preventDefault, stopPropagation, currentTarget: { parentElement: {
        querySelectorAll: () => focus.map((focus) => ({ focus })),
      } } } as unknown as KeyboardEvent<HTMLButtonElement>;
      elements(tree).find((node) => node.props.id === 'debrief-tab-'+tab)!.props.onKeyDown!(event);
      expect(preventDefault).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledOnce(); tree = render();
    };
    key('ArrowRight', 'threads'); expect(html(tree)).toContain('id="debrief-panel-timeline"'); expect(focus[1]).toHaveBeenCalledOnce();
    key('End', 'timeline'); expect(html(tree)).toContain('id="debrief-panel-overlay"');
    key('Home', 'overlay'); expect(html(tree)).toContain('id="debrief-panel-threads"');
    key('ArrowLeft', 'threads'); expect(html(tree)).toContain('id="debrief-panel-overlay"');
    const event = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as KeyboardEvent<HTMLButtonElement>;
    elements(tree).find((node) => node.type === 'main')!.props.onKeyDown!(event);
    expect(html(render())).toContain('Open the'); expect(event.stopPropagation).toHaveBeenCalledOnce();
  });
});

describe('truthful ambiguous and incomplete terminal presentation', () => {
  it.each(['missing', 'inconsistent'] as const)('a %s ending cause is not narrated as a proved guard accusation', (state) => {
    const { view, names } = fixture(); const changed = cloneSerializable(view);
    changed.ending.status = 'lost-caught'; changed.ending.resolutionState = state;
    const render = control(changed, names); let tree = render();
    expect(html(tree)).toContain('cause is not proved'); expect(html(tree)).not.toContain('A guard heard you speak');
    elements(tree).find((node) => node.type === 'button')!.props.onClick!(); tree = render();
    expect(html(tree)).toContain('cause is not proved'); expect(html(tree)).not.toContain('A guard heard you speak');
  });

  it('a conflicting retained claim alias is shown as ambiguous without assigning its prose to the real event', () => {
    const { view, names } = fixture(); const changed = cloneSerializable(view); const story = changed.operations.stories[0]!;
    const original = story.versions[0]!; story.versions.push({ ...original, claim: { ...original.claim, count: 999 } });
    const result = html(<DebriefThreads view={changed} names={names} art={art} />);
    expect(result).toContain('No candidate is chosen'); expect(result).toContain('Read candidate copies');
    expect(result).toContain('Ambiguous'); expect(result).not.toContain('999</mark>');
  });

  it('a missing parent cannot acquire a prose diff or a named responsible mind', () => {
    const { view, names } = fixture(); const claim = view.operations.stories[0]!.versions[0]!.claim;
    const result = html(<DebriefClaim claim={claim} names={names} changes={null} />);
    expect(result).toContain('Earlier comparison'); expect(result).toContain('Unrecorded');
    expect(result).not.toContain('<mark'); expect(result).not.toContain('Claim change');
  });

  it('deleted-only wording remains a visible exact field change even if the later prose adds no word', () => {
    const { view, names } = fixture(); const before = view.operations.stories[0]!.versions[0]!.claim;
    const claim = { ...before, object: null, count: null };
    const result = html(<DebriefClaim claim={claim} before={before} changes={[{ field: 'count', from: before.count, to: null }]} changedBy="bez" names={names} />);
    expect(result).toContain('Earlier account'); expect(result).toContain('This account'); expect(result).toContain('Changed');
    expect(result).toContain('Bez'); expect(result).toContain('null');
  });

  it('all raw orphan histories and every chronicle category remain reachable as escaped inspectable text', () => {
    const { view, names } = fixture(); const changed = cloneSerializable(view);
    changed.annotations.cards.push({ id: '<script>unsafe</script>', text: '<script>unsafe</script>', createdTick: 0,
      updatedTick: 0, confidence: 0.5, links: [] });
    const threads = html(<DebriefThreads view={changed} names={names} art={art} />);
    for (const text of ['Magic captures without a proved operation', 'Physical residue history without an operation',
      'Story events without a resolvable claim', 'including institutions and vignettes', 'beyond the retained clock']) expect(threads).toContain(text);
    const overlay = html(<DebriefOverlay view={changed} names={names} />);
    expect(overlay).toContain('&lt;script&gt;unsafe&lt;/script&gt;'); expect(overlay).not.toContain('<script>unsafe');
    expect(overlay).toContain('Ungraded'); expect(html(<DebriefTimeline view={changed} names={names} />)).not.toContain('unsafe');
  });
});
