import { mintClaim, type Claim, type EntityId } from './rumors/claim';
import type { WorldState } from './types';

export interface InjectSpec {
  subject: Claim['subject'];
  predicate: Claim['predicate'];
  object: Claim['object'];
  count: Claim['count'];
  severity: Claim['severity'];
  place: Claim['place'];
  attribution: Claim['attribution'];
}

/** Player tells a rumor to one NPC. Hop zero — the town owns the rest. */
export function applyInject(
  world: WorldState, targetId: EntityId, spec: InjectSpec,
  by: 'player' | 'genesis' | EntityId = 'player',
): Claim {
  const store = world.beliefs[targetId];
  if (!store) throw new Error(`applyInject: unknown npc '${targetId}'`);
  const family = `f${world.claimCounter}`;
  const claim = mintClaim(world, { ...spec, family, parent: null });
  world.claims[claim.id] = claim;
  store[family] = {
    claim, credence: 0.85, heardFrom: 'injected', heardAt: world.tick,
    firstHeardAt: world.tick, timesHeard: 1, apparentSources: [],
    discretion: false, counterSpun: false,
  };
  world.chronicle.push({ kind: 'inject', tick: world.tick, target: targetId, claimId: claim.id, by });
  return claim;
}
