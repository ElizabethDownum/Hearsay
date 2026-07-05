import type { AssistLevel } from '../../../src/intel/types';

/** The spec's four assist levels (0 raw → 3 route sketch), model-gated. Props-only. */
const LEVELS: { level: AssistLevel; label: string }[] = [
  { level: 0, label: '0 · raw notes' },
  { level: 1, label: '1 · clustering + diffs' },
  { level: 2, label: '2 · + trait candidates' },
  { level: 3, label: '3 · + route sketch' },
];

export function AssistPicker({ level, onChange }: { level: AssistLevel; onChange: (level: AssistLevel) => void }) {
  return (
    <fieldset style={{ margin: '16px 0' }}>
      <legend>Assist level</legend>
      {LEVELS.map((l) => (
        <label key={l.level} style={{ marginRight: 12 }}>
          <input type="radio" name="assist" checked={level === l.level} onChange={() => onChange(l.level)} />{' '}
          {l.label}
        </label>
      ))}
    </fieldset>
  );
}
