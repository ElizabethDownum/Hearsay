import { minuteOfDay, type Tick } from '../../../src/core/time';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../../src/content/gen/standard';
import { STANDARD_RULES } from '../../../src/content/rules';
import { CORONATION } from '../../../src/content/scenarios/coronation';
import { generateValidTown } from '../../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../../src/world/attach';
import { attachScenario } from '../../../src/sim/scenario/referee';
import { applyAction, runLogOn, type Action } from '../../../src/sim/campaign';
import { CONVERSATION_BEAT } from '../../../src/sim/rumors/propagation';
import { step } from '../../../src/sim/step';
import type { WorldState } from '../../../src/sim/types';

/**
 * The campaign as seed + log — so the browser game IS a save file (DOM-free: testable in vitest,
 * no React). `submit` queues a verb for its next legal tick; `advance` steps N ticks, applying the
 * queue exactly as `runLogOn` does (apply-at-tick, in queue order, THEN step). A fresh `loadSession`
 * of the saved log replays byte-identically — the plan's load-bearing invariant.
 */
export interface Session {
  readonly seed: string;
  readonly world: WorldState;
  readonly log: Action[];
  /** Queue a verb for the next legal tick (beat-aligned for tell/ask; next tick otherwise). */
  submit(intent: ActionIntent): { queuedFor: Tick };
  /** Step N ticks, applying queued actions runLogOn-style (apply-at-tick, then step). Halts at a terminal status. */
  advance(ticks: number): void;
  save(): { seed: string; log: Action[] };
}

/**
 * An Action minus its `tick` — computed by `submit`, not supplied by the caller. Distributive so
 * each variant keeps its own discriminated shape; a plain `Omit<Action, 'tick'>` over a union
 * collapses to just `{ kind }` and would reject `venue`, `to`, `spec`, … as excess properties.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ActionIntent = DistributiveOmit<Action, 'tick'>;

/** The proven Coronation staging pipeline (coronation.e2e buildFull): serve → world → avatar → referee. */
function stageWorld(seed: string): WorldState {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  // Composition root: pass rules so live campaigns start at STANDARD_ECONOMY.startingCoin (20).
  const world = worldFromTown(town, seed, STANDARD_RULES);
  attachPlayer(world, town);
  attachScenario(world, town, CORONATION);
  return world;
}

/** True once the campaign has resolved — any status that is not 'running' (won / lost-*). */
function isTerminal(world: WorldState): boolean {
  return world.scenario !== null && world.scenario.status !== 'running';
}

/**
 * The next legal tick for a verb. Tell/ask fire only on conversation beats, so they roll forward to
 * the next beat (this beat if already aligned, else strictly future). Everything else takes effect
 * at the very next tick to be simulated (the current, not-yet-stepped `world.tick`).
 */
function queuedTickFor(intent: ActionIntent, now: Tick): Tick {
  if (intent.kind === 'tell' || intent.kind === 'ask') {
    const offset = (CONVERSATION_BEAT - (minuteOfDay(now) % CONVERSATION_BEAT)) % CONVERSATION_BEAT;
    return now + offset;
  }
  return now;
}

function makeSession(seed: string, world: WorldState, log: Action[]): Session {
  const queue: Action[] = [];
  return {
    seed,
    world,
    log,
    submit(intent: ActionIntent): { queuedFor: Tick } {
      const tick = queuedTickFor(intent, world.tick);
      queue.push({ ...intent, tick } as Action);
      return { queuedFor: tick };
    },
    advance(ticks: number): void {
      const target = world.tick + ticks;
      let firstError: unknown = null;
      while (world.tick < target) {
        if (isTerminal(world)) break; // never step a resolved campaign
        const now = world.tick;
        // Apply every queued action due this tick, in insertion order — the runLogOn inner loop.
        for (let i = 0; i < queue.length; ) {
          if (queue[i]!.tick !== now) { i += 1; continue; }
          const action = queue[i]!;
          queue.splice(i, 1); // drop from the queue BEFORE applying, so a throw never retries it
          try {
            applyAction(world, action, STANDARD_RULES); // validation is deferred to here (test (c))
            log.push(action);           // ...and ONLY a successfully-applied action enters the save
          } catch (err) {
            // A failed verb never enters the log; the batch still finishes so the world always
            // lands on a clean tick boundary (never mid-tick), keeping log↔world replay airtight.
            if (firstError === null) firstError = err;
          }
        }
        step(world, STANDARD_RULES);
        if (isTerminal(world)) break; // the referee latched this tick — stop exactly on the death tick
      }
      if (firstError !== null) throw firstError; // surface the failure to the caller (test (c))
    },
    save(): { seed: string; log: Action[] } {
      return { seed, log: [...log] };
    },
  };
}

/** A brand-new Coronation campaign at tick 0. */
export function newSession(seed: string): Session {
  return makeSession(seed, stageWorld(seed), []);
}

/** Regrow a campaign from its save by replaying the log up to `untilTick` (deterministic rebuild). */
export function loadSession(save: { seed: string; log: Action[] }, untilTick: Tick): Session {
  const world = stageWorld(save.seed);
  runLogOn(world, STANDARD_RULES, save.log, untilTick);
  return makeSession(save.seed, world, [...save.log]);
}
