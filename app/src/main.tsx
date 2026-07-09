import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';

// ── Composition root: engine VALUE imports are legal ONLY here and in loop/** (the composition-root
// fence). Everything below the panels boundary receives props; nothing there reaches the engine. ──
import { newSession, type ActionIntent } from './loop/session';
import { makeClock } from './loop/clock';
import { KEYMAP, VERB_TERM, type UIAction } from './input/actions';
import { TERMS } from '../../src/content/terms';
import { computeLayout } from './town/layout';
import { TownCanvas } from './town/TownCanvas';
import { playerView, networkView, courierRouteView } from '../../src/sim/fieldwork';
import { boardView } from '../../src/intel/board';
import { counterSketchView } from '../../src/intel/countersketch';
import { corroborations } from '../../src/intel/codex';
import { webView, type WebSubject } from '../../src/intel/web';
import { informantLedger } from '../../src/intel/ledger';
import { eveningReport } from '../../src/intel/report';
import { STANDARD_RULES } from '../../src/content/rules';
import { dayOf, minuteOfDay } from '../../src/core/time';
import type { AssistLevel, IntelEntry } from '../../src/intel/types';
import type { Rules } from '../../src/sim/rules';

import { Term } from './panels/Term';
import { EvidenceBoard } from './panels/EvidenceBoard';
import { Codex, type CodexDetailRow } from './panels/Codex';
import { CounterSketch } from './panels/CounterSketch';
import { WebViewPanel } from './panels/WebViewPanel';
import { InformantLedger } from './panels/InformantLedger';
import { EveningReport } from './panels/EveningReport';
import { DayPlanner } from './panels/DayPlanner';
import { TermsCodex } from './panels/TermsCodex';
import { Network } from './panels/Network';
import { Treasury } from './panels/Treasury';

const SEED = 'cor-1';
type PanelKind = Extract<UIAction, { kind: 'open-panel' }>['panel'];
const TABS: { key: PanelKind; term: string }[] = [
  { key: 'board', term: 'evidence-board' }, { key: 'codex', term: 'codex' },
  { key: 'counter', term: 'counter-sketch' }, { key: 'web', term: 'web-view' },
  { key: 'ledger', term: 'ledger' }, { key: 'planner', term: 'day-planner' },
  { key: 'network', term: 'network' }, { key: 'treasury', term: 'treasury' },
  { key: 'report', term: 'evening-report' }, { key: 'terms', term: 'terms-codex' },
];

/** The next rest-day (day-of-week 6) on or after `day` — when the weekly stipend next credits. */
function nextStipendDay(day: number): number {
  return day + ((6 - (day % 7)) + 7) % 7;
}
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

// ── Composition-root view-model folds (computed here so panels stay props-only) ──────────────────

/** Families whose predicate valence Rules judges damaging — the web's objective `damagingIds`. Intel
 *  itself never reads Rules (the fence), so the caller computes this and passes it in. */
function damagingFamilies(log: readonly IntelEntry[], rules: Rules): Set<string> {
  const s = new Set<string>();
  for (const e of log) {
    if (e.kind === 'utterance' && e.family && e.reported
      && rules.predicates[e.reported.predicate]?.valence === 'damaging') s.add(e.family);
  }
  return s;
}

/** The Codex detail model: every corroboration enriched with the via each half reached you through,
 *  and the single-channel flag — set when every pair rests on one informant channel (never self/
 *  dossier). This is the provenance-visible obligation, computed once per render. */
function codexDetailView(log: readonly IntelEntry[], codex: { npc: string; trait: string }[], rules: Rules): CodexDetailRow[] {
  return codex.map((h) => {
    const hits = corroborations(log, h.npc, h.trait, rules);
    const pairs = hits.map((hit) => ({
      family: hit.family, viaFrom: log[hit.receivedIndex]!.via, viaTo: log[hit.toldIndex]!.via,
      changeCount: hit.changes.length,
    }));
    const vias = new Set(pairs.flatMap((p) => [p.viaFrom, p.viaTo]));
    const sole = vias.size === 1 ? [...vias][0]! : null;
    const singleChannelVia = pairs.length > 0 && sole && sole !== 'self' && sole !== 'dossier' ? sole : null;
    return { npc: h.npc, trait: h.trait, hits: pairs.length, locked: pairs.length >= 3, pairs, singleChannelVia };
  });
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmtTick = (t: number) => `day ${dayOf(t)} · ${pad(Math.floor(minuteOfDay(t) / 60))}:${pad(minuteOfDay(t) % 60)}`;

// ── Ending screens (won/lost-clock/lost-exposed/lost-caught). Debrief is Plan 9 — the card says so. ─
const ENDINGS: Record<string, { cls: string; term: string; line: string }> = {
  won: { cls: 'ending-won', term: 'denounce', line: 'The council turned on the usurper. You won.' },
  'lost-clock': { cls: 'ending-clock', term: 'coronation', line: 'The clock ran out; the crown landed.' },
  'lost-exposed': { cls: 'ending-lost', term: 'unmasking', line: 'The enemy sketch converged on your people.' },
  'lost-caught': { cls: 'ending-lost', term: 'arrest', line: 'A guard heard you speak the words yourself.' },
};
function EndingScreen({ status }: { status: string }) {
  const e = ENDINGS[status]!;
  return (
    <div className={`ending ${e.cls}`}>
      <h1><Term id={e.term} /></h1>
      <p>{e.line}</p>
      <p className="desk-note">The full debrief is Plan 9 — for now, the campaign has resolved.</p>
    </div>
  );
}

function App() {
  const sessionRef = useRef(newSession(SEED));
  const clockRef = useRef(makeClock());
  const tagId = useRef(0);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [panel, setPanel] = useState<PanelKind | null>('planner');
  const [speed, setSpeed] = useState<0 | 0.25 | 0.5 | 1 | 2 | 4>(0); // start paused: pause-to-plan
  const [assist, setAssist] = useState<AssistLevel>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [webNpc, setWebNpc] = useState<string | null>(null);
  const [ledgerVia, setLedgerVia] = useState<string>('self');
  const [toast, setToast] = useState<string>('');

  const session = sessionRef.current;
  const world = session.world;
  useEffect(() => { clockRef.current.speed = speed; }, [speed]);

  // The playback loop: real elapsed-ms → whole ticks (clock) → session.advance. The sim mutates in
  // place; `force` re-renders. advance halts on a terminal status; a failed queued verb surfaces its
  // throw here (already dropped from the log) — we toast it and keep the clean world it landed on.
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const frame = (now: number) => {
      const dt = now - last; last = now;
      raf = requestAnimationFrame(frame);
      if (sessionRef.current.world.scenario && sessionRef.current.world.scenario.status !== 'running') return;
      const ticks = clockRef.current.onFrame(dt);
      if (ticks <= 0) return;
      try { sessionRef.current.advance(ticks); } catch (err) { setToast(err instanceof Error ? err.message : String(err)); }
      force();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard: every key is a UIAction via the data-driven KEYMAP (rebindable later). Typing in a
  // field is never hijacked. select-venue/npc/assist/verb are pointer-driven, absent from the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      const a = KEYMAP[e.key];
      if (!a) return;
      e.preventDefault();
      if (a.kind === 'pause') setSpeed((s) => (s === 0 ? 1 : 0));
      else if (a.kind === 'speed') setSpeed(a.speed);
      else if (a.kind === 'open-panel') setPanel(a.panel);
      else if (a.kind === 'close') setPanel(null);
      else if (a.kind === 'assist') setAssist(a.level);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Town layout is deterministic and map-stable across ticks — compute it ONCE per world. Kept above
  // the ending early-return so the hook order never changes (Rules of Hooks).
  const layout = useMemo(
    () => computeLayout(playerView(sessionRef.current.world).map, sessionRef.current.seed), [],
  );

  const submitVerb = (intent: ActionIntent) => {
    const { queuedFor } = session.submit(intent);
    // The toast speaks registered language (jargon law): the verb's TERMS label, never a raw kind.
    setToast(`${TERMS[VERB_TERM[intent.kind]]!.label} queued for ${fmtTick(queuedFor)} — unpause to fire`);
    force();
  };
  const addTag = (target: string, text: string) =>
    submitVerb({ kind: 'tag', op: 'add', id: `tag-${tagId.current++}`, target, text });
  const removeTag = (id: string) => submitVerb({ kind: 'tag', op: 'remove', id, target: null, text: null });

  const status = world.scenario?.status;
  if (status && status !== 'running') return <EndingScreen status={status} />;

  // ── View models: every surface below is a pure fold the composition root computes ──
  const view = playerView(world);
  const log = world.intel.log;
  const tags = world.intel.tags;
  const watchSightings = new Set(log.filter((e) => e.kind === 'presence').map((e) => e.venue));
  const cast = world.scenario?.cast;
  const webSubject: WebSubject = webNpc
    ? { kind: 'npc', id: webNpc }
    : { kind: 'objective', usurper: cast?.usurper ?? '', council: cast?.council ?? [] };
  const web = webView(log, webSubject, damagingFamilies(log, STANDARD_RULES));
  const vias = ['self', 'dossier', ...world.intel.informants.map((i) => i.id)];
  // One board fold serves both the board panel and the planner's family-ask list (the brief's
  // "family from board clusters"): the families the player can ask about are the clusters the
  // board shows, so family-asking unlocks with clustering (assist >= 1), exactly like the board.
  const board = boardView(log, assist, STANDARD_RULES);
  const clusterFamilies = (board.clusters ?? []).map((c) => c.family);
  // The network surface (Task 11): the roster/treasury/courier folds, all through epistemic selectors.
  const net = networkView(world);
  const courierRoutes = courierRouteView(world);
  const stipendDay = nextStipendDay(view.scenario?.day ?? dayOf(world.tick));

  return (
    <main style={{ fontFamily: 'var(--font-text)', maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Hearsay</h1>
        <span className="desk-note">seed {session.seed} · {fmtTick(world.tick)}
          {view.scenario ? ` / ${view.scenario.daysTotal}d` : ''} · {status}</span>
      </header>

      <div className="tag-row" role="toolbar" aria-label="playback">
        <button className="desk-btn" aria-pressed={speed === 0} onClick={() => setSpeed((s) => (s === 0 ? 1 : 0))}>
          {speed === 0 ? '▶ run' : '⏸ pause'}
        </button>
        {SPEEDS.map((s) => (
          <button key={s} className="desk-btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}×</button>
        ))}
        <span className="desk-note"><Term id="assist-level" />:</span>
        {[0, 1, 2, 3].map((l) => (
          <button key={l} className="desk-btn" aria-pressed={assist === l} onClick={() => setAssist(l as AssistLevel)}>{l}</button>
        ))}
      </div>

      {toast && <p className="desk-note" role="status">{toast} <button className="desk-btn" onClick={() => setToast('')}>×</button></p>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', minWidth: 320 }}>
          <TownCanvas view={view} layout={layout} selected={selected} watchSightings={watchSightings} courierRoutes={courierRoutes} onSelect={setSelected} />
          {selected && <p className="desk-note">selected: {selected}</p>}
        </div>

        <div style={{ flex: '2 1 480px', minWidth: 360 }}>
          <div className="tag-row" role="tablist" aria-label="boards">
            {TABS.map((t) => (
              <button key={t.key} className="desk-btn" aria-pressed={panel === t.key} onClick={() => setPanel(t.key)}>
                <Term id={t.term} />
              </button>
            ))}
          </div>

          {panel === 'board' && <EvidenceBoard view={board} tags={tags} onAddTag={addTag} onRemoveTag={removeTag} />}
          {panel === 'codex' && <Codex rows={codexDetailView(log, world.intel.codex, STANDARD_RULES)} />}
          {panel === 'counter' && <CounterSketch view={counterSketchView(log, world.intel.cards)} />}
          {panel === 'web' && (
            <div>
              {webNpc && <button className="desk-btn" onClick={() => setWebNpc(null)}>← objective web</button>}
              <WebViewPanel web={web} onSelectNpc={setWebNpc} />
            </div>
          )}
          {panel === 'ledger' && (
            <div>
              <div className="tag-row"><span className="desk-note"><Term id="via" />:</span>
                {vias.map((v) => <button key={v} className="desk-btn" aria-pressed={ledgerVia === v} onClick={() => setLedgerVia(v)}>{v}</button>)}
              </div>
              <InformantLedger ledger={informantLedger(log, ledgerVia)} onSelectFamily={() => setPanel('board')} />
            </div>
          )}
          {panel === 'planner' && (
            <DayPlanner
              view={view} paused={speed === 0} clusterFamilies={clusterFamilies}
              net={net} coin={world.coin} economy={STANDARD_RULES.economy} onVerb={submitVerb} />
          )}
          {panel === 'network' && <Network view={net} />}
          {panel === 'treasury' && <Treasury coin={world.coin} stipendDay={stipendDay} economy={STANDARD_RULES.economy} />}
          {panel === 'report' && <EveningReport report={eveningReport(log, view.scenario?.day ?? dayOf(world.tick))} onOpenBoard={() => setPanel('board')} />}
          {panel === 'terms' && <TermsCodex />}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
