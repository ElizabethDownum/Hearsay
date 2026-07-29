import { UI_GLYPHS } from '../assets';
import { dayOf, minuteOfDay } from '../../../src/core/time';
import type { NetworkView, RecruitmentHistoryRow } from '../townview';
import { Term } from './Term';

/**
 * The roster panel (Plan 8 Task 11) — your assets at a glance. Props-only: its ONLY feed is
 * `networkView(world)`, the epistemic selector that exposes player-known bookkeeping and nothing more.
 * Trust is NEVER shown directly (it isn't the player's to read); the verdigris bar is derived from
 * `strikes` alone — your own bookkeeping — and paired with a strike glyph so the meaning survives with
 * colour stripped (art-direction: never colour alone). The panel never reads the turncoat flip flag —
 * it can't, the flag isn't in its props; the way you catch a turncoat is by cross-checking channels,
 * never a roster tell. That habit is spelled out in the footnote.
 */
export function Network({ view, history }: { view: NetworkView; history: readonly RecruitmentHistoryRow[] }) {
  return (
    <section className="panel">
      <h2><Term id="network" /></h2>
      {view.assets.length === 0
        ? <p className="desk-note">No assets on your roster yet — <Term id="verb-recruit" /> someone in your circle.</p>
        : (
          <table className="board-table">
            <thead>
              <tr>
                <th>asset</th>
                <th><Term id="recruit" /></th>
                <th><Term id="standing" /></th>
                <th><Term id="wage" /></th>
                <th><Term id="compartment" /></th>
                <th>Requested post</th>
              </tr>
            </thead>
            <tbody>
              {view.assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.mice
                    ? <Term id={`mice-${a.mice}`} />
                    : <span className="desk-note"><Term id="dossier" /></span>}</td>
                  <td><DispositionBar value={a.dispositionBar} strikes={a.strikes} /></td>
                  <td>paid to day {a.wagePaidThroughDay}</td>
                  <td>{a.factsCount}</td>
                  <td>{a.requestedVenue ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      <p className="desk-note">
        A post is what you ASKED for. Whether they took it up is theirs to decide and yours to find out.
      </p>
      {view.drops.length > 0 && (
        <>
          <h3>{UI_GLYPHS['dead-drop']} <Term id="dead-drop" /></h3>
          <ul>{view.drops.map((d) => <li key={d.id}>{d.id} @ {d.venue}</li>)}</ul>
        </>
      )}
      <ApproachHistory history={history} />
      <p className="desk-note">
        Trust itself is never shown — the bar reads only your own bookkeeping. Watch for a{' '}
        <Term id="turncoat" />: cross-check one channel against another to catch it.
      </p>
    </section>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmtTick = (t: number) => `day ${dayOf(t)} · ${pad(Math.floor(minuteOfDay(t) / 60))}:${pad(minuteOfDay(t) % 60)}`;

/**
 * The PUBLIC approach history (Plan 11): every approach and every answer that lawfully reached the
 * player — through their own presence, or a channel that physically carried it. `recruitmentHistoryView`
 * structurally cannot hand over a reason, an eligibility grade, a protected role, or an enemy link,
 * so this table has nothing to decorate with. An answer is one of exactly three words; a hesitation
 * says "asks for time", because that is all anybody in the room actually saw.
 */
function ApproachHistory({ history }: { history: readonly RecruitmentHistoryRow[] }) {
  if (history.length === 0) return null;
  const said = (response: RecruitmentHistoryRow['response']): string =>
    response === 'accept' ? 'accepted' : response === 'refuse' ? 'refused it' : 'asks for time';
  return (
    <>
      <h3><Term id="recruit" /> · approaches</h3>
      <table className="board-table">
        <thead>
          <tr><th>when</th><th><Term id="circle" /></th><th>who</th><th>what was said</th><th><Term id="via" /></th></tr>
        </thead>
        <tbody>
          {history.map((row, index) => (
            <tr key={index}>
              <td>{fmtTick(row.tick)}</td>
              <td>{row.venue}</td>
              <td>{row.target}</td>
              <td>{row.stage === 'approach' ? 'was approached' : said(row.response)}</td>
              <td>{row.via}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** A verdigris standing bar (fill width = the strike-derived proxy) plus a strike glyph — colour is
 *  never the only channel. Values reference the theme's --verdigris / --sepia tokens, never raw hex. */
function DispositionBar({ value, strikes }: { value: number; strikes: number }) {
  const pct = Math.round(value * 100);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
      title={`${pct}% (${strikes} strike${strikes === 1 ? '' : 's'})`}>
      <span aria-hidden="true"
        style={{ display: 'inline-block', width: 64, height: 8, border: '1px solid var(--sepia)', position: 'relative' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--verdigris)' }} />
      </span>
      <span className="desk-note">{strikes > 0 ? `${strikes}✗` : '✓'}</span>
    </span>
  );
}
