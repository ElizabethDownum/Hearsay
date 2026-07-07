import { useState, type ReactNode } from 'react';
import { TERMS } from '../../../src/content/terms';

/**
 * The no-unregistered-jargon law (amendment #5c) made runtime-loud: every player-facing label
 * renders through <Term> with a REGISTERED id, or this throws. `src/content/terms` is pure content
 * data — the panels-law fence and the composition-root fence both ban only the engine trees
 * (sim/world/bots/harness), never content — so this direct import is the lint-clean route the brief
 * authorizes (documented in the task report). Children omitted ⇒ the canonical registered label
 * renders, so any label-text scan sees the text came straight from the registry.
 *
 * (Faithful to the brief's complete code, save one type fix: `ReactNode` is imported by name rather
 * than reached through a `React.` namespace that `import { useState }` never binds.)
 */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = TERMS[id];
  if (!t) throw new Error(`unregistered term '${id}'`); // the law, at runtime, loudly
  return (
    <span
      className="term"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children ?? t.label}
      {open && <span role="tooltip" className="term-tip">{t.short}</span>}
    </span>
  );
}
