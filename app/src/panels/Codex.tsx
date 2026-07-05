/** Codex hypotheses with corroboration counts; locks at three confirms (spec). Props-only. */
type CodexRow = { npc: string; trait: string; hits: number; locked: boolean };

export function Codex({ rows }: { rows: CodexRow[] }) {
  return (
    <section>
      <h2>Codex <small>({rows.length} hypothes{rows.length === 1 ? 'is' : 'es'})</small></h2>
      {rows.length === 0 ? (
        <p>No codex hypotheses yet — propose (npc, trait) guesses; three corroborations lock one.</p>
      ) : (
        <table>
          <thead><tr><th>npc</th><th>trait</th><th>hits</th><th>state</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.npc}:${r.trait}`}>
                <td>{r.npc}</td><td>{r.trait}</td><td>{r.hits}</td>
                <td>{r.locked ? '🔒 locked' : `${3 - r.hits} to lock`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
