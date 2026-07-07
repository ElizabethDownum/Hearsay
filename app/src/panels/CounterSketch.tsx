import type { HypothesisCard } from '../../../src/intel/types';
import type { CounterSignal } from '../../../src/intel/countersketch';
import { Term } from './Term';

/**
 * The Counter-Sketch — your sketch of HIS sketch, folded from the same log the board reads (never
 * world.enemy). Task-8 upgrade: watch sightings get their own vermilion block — the countermeasure
 * you can SEE — separated from questioning/compelled-answer signals. Cards are player-authored and
 * never graded (pillar 6). Props-only.
 */
export function CounterSketch({ view }: { view: { signals: CounterSignal[]; cards: HypothesisCard[] } }) {
  const watch = view.signals.filter((s) => s.kind === 'watch');
  const other = view.signals.filter((s) => s.kind !== 'watch');
  return (
    <section className="panel">
      <h2><Term id="counter-sketch" /> <span className="desk-note">({view.signals.length} signal(s), {view.cards.length} card(s))</span></h2>

      <h3><Term id="watch" /> sightings</h3>
      {watch.length === 0 ? <p className="desk-note">No <Term id="watch" /> presence observed.</p> : (
        <ul>{watch.map((s, i) => (
          <li key={i}><span className="badge badge-danger">{s.key}</span> {s.detail}</li>
        ))}</ul>
      )}

      <h3>Other signals</h3>
      {other.length === 0 ? <p className="desk-note">No <Term id="inquiry" /> or compelled answers observed.</p> : (
        <ul>{other.map((s, i) => (
          <li key={i}>{s.kind === 'questioning' ? <Term id="interrogation" /> : s.kind} — {s.detail}</li>
        ))}</ul>
      )}

      <h3><Term id="hypothesis-card" />s</h3>
      {view.cards.length === 0 ? <p className="desk-note">No cards.</p> : (
        <ul>{view.cards.map((c) => (
          <li key={c.id}>{c.text} — <Term id="credence" /> {c.confidence} — created t{c.createdTick}</li>
        ))}</ul>
      )}
    </section>
  );
}
