import type { Tick } from '../core/time';
import { dayOf } from '../core/time';
import { applyInject } from './actions';
import { SOMEONE, type EntityId, type PredicateId, type RumorId } from './rumors/claim';
import { STANCE, stanceOf } from './rumors/propagation';
import type { Rules } from './rules';
import type { WorldState } from './types';

/** The story an NPC reaches for when spinning their own image: juiciest flattering predicate. */
export function counterSpinPredicate(rules: Rules): PredicateId | null {
  let best: PredicateId | null = null;
  let bestJuice = -1;
  for (const id of Object.keys(rules.predicates).sort()) {
    const p = rules.predicates[id]!;
    if (p.valence !== 'flattering') continue;
    if (p.juiciness > bestJuice) { best = id; bestJuice = p.juiciness; }
  }
  return best;
}

/**
 * Amendment #3 — "a rumor about you is bait: it pulls actions, not retellings."
 * Called after ingest whenever the ingested claim's subject IS the hearer.
 * Keyed by valence + stance; corroboration escalates investigate → counter-spin.
 */
export function reactToSelfRumor(
  world: WorldState, hearerId: EntityId, family: RumorId, t: Tick, rules: Rules,
): void {
  const belief = world.beliefs[hearerId]?.[family];
  if (!belief || belief.claim.subject !== hearerId) return;
  const stance = stanceOf(belief);
  if (stance === 'dismissed') return; // they never took it seriously
  const valence = rules.predicates[belief.claim.predicate]?.valence ?? 'neutral';

  if (valence === 'damaging') {
    if (belief.timesHeard === 1) {
      // Investigate: who is saying this? Asking-around is observable — this is the bait.
      const existing = (world.inquiries[hearerId] ?? []).some(
        (task) => 'family' in task.about && task.about.family === family,
      );
      if (!existing) {
        world.inquiries[hearerId] = [
          ...(world.inquiries[hearerId] ?? []),
          { about: { family }, from: 'self', expiresDay: dayOf(t) + 2, asked: [], answersHeard: 0 },
        ];
      }
      return;
    }
    // Corroborated and taken seriously: author the counter-story, once.
    if (!belief.counterSpun && (stance === 'repeating' || stance === 'believing')) {
      const predicate = counterSpinPredicate(rules);
      if (predicate === null) return; // a rules table with no flattery leaves no spin to author
      applyInject(world, hearerId, {
        subject: hearerId, predicate, object: null,
        count: null, severity: 3, place: null, attribution: SOMEONE,
      }, hearerId);
      belief.counterSpun = true;
    }
    return;
  }

  if (valence === 'flattering') {
    // Amplify: choosing to believe your own flattery makes it retellable.
    belief.credence = Math.max(belief.credence, STANCE.REPEAT);
  }
  // neutral: shrug.
}
