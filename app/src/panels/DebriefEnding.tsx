import { useReducer, type CSSProperties, type KeyboardEvent } from 'react';
import { TERMS } from '../../../src/content/terms';
import type { DebriefView } from '../townview';
import { DebriefThreads, type DebriefArt } from './DebriefThreads';
import { DebriefTimeline } from './DebriefTimeline';
import { DebriefOverlay } from './DebriefOverlay';
import { RetainedDetails } from './DebriefReading';
import { Term } from './Term';

const ENDINGS: Record<DebriefView['ending']['status'], { cls: string; term: string; line: string }> = {
  won: { cls: 'ending-won', term: 'denounce', line: 'The council turned on the usurper. You won.' },
  'lost-clock': { cls: 'ending-clock', term: 'coronation', line: 'The clock ran out; the crown landed.' },
  'lost-exposed': { cls: 'ending-lost', term: 'unmasking', line: 'The enemy sketch converged on your people.' },
  'lost-caught': { cls: 'ending-lost', term: 'arrest', line: 'A guard heard you speak the words yourself.' },
};
const TABS = [{ key: 'threads', term: 'thread', label: 'Threads' },
  { key: 'timeline', term: 'timeline', label: 'Sketch timeline' },
  { key: 'overlay', term: 'overlay', label: 'Overlay' }] as const;
type Tab = typeof TABS[number]['key'];
/** `visited` records that the desk has been opened, so the ending card returns focus to its control
 *  only after a close, never on the campaign's first terminal render. */
type Navigation = { open: boolean; tab: Tab; visited: boolean };
type NavigationAction = { kind: 'open' | 'close' } | { kind: 'tab'; tab: Tab };
const navigate = (state: Navigation, action: NavigationAction): Navigation => action.kind === 'tab'
  ? { open: true, tab: action.tab, visited: true }
  : { ...state, open: action.kind === 'open', visited: state.visited || action.kind === 'open' };

/** Props-only terminal flow: navigation changes presentation, never the session or its action log.
 *  Focus follows each view replacement through mount-time `autoFocus`: opening lands on the selected
 *  tab (the roving stop of the tablist), and Back or Escape lands on the control that opened the desk. */
export function DebriefEnding({ view, names, art }: {
  view: DebriefView; names: Readonly<Record<string, string>>; art: DebriefArt;
}) {
  const [navigation, dispatch] = useReducer(navigate, { open: false, tab: 'threads', visited: false });
  const ending = ENDINGS[view.ending.status];
  const line = view.ending.resolutionState === 'consistent' ? ending.line
    : 'The campaign ended with this recorded status. Its cause is not proved by the retained history.';
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1
      : event.key === 'ArrowRight' ? (index + 1) % TABS.length
        : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : null;
    if (next === null) return;
    event.preventDefault(); event.stopPropagation(); dispatch({ kind: 'tab', tab: TABS[next]!.key });
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  if (!navigation.open) return <div className={`ending ${ending.cls}`}>
    <h1><Term id={ending.term} /></h1><p>{line}</p>
    {view.ending.resolutionState !== 'consistent' && <p>Ending details are {view.ending.resolutionState}; the retained status is shown.</p>}
    <button className="desk-btn" title={TERMS['terminal-debrief']!.short} autoFocus={navigation.visited} onClick={() => dispatch({ kind: 'open' })}>
      Open the {TERMS['terminal-debrief']!.label.toLowerCase()}</button>
  </div>;
  const paper: CSSProperties = art.paper.kind === 'fallback' ? {} : {
    backgroundImage: (art.paper.kind === 'asset' ? [art.paper.url] : art.paper.urls).map((url) => `url(${JSON.stringify(url)})`).join(', '),
  };
  return <main className="debrief-desk" style={paper} aria-label="Terminal debrief"
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dispatch({ kind: 'close' }); } }}>
    <header><h1><Term id="terminal-debrief" /></h1><p>{line}</p>
      <p className="debrief-epigraph"><Term id="debrief-epigraph" /></p>
      <button className="desk-btn" onClick={() => dispatch({ kind: 'close' })}>Back to the ending</button>
      <RetainedDetails value={view.ending} label="Read the retained ending and its consistency" />
    </header>
    <div className="tag-row" role="tablist" aria-label="Debrief surfaces">{TABS.map((tab, index) => <button
      key={tab.key} className="desk-btn" role="tab" id={`debrief-tab-${tab.key}`} aria-controls={`debrief-panel-${tab.key}`}
      aria-selected={navigation.tab === tab.key} tabIndex={navigation.tab === tab.key ? 0 : -1}
      autoFocus={navigation.tab === tab.key} title={TERMS[tab.term]!.short}
      onClick={() => dispatch({ kind: 'tab', tab: tab.key })} onKeyDown={(event) => moveTab(event, index)}>
      {tab.label}</button>)}</div>
    <div role="tabpanel" tabIndex={0} id={`debrief-panel-${navigation.tab}`} aria-labelledby={`debrief-tab-${navigation.tab}`}>
      {navigation.tab === 'threads' ? <DebriefThreads view={view} names={names} art={art} />
        : navigation.tab === 'timeline' ? <DebriefTimeline view={view} names={names} /> : <DebriefOverlay view={view} names={names} />}
    </div>
  </main>;
}
