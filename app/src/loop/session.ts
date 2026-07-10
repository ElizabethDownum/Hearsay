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
/**
 * The outcome of `submit`. `refused` is set (and NOTHING is queued) when the one-speech-act-per-beat
 * latch turns away a second speech verb for a beat that already holds one (note 9). `queuedFor` still
 * reports the beat the verb WOULD have targeted, so a caller can name it in a toast either way.
 */
export interface SubmitResult { queuedFor: Tick; refused?: boolean; }

export interface Session {
  readonly seed: string;
  readonly world: WorldState;
  readonly log: Action[];
  /**
   * Queue a verb for the next legal tick (beat-aligned for tell/ask/sell; next tick otherwise). At most
   * ONE avatar speech verb (tell | ask | sell) may be queued per conversation beat — a second is
   * REFUSED here (note 9), before the sim ever sees it. This is the composer-layer gate that keeps
   * the sim free of a cross-verb per-beat guard; the sim's own per-verb guards (tell-vs-tell,
   * sell-vs-sell) stay only as defense-in-depth for hand-built log replays.
   */
  submit(intent: ActionIntent): SubmitResult;
  /**
   * Whether a speech verb is already queued for the conversation beat a speech verb submitted at
   * `now` would land on. The composer reads this to grey ALL speech submits at once. It survives a
   * panel remount and clears only on beat advance, because the latch lives in this session's queue
   * (not in React state): the queued speech verb drains when its beat is stepped, freeing the slot.
   */
  speechQueuedForBeat(now: Tick): boolean;
  /** Step N ticks, applying queued actions runLogOn-style (apply-at-tick, then step). Halts at a terminal status. */
  advance(ticks: number): void;
  save(): { seed: string; log: Action[] };
}

/** The three avatar speech verbs — mutually exclusive within a conversation beat (note 9). The sim
 *  guards only tell-vs-tell and sell-vs-sell (per-verb pending flags), so the session is the sole
 *  cross-verb gate: tell→toggle→sell must not be able to queue two acts for one beat. */
const SPEECH_KINDS = new Set<ActionIntent['kind']>(['tell', 'ask', 'sell']);
const isSpeechKind = (kind: ActionIntent['kind']): boolean => SPEECH_KINDS.has(kind);

/** The next conversation beat on or after `now` (this tick if already beat-aligned). */
function nextBeat(now: Tick): Tick {
  const offset = (CONVERSATION_BEAT - (minuteOfDay(now) % CONVERSATION_BEAT)) % CONVERSATION_BEAT;
  return now + offset;
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
 * The next legal tick for a verb. The three speech verbs (tell/ask/sell) fire only on conversation
 * beats — applyTell/applyAsk/applySell each throw off-beat — so they roll forward to the next beat
 * (this beat if already aligned, else strictly future). Everything else takes effect at the very next
 * tick to be simulated (the current, not-yet-stepped `world.tick`). Folding `sell` in here (T11 carry
 * (i)) means a mid-beat sell now QUEUES for the next beat rather than toast-failing on applySell's own
 * beat guard — and its queued tick IS the target beat, so the one-speech-per-beat latch keys off that
 * beat exactly as it does for tell/ask.
 */
function queuedTickFor(intent: ActionIntent, now: Tick): Tick {
  if (intent.kind === 'tell' || intent.kind === 'ask' || intent.kind === 'sell') return nextBeat(now);
  return now;
}

function makeSession(seed: string, world: WorldState, log: Action[]): Session {
  const queue: Action[] = [];
  return {
    seed,
    world,
    log,
    submit(intent: ActionIntent): SubmitResult {
      const tick = queuedTickFor(intent, world.tick);
      // One speech act per beat (note 9): refuse a second tell/ask/sell landing on a beat that
      // already holds a queued speech verb. The refusal is BEFORE the sim ever validates the verb —
      // and because the queue lives here, the latch survives a composer remount and clears only when
      // the queued speech verb drains at its beat (advance), never on a bare pause/unpause.
      if (isSpeechKind(intent.kind) && queue.some((q) => isSpeechKind(q.kind) && q.tick === tick)) {
        return { queuedFor: tick, refused: true };
      }
      queue.push({ ...intent, tick } as Action);
      return { queuedFor: tick };
    },
    speechQueuedForBeat(now: Tick): boolean {
      const beat = nextBeat(now);
      return queue.some((q) => isSpeechKind(q.kind) && q.tick === beat);
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
