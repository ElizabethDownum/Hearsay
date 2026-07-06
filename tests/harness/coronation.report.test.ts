import { describe, expect, it } from 'vitest';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { attachScenario, councilTurns } from '../../src/sim/scenario/referee';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { bestConnected, bestConnectedAvoiding, type Bot } from '../../src/bots/archetypes';
import { applyAction } from '../../src/sim/campaign';
import { step } from '../../src/sim/step';
import { at, TICKS_PER_DAY } from '../../src/core/time';
import { SOMEONE, type EntityId } from '../../src/sim/rumors/claim';
import { CORONATION } from '../../src/content/scenarios/coronation';
import type { InjectSpec } from '../../src/sim/actions';
import type { Rules } from '../../src/sim/rules';
import type { WorldState } from '../../src/sim/types';

/**
 * Coronation MC observation report (report-style, npm run mc). Three usurper-damage archetypes
 * (patient / canny / blitz) over 3 procgen towns × 12 days, printing per-day turned-count and
 * exposure trajectories. NO threshold on the emergent numbers — this is the RETUNE BASELINE for
 * Plans 8/10's balance battery, not a pass/fail gate. Asserts only that every run completes.
 */

const OPTS = {
  knownTraitIds: Object.keys(STANDARD_RULES.traits),
  knownPredicateIds: Object.keys(STANDARD_RULES.predicates),
};

const poison = (subject: EntityId): InjectSpec => ({
  subject, predicate: 'poisoned', object: SOMEONE, count: null, severity: 5, place: null, attribution: SOMEONE,
});

const usurperOf = (world: WorldState): EntityId => world.scenario!.cast.usurper;

/** One morning whisper to the best-connected mind. */
const patientPoison: Bot = {
  name: 'patient-poison',
  decide(world, _rules, day) {
    if (day !== 0) return [];
    const target = bestConnected(world).find((id) => id !== world.playerId)!;
    return [{ tick: at(0, 8), kind: 'inject', target, spec: poison(usurperOf(world)) }];
  },
};

/** One morning whisper to the best-connected NON-gatekeeper mind. */
const cannyPoison: Bot = {
  name: 'canny-poison',
  decide(world, rules, day) {
    if (day !== 0) return [];
    const target = bestConnectedAvoiding(world, rules).find((id) => id !== world.playerId)!;
    return [{ tick: at(0, 8), kind: 'inject', target, spec: poison(usurperOf(world)) }];
  },
};

/** Three whispers to the three best-connected minds across day 0. */
const blitzPoison: Bot = {
  name: 'blitz-poison',
  decide(world, _rules, day) {
    if (day !== 0) return [];
    const targets = bestConnected(world).filter((id) => id !== world.playerId).slice(0, 3);
    const hours = [8, 12, 18] as const;
    return targets.map((target, i) => ({
      tick: at(0, hours[i]!), kind: 'inject' as const, target, spec: poison(usurperOf(world)),
    }));
  },
};

/** Drive a bot day by day over a scenario-attached world, sampling the referee each night. */
function driveWithSampling(
  world: WorldState, rules: Rules, bot: Bot, days: number,
): { turned: number[]; exposure: number[] } {
  const turned: number[] = [];
  const exposure: number[] = [];
  for (let day = 0; day < days; day++) {
    const dayEnd = (day + 1) * TICKS_PER_DAY;
    const actions = bot.decide(world, rules, day);
    let i = 0;
    while (world.tick < dayEnd) {
      while (i < actions.length && actions[i]!.tick === world.tick) { applyAction(world, actions[i]!); i += 1; }
      step(world, rules);
    }
    turned.push(councilTurns(world, rules).length);
    exposure.push(exposureStatus(world).score);
  }
  return { turned, exposure };
}

describe('Coronation MC observation report (npm run mc)', () => {
  const SEEDS = ['cor-mc-1', 'cor-mc-2', 'cor-mc-3'];
  const DAYS = 12;
  const BOTS = [patientPoison, cannyPoison, blitzPoison];

  it('runs the three usurper-damage archetypes over the seed batch and prints trajectories', { timeout: 30000 }, () => {
    let completed = 0;
    for (const bot of BOTS) {
      console.log(`\n=== ${bot.name} · ${SEEDS.length} seeds · ${DAYS} days · quorum ${CORONATION.win.quorum} ===`);
      for (const seed of SEEDS) {
        const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES, OPTS);
        const world = worldFromTown(town, seed);
        attachPlayer(world, town);
        attachScenario(world, town, CORONATION);

        const { turned, exposure } = driveWithSampling(world, STANDARD_RULES, bot, DAYS);
        const status = world.scenario!.status;
        console.log(`  ${seed} (${town.fixture.npcs.length} NPCs) → ${status}`);
        console.log(`    turned/day:   ${turned.join(' ')}`);
        console.log(`    exposure/day: ${exposure.join(' ')}`);

        expect(turned).toHaveLength(DAYS);
        expect(exposure).toHaveLength(DAYS);
        expect(world.scenario).not.toBeNull();
        completed += 1;
      }
    }
    // Only the run-completes invariant is asserted — the trajectories themselves are emergent.
    expect(completed).toBe(BOTS.length * SEEDS.length);
  });
});
