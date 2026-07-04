import { observationsFor, type TickEvents } from './perception';
import { juiciness } from './rumors/propagation';
import { applyTraits, type TraitContext } from './rumors/traits';
import type { Rules } from './rules';
import type { ReportedClaim } from './enemy/state';
import type { Npc, WorldState } from './types';
import type { Claim } from './rumors/claim';

function traitContext(npc: Npc, world: WorldState): TraitContext {
  return {
    ownerId: npc.id, faction: npc.faction, rivals: npc.rivals,
    factionOf: (e) => world.npcs[e]?.faction ?? null,
  };
}

/** The observer's report of a claim — their traits get their say before the spymaster reads it. */
function reportOf(world: WorldState, observer: Npc, claim: Claim, rules: Rules): ReportedClaim {
  const traits = observer.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const filtered = { ...claim, ...applyTraits(traits, claim, traitContext(observer, world)) };
  const { subject, predicate, object, count, severity, place, attribution } = filtered;
  return { subject, predicate, object, count, severity, place, attribution };
}

/**
 * The enemy's ONLY sensory input. Reads observers' feeds (never world state directly),
 * applies the vigilance rule, and appends to the evidence log the digest will consume.
 */
export function captureEvidence(world: WorldState, events: TickEvents, rules: Rules): void {
  for (const spec of world.enemy.observers) {
    const observer = world.npcs[spec.id];
    if (!observer) continue;
    const feed = observationsFor(spec.id, events);
    for (const obs of feed.observations) {
      if (obs.kind === 'utterance') {
        const noticed = !obs.overheard || juiciness(obs.claim, rules) >= 1 - spec.vigilance;
        if (!noticed) continue;
        world.enemy.evidence.push({
          tick: obs.tick, venue: obs.venue, observer: spec.id, overheard: obs.overheard,
          speaker: obs.speaker, addressedTo: obs.addressedTo, kind: 'utterance', mode: obs.mode,
          claimId: obs.claim.id, family: obs.claim.family,
          reported: reportOf(world, observer, obs.claim, rules), about: null,
        });
      } else if (obs.kind === 'asking') {
        world.enemy.evidence.push({
          tick: obs.tick, venue: obs.venue, observer: spec.id, overheard: obs.overheard,
          speaker: obs.speaker, addressedTo: obs.addressedTo, kind: 'asking', mode: null,
          claimId: null, family: 'family' in obs.about ? obs.about.family : null,
          reported: null, about: obs.about,
        });
      }
    }
  }
}
