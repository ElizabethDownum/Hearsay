import type { BoardView, Cluster } from '../../../src/intel/types';
import { useState } from 'react';

const FIELDS = ['subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution'] as const;

export function EvidenceBoard({ view }: { view: BoardView }) {
  const [selected, setSelected] = useState<string | null>(null);
  const clusters = view.clusters ?? [];
  const cluster = clusters.find((c) => c.family === selected) ?? null;
  return (
    <section>
      <h2>Evidence Board <small>(assist {view.level}; {view.entries.length} entries)</small></h2>
      {view.clusters === null ? <RawNotes view={view} /> : (
        <div style={{ display: 'flex', gap: 16 }}>
          <ul>
            {clusters.map((c) => (
              <li key={c.family}>
                <button onClick={() => setSelected(c.family)}>
                  {c.family} — {c.versions.length} version(s)
                  {view.suggestions?.[c.family]?.length ? ` · candidates: ${view.suggestions[c.family]!.join(', ')}` : ''}
                </button>
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
    <li key={i}>t{e.tick} {e.kind} @{e.venue} via {e.via}{e.reported ? ` — "${e.reported.subject} ${e.reported.predicate}"` : ''}</li>
  ))}</ol>;
}

function ClusterDetail({ cluster, view }: { cluster: Cluster; view: BoardView }) {
  const diffs = view.diffs?.[cluster.family] ?? [];
  const changedByVersion = new Map<number, Set<string>>();
  for (const d of diffs) {
    changedByVersion.set(d.toVersion, new Set(d.changes.map((c) => c.field)));
  }
  return (
    <div>
      <h3>{cluster.family}</h3>
      <table><thead><tr><th>field</th>{cluster.versions.map((_, i) => <th key={i}>v{i}</th>)}</tr></thead>
        <tbody>{FIELDS.map((f) => (
          <tr key={f}><td>{f}</td>{cluster.versions.map((v, i) => (
            <td key={i} style={changedByVersion.get(i)?.has(f) ? { background: '#ffe9a8', fontWeight: 600 } : {}}>
              {String(v.reported[f])}
            </td>))}
          </tr>))}
        </tbody></table>
      {view.routes?.[cluster.family] && (
        <ol>{view.routes[cluster.family]!.map((h, i) => (
          <li key={i}>t{h.tick}: {h.speaker} → {h.addressedTo} @{h.venue} (via {h.via})</li>))}
        </ol>)}
    </div>
  );
}
