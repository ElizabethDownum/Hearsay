import type { LedgerView } from '../../../src/intel/ledger';
import { Term } from './Term';

/**
 * One channel's ledger (amendment #4): everything a single `via` ever reported, plus the passive
 * informant-audit surface — which of its stories OTHER channels also carried ("also reported by").
 * A single-source story stands alone here; a corroborated one names its cross-checks, so a lying
 * informant is caught by daylight, not omniscience. Props-only: `informantLedger` is a pure fold.
 */
export function InformantLedger({ ledger, onSelectFamily }: { ledger: LedgerView; onSelectFamily(f: string): void }) {
  return (
    <section className="panel">
      <h2><Term id="ledger" /></h2>
      <p><Term id="via" />: <b>{ledger.via}</b> · {ledger.rows.length} report(s)</p>
      {ledger.rows.length === 0 ? <p className="desk-note">This channel has filed nothing.</p> : (
        <table className="board-table">
          <thead><tr><th>tick</th><th>kind</th><th><Term id="family" /></th><th>summary</th></tr></thead>
          <tbody>
            {ledger.rows.map((r) => (
              <tr key={r.entryIndex}>
                <td>{r.tick}</td><td>{r.kind}</td>
                <td>{r.family ? <button className="desk-btn" onClick={() => onSelectFamily(r.family!)}>{r.family}</button> : '—'}</td>
                <td>{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3><Term id="corroboration" /> · cross-check</h3>
      {ledger.corroboratedElsewhere.length === 0
        ? <p className="desk-note">Nothing this channel carried was heard through any other channel — single-source, all of it.</p>
        : (
          <ul>
            {ledger.corroboratedElsewhere.map((c) => (
              <li key={c.family}>
                <button className="desk-btn" onClick={() => onSelectFamily(c.family)}>{c.family}</button>
                {' '}also reported by — {c.otherVias.map((v) => <span key={v} className="badge badge-via">{v}</span>)}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
