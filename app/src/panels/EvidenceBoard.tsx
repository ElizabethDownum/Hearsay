import type { BoardView, Cluster, TagNote } from '../../../src/intel/types';
import { useState } from 'react';
import { Term } from './Term';
import { TagChip } from './TagChip';

/** The seven claim fields the cluster-detail table renders as `<Term id={f} />` row headers.
 *  Exported so the jargon scan (tests/app/jargon.test.ts) can sweep them registry-style — these ids
 *  reach <Term> by ITERATION, not as string literals in JSX, so the literal scan alone never sees
 *  them (renaming one of the seven TERMS entries would otherwise throw at runtime with no failing test). */
export const FIELDS = ['subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution'] as const;

/**
 * The Evidence Board — the broadsheet that auto-collects what you lawfully heard. Task-8 upgrades:
 * every row/cluster wears its `via` badge(s) (provenance visible, the C-decision obligation) and a
 * verdigris TagChip composer (margin notes). Props-only: the composition root passes the folded
 * BoardView plus the tags + tag verbs (tags are sim-blind by law, so they only ride the UI).
 */
export function EvidenceBoard({
  view, tags, onAddTag, onRemoveTag,
}: { view: BoardView; tags: TagNote[]; onAddTag(target: string, text: string): void; onRemoveTag(id: string): void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const clusters = view.clusters ?? [];
  const cluster = clusters.find((c) => c.family === selected) ?? null;
  const viasOf = (entryIndexes: number[]) => [...new Set(entryIndexes.map((i) => view.entries[i]!.via))].sort();
  return (
    <section className="panel">
      <h2><Term id="evidence-board" /> <span className="desk-note">(<Term id="assist-level" /> {view.level}; {view.entries.length} entries)</span></h2>
      {view.clusters === null ? <RawNotes view={view} /> : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <ul>
            {clusters.map((c) => (
              <li key={c.family}>
                <button className="desk-btn" onClick={() => setSelected(c.family)}>
                  {c.family} — {c.versions.length} <Term id="version" />(s)
                </button>
                {' '}{viasOf(c.entryIndexes).map((v) => <span key={v} className="badge badge-via">{v}</span>)}
                {view.suggestions?.[c.family]?.length ? <span className="desk-note"> · candidates: {view.suggestions[c.family]!.join(', ')}</span> : ''}
                <TagChip tags={tags} target={`cluster:${c.family}`} onAdd={(t) => onAddTag(`cluster:${c.family}`, t)} onRemove={onRemoveTag} />
              </li>
            ))}
          </ul>
          {cluster && <ClusterDetail cluster={cluster} view={view} />}
        </div>
      )}
    </section>
  );
}

function RawNotes({ view }: { view: BoardView }) {
  return <ol>{view.entries.map((e, i) => (
    <li key={i}>
      t{e.tick} {e.kind} @{e.venue} <span className="badge badge-via"><Term id="via" /> {e.via}</span>
      {e.reported ? ` — "${e.reported.subject} ${e.reported.predicate}"` : ''}
    </li>
  ))}</ol>;
}

function ClusterDetail({ cluster, view }: { cluster: Cluster; view: BoardView }) {
  const diffs = view.diffs?.[cluster.family] ?? [];
  const changedByVersion = new Map<number, Set<string>>();
  for (const d of diffs) changedByVersion.set(d.toVersion, new Set(d.changes.map((c) => c.field)));
  return (
    <div>
      <h3>{cluster.family}</h3>
      <table className="board-table"><thead><tr><th>field</th>{cluster.versions.map((_, i) => <th key={i}>v{i}</th>)}</tr></thead>
        <tbody>{FIELDS.map((f) => (
          <tr key={f}><td><Term id={f} /></td>{cluster.versions.map((v, i) => (
            <td key={i} className={changedByVersion.get(i)?.has(f) ? 'diff-cell' : undefined}>
              {String(v.reported[f])}
            </td>))}
          </tr>))}
        </tbody></table>
      {view.routes?.[cluster.family] && (
        <ol>{view.routes[cluster.family]!.map((h, i) => (
          <li key={i}>t{h.tick}: {h.speaker} → {h.addressedTo} @{h.venue} <span className="badge badge-via"><Term id="via" /> {h.via}</span></li>))}
        </ol>)}
    </div>
  );
}
