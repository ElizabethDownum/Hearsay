import { applyTraits, type TraitContext } from './rumors/traits';
import type { Claim } from './rumors/claim';
import type { ReportedClaim } from './enemy/state';
import type { Npc, WorldState } from './types';
import type { Rules } from './rules';

function ctxOf(npc: Npc, world: WorldState): TraitContext {
  return {
    ownerId: npc.id, faction: npc.faction, rivals: npc.rivals,
    factionOf: (e) => world.npcs[e]?.faction ?? null,
  };
}

/**
 * What a claim sounds like after passing through the reporter's firmware — its traits get
 * their say before any consumer reads it. Pure. The one encoding of "reports lie": the
 * enemy's evidence capture and the player's informant feed both report THROUGH this.
 */
export function reportThrough(world: WorldState, reporterId: string, claim: Claim, rules: Rules): ReportedClaim {
  const reporter = world.npcs[reporterId]!;
  const traits = reporter.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const filtered = { ...claim, ...applyTraits(traits, claim, ctxOf(reporter, world)) };
  const { subject, predicate, object, count, severity, place, attribution } = filtered;
  return { subject, predicate, object, count, severity, place, attribution };
}
