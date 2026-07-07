import { useState } from 'react';
import { TERMS } from '../../../src/content/terms';
import { Term } from './Term';

/** The game codex of terms (amendment #5c): every registered label with its meaning, grouped by
 *  prefix, filterable by label substring. Props-less — it reads the TERMS registry (pure content)
 *  directly, the same registry <Term> validates every player-facing label against. */
const GROUP = (id: string): string => {
  const pre = id.split('-')[0]!;
  return pre === 'predicate' || pre === 'trait' || pre === 'vignette' ? pre : 'general';
};
const ORDER = ['general', 'predicate', 'trait', 'vignette'];

export function TermsCodex() {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const all = Object.values(TERMS).filter((t) => t.label.toLowerCase().includes(needle));
  return (
    <section className="panel">
      <h2><Term id="terms-codex" /></h2>
      <input className="desk-btn" placeholder="filter by label…" aria-label="filter terms by label"
        value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="desk-note">{all.length} of {Object.keys(TERMS).length} terms</p>
      {ORDER.map((group) => {
        const rows = all.filter((t) => GROUP(t.id) === group).sort((a, b) => a.label.localeCompare(b.label));
        if (rows.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="small-caps">{group}</h3>
            <table className="board-table">
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}><td><Term id={t.id} /></td><td>{t.short}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}
