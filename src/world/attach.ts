import { SOMEONE, mintClaim } from '../sim/rumors/claim';
import { buildTownMap, buildWorld } from '../sim/world';
import type { WorldState } from '../sim/types';
import type { GeneratedTown } from './types';

/** Build a live world from a generated town: enemy roster + map wired, secret witnesses seeded. */
export function worldFromTown(town: GeneratedTown, seed: string): WorldState {
  const world = buildWorld(town.fixture, seed);
  world.enemy.observers = town.guards.map((g) => ({ ...g }));
  world.enemy.map = buildTownMap(town.fixture);
  for (const secret of [...town.secrets].sort((a, b) => a.id.localeCompare(b.id))) {
    const claim = mintClaim(world, {
      family: secret.id, parent: null, subject: secret.subject, predicate: secret.predicate,
      object: secret.object, count: null, severity: secret.severity, place: secret.place,
      attribution: SOMEONE,
    });
    world.claims[claim.id] = claim;
    for (const witness of secret.witnesses) {
      world.beliefs[witness]![secret.id] = {
        claim, credence: 0.95, heardFrom: 'witnessed', heardAt: 0, firstHeardAt: 0,
        timesHeard: 1, apparentSources: [], discretion: true, counterSpun: false,
      };
      world.chronicle.push({ kind: 'inject', tick: 0, target: witness, claimId: claim.id, by: 'genesis' });
    }
  }
  return world;
}
