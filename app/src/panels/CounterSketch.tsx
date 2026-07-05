import type { HypothesisCard } from '../../../src/intel/types';
import type { CounterSignal } from '../../../src/intel/countersketch';

/** Counter-intel: folded signals + the player's own (never-graded) cards. Props-only. */
export function CounterSketch({ view }: { view: { signals: CounterSignal[]; cards: HypothesisCard[] } }) {
  return (
    <section>
      <h2>Counter-Sketch <small>({view.signals.length} signal(s), {view.cards.length} card(s))</small></h2>
      <h3>Signals</h3>
      {view.signals.length === 0 ? <p>No counter-signals — no watch, questioning, or compelled answers observed.</p> : (
        <ul>{view.signals.map((s, i) => (
          <li key={i}>{s.kind} — {s.key} — {s.detail} — {s.entryIndexes.length} sighting(s)</li>
        ))}</ul>
      )}
      <h3>Cards</h3>
      {view.cards.length === 0 ? <p>No hypothesis cards.</p> : (
        <ul>{view.cards.map((c) => (
          <li key={c.id}>{c.text} — confidence {c.confidence} — created t{c.createdTick}</li>
        ))}</ul>
      )}
    </section>
  );
}
