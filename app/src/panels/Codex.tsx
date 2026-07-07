import { useState } from 'react';
import { Term } from './Term';

/** One observed corroboration, enriched (in the composition root) with the via each half reached
 *  you through — the provenance pair the C-decision obligation demands be visible. */
export type CodexPair = { family: string; viaFrom: string; viaTo: string; changeCount: number };
/** A codex hypothesis with its corroborations AND their provenance. `singleChannelVia` is set when
 *  EVERY pair rests on one informant channel — the lock is then single-source and gets the badge. */
export type CodexDetailRow = {
  npc: string; trait: string; hits: number; locked: boolean;
  pairs: CodexPair[]; singleChannelVia: string | null;
};

/**
 * The Codex — trait deductions, locked at three corroborations. Task-8 obligation (provenance
 * visible): the detail view lists EVERY corroborating pair with its via pair (`self→gale`), and a
 * vermilion single-channel-lock badge when a lock rests entirely on one informant's reports. That
 * badge is the price Ellie set for corruptible-by-design intel: fragility readable at a glance.
 */
export function Codex({ rows }: { rows: CodexDetailRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const key = (r: CodexDetailRow) => `${r.npc}:${r.trait}`;
  const shown = rows.find((r) => key(r) === open) ?? null;
  return (
    <section className="panel">
      <h2><Term id="codex" /> <span className="desk-note">({rows.length} hypothes{rows.length === 1 ? 'is' : 'es'})</span></h2>
      {rows.length === 0 ? (
        <p className="desk-note">No hypotheses yet — propose (npc, <Term id="fingerprint" />) guesses; three corroborations <Term id="lock" />.</p>
      ) : (
        <table className="board-table">
          <thead><tr><th>npc</th><th>trait</th><th>hits</th><th>state</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={key(r)}>
                <td><button className="desk-btn" onClick={() => setOpen(open === key(r) ? null : key(r))}>{r.npc}</button></td>
                <td><Term id={`trait-${r.trait}`} /></td>
                <td>{r.hits}</td>
                <td>
                  {r.locked ? <span className="badge badge-lock"><Term id="lock" /></span> : `${Math.max(0, 3 - r.hits)} to lock`}
                  {r.singleChannelVia && <span className="badge badge-danger" title="single-channel lock"> single-channel — rests entirely on {r.singleChannelVia}&apos;s reports</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {shown && <Pairs row={shown} />}
    </section>
  );
}

function Pairs({ row }: { row: CodexDetailRow }) {
  return (
    <div>
      <h3>{row.npc} · <Term id={`trait-${row.trait}`} /> — <Term id="corroboration" /> pairs</h3>
      {row.pairs.length === 0 ? <p className="desk-note">No observed receive→emit pairs yet.</p> : (
        <ul>{row.pairs.map((p, i) => (
          <li key={i}>
            {p.family}: <span className="badge badge-via">{p.viaFrom}</span>→<span className="badge badge-via">{p.viaTo}</span>
            {' '}<span className="desk-note">({p.changeCount} field change(s))</span>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
