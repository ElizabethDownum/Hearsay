import { generateValidTown } from '../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../src/world/attach';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { step } from '../../src/sim/step';
import { enemyDigest, pressureFor } from '../../src/sim/enemy/digest';
import { exposureStatus } from '../../src/sim/scenario/exposure';
import { TICKS_PER_DAY, dayOf, minuteOfDay } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { Rules } from '../../src/sim/rules';
import type { WorldState } from '../../src/sim/types';

/**
 * Task 10 exposure-escalation MC observation report (report-style, npm run mc — the plan's
 * mandated "MC-measured before/after", the retune baseline for Plan 10, mirroring P6-T8's watch
 * table). NO threshold on the emergent numbers (silent-cap law): this measures where the real
 * mechanic lands, it does not gate on it.
 *
 * "Before/after" here means: at every nightly beat, the SAME evidence (world.enemy at that
 * instant, pre-digest — the digest is a pure fold, so calling it twice is side-effect-free) is
 * folded TWICE — once with pressure FORCED to 0 (the pre-Task-10 shadow: what the cap-1-always
 * digest would have ordered) and once for real, through the actual `step()` nightly beat (which
 * now threads `pressureFor(exposureStatus(world).score)` into the digest). The delta between the
 * shadow and the real decision isolates the pressure mechanic's own marginal effect — cleanly
 * separate from the Task-7 budget spend, which runs identically in both (an orthogonal, pressure-
 * blind mechanic already measured by tests/harness/digest-cost.report.test.ts's neighbor).
 *
 * Provocation: the player's OWN dossier informants are handed the SAME juicy, vague, plantable
 * story blitzCrier already uses against the town (subject SOMEONE, `stole`, severity 5,
 * attribution SOMEONE — CANON's own shape, archetypes.ts) — informants, not the best-connected
 * townsfolk, because `exposureStatus` only ever counts sketch features whose subject is the
 * avatar or an INFORMANT ("mine"); a generic blitz campaign against strangers can legitimately
 * never move the score at all (as the neighboring coronation.report.test.ts's own trajectories
 * show: exposure/day stays 0 throughout, because that provocation targets the usurper, never the
 * player's own people).
 */

const OPTS = {
  knownTraitIds: Object.keys(STANDARD_RULES.traits),
  knownPredicateIds: Object.keys(STANDARD_RULES.predicates),
};

const CANON_AT_INFORMANTS = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 5 as const, place: null, attribution: SOMEONE,
};

/** Hand every dossier informant the SAME hot story at world-gen tick 0 — the hop-zero the enemy's
 *  origin-vague/carrier-profile heuristics key off of, IF an informant is later asked and answers
 *  vaguely (their own real physics — no staging past this single day-0 plant). */
function provokeInformants(world: WorldState): void {
  for (const inf of world.intel.informants) {
    applyInject(world, inf.id, CANON_AT_INFORMANTS);
  }
}

interface DayRow {
  day: number;
  score: number;      // exposureStatus(world).score, READ BEFORE tonight's digest
  pressure: 0 | 1 | 2;
  realInterr: number; realWatch: number;   // the REAL nightly decision (pressure threaded in)
  shadowInterr: number; shadowWatch: number; // the SAME evidence, pressure forced to 0
}

/** Drive one world tick-by-tick; at every nightly beat, fold the SAME (pre-digest) evidence
 *  through a pressure-0 shadow call BEFORE the real step() consumes the tick for real. */
function driveWithShadow(world: WorldState, rules: Rules, days: number): DayRow[] {
  const rows: DayRow[] = [];
  const totalTicks = days * TICKS_PER_DAY;
  while (world.tick < totalTicks) {
    if (minuteOfDay(world.tick) === 1439 && world.enemy.observers.length > 0) {
      const day = dayOf(world.tick);
      const score = exposureStatus(world).score;
      const pressure = pressureFor(score);
      const shadow = enemyDigest(world.enemy, day, rules, 0); // side-effect-free (digest purity)
      step(world, rules);
      const real = world.enemy.decisions.at(-1)!;
      rows.push({
        day, score, pressure,
        realInterr: real.interrogations.length, realWatch: real.watches.length,
        shadowInterr: shadow.interrogations.length, shadowWatch: shadow.watches.length,
      });
    } else {
      step(world, rules);
    }
  }
  return rows;
}

describe('exposure escalation — before/after pressure MC observation (npm run mc)', () => {
  const SEEDS = ['pr-mc-1', 'pr-mc-2', 'pr-mc-3', 'pr-mc-4', 'pr-mc-5'];
  const DAYS = 20;

  it('runs a day-0 informant provocation over the seed batch and prints score/pressure/order trajectories',
    { timeout: 30000 }, () => {
      let maxScoreSeen = 0;
      let maxPressureSeen: 0 | 1 | 2 = 0;
      let interrDelta = 0; // real - shadow, summed — the mechanic's total marginal order count
      let watchDelta = 0;
      let daysAtP1 = 0;
      let daysAtP2 = 0;
      let totalDays = 0;

      for (const seed of SEEDS) {
        const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES, OPTS);
        const world = worldFromTown(town, seed, STANDARD_RULES);
        attachPlayer(world, town);
        provokeInformants(world);

        const rows = driveWithShadow(world, STANDARD_RULES, DAYS);

        console.log(`\n=== ${seed} · ${town.fixture.npcs.length} NPCs · ${world.intel.informants.length} informants provoked · ${DAYS} days ===`);
        console.log(`${'day'.padEnd(5)}${'score'.padEnd(7)}${'pressure'.padEnd(10)}${'interr(real/shadow)'.padEnd(22)}${'watch(real/shadow)'.padEnd(20)}`);
        for (const r of rows) {
          console.log(`${String(r.day).padEnd(5)}${String(r.score).padEnd(7)}${String(r.pressure).padEnd(10)}`
            + `${`${r.realInterr}/${r.shadowInterr}`.padEnd(22)}${`${r.realWatch}/${r.shadowWatch}`.padEnd(20)}`);
        }

        for (const r of rows) {
          maxScoreSeen = Math.max(maxScoreSeen, r.score);
          maxPressureSeen = Math.max(maxPressureSeen, r.pressure) as 0 | 1 | 2;
          interrDelta += r.realInterr - r.shadowInterr;
          watchDelta += r.realWatch - r.shadowWatch;
          if (r.pressure === 1) daysAtP1 += 1;
          if (r.pressure === 2) daysAtP2 += 1;
          totalDays += 1;
        }

        expect(rows.length).toBeGreaterThan(0);
        expect(world.enemy.observers.length).toBeGreaterThan(0); // provocation ran against a live enemy
      }

      console.log(`\n=== retune baseline summary — ${SEEDS.length} seeds x ${DAYS} days (${totalDays} enemy-nights) ===`);
      console.log(`max score reached:      ${maxScoreSeen}`);
      console.log(`max pressure reached:   ${maxPressureSeen}`);
      console.log(`nights at pressure 1:   ${daysAtP1} / ${totalDays}`);
      console.log(`nights at pressure 2:   ${daysAtP2} / ${totalDays}`);
      console.log(`total extra interrogations (real - shadow), summed across all nights: ${interrDelta}`);
      console.log(`total extra watches (real - shadow), summed across all nights:        ${watchDelta}`);
      console.log(maxPressureSeen === 0
        ? 'VERDICT: pressure never engaged in this batch — v1 asset/watch density rarely exposes the ' +
          'player\'s own informants this way; P10 should read this as a balance signal, not a bug ' +
          '(the CAP MACHINERY is proven correct at the unit/integration level regardless — see ' +
          'tests/sim/enemy-pressure.test.ts).'
        : `VERDICT: pressure engaged (up to tier ${maxPressureSeen}) under this provocation — the retune ` +
          'baseline for Plan 10 is the trajectories printed above.');

      // Report-style: no threshold on the emergent numbers. Assert only that the machinery ran on
      // a live enemy roster across every seed (else there is nothing to observe against).
      expect(totalDays).toBeGreaterThan(0);
      expect(maxScoreSeen).toBeGreaterThanOrEqual(0);
    });
});
