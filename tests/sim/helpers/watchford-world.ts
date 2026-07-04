import { buildWorld, buildTownMap } from '../../../src/sim/world';
import { WATCHFORD, WATCHFORD_GUARDS } from '../../../src/content/fixtures/watchford';

/**
 * A Watchford world wired up with its two enemy observers (gale, hugo) and the
 * street-knowledge map. The one testbed for the counterintel/enemy-AI suites —
 * extracted so counterintel and the Task-9 integration tests share one builder.
 */
export function watchfordWorld(seed: string): ReturnType<typeof buildWorld> {
  const world = buildWorld(WATCHFORD, seed);
  world.enemy.observers = WATCHFORD_GUARDS.map((g) => ({ ...g }));
  world.enemy.map = buildTownMap(WATCHFORD);
  return world;
}
