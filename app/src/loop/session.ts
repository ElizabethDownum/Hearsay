import { minuteOfDay, type Tick } from '../../../src/core/time';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../../src/content/gen/standard';
import { STANDARD_RULES } from '../../../src/content/rules';
import { CORONATION } from '../../../src/content/scenarios/coronation';
import { generateValidTown } from '../../../src/world/serve';
import { worldFromTown, attachPlayer } from '../../../src/world/attach';
import { attachScenario, isTerminal } from '../../../src/sim/scenario/referee';
import { applyAction, runLogOn, type Action } from '../../../src/sim/campaign';
import { CONVERSATION_BEAT } from '../../../src/sim/rumors/propagation';
import { finishTick, prepareTick, type PreparedTick } from '../../../src/sim/phases';
import type { EntityId, VenueId } from '../../../src/sim/rumors/claim';
import type { WorldState } from '../../../src/sim/types';

export interface SubmitResult { queuedFor: Tick; refused?: boolean; }

type PlannedLocalActionKind =
  | 'tell' | 'ask' | 'sell' | 'recruit' | 'debrief'
  | 'assignInformant' | 'courier' | 'meet' | 'host' | 'directive';
export type LocalActionKind = Extract<Action['kind'], PlannedLocalActionKind>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ActionIntent = DistributiveOmit<Action, 'tick'>;
export type LocalActionIntent = Extract<ActionIntent, { kind: LocalActionKind }>;
export type NonLocalActionIntent = Exclude<ActionIntent, LocalActionIntent>;

export interface LocalOffer {
  tick: Tick;
  venue: VenueId;
  circleMembers: EntityId[];
  token: string;
}

export interface AdvanceResult {
  advanced: number;
  stopped: 'complete' | 'terminal' | 'local-offer';
}

export type RequestLocalResult =
  | { requestedFor: Tick; refused: false }
  | { requestedFor: Tick; refused: true };

export interface Session {
  readonly seed: string;
  readonly world: WorldState;
  readonly log: Action[];
  submit(intent: NonLocalActionIntent): SubmitResult;
  requestLocalInteraction(): RequestLocalResult;
  cancelLocalInteraction(): void;
  localOffer(): LocalOffer | null;
  chooseLocal(token: string, intent: LocalActionIntent): SubmitResult;
  speechQueuedForBeat(now: Tick): boolean;
  advance(ticks: number): AdvanceResult;
  save(): { seed: string; log: Action[] };
}

const LOCAL_KINDS = new Set<string>([
  'tell', 'ask', 'sell', 'recruit', 'debrief', 'assignInformant', 'courier', 'meet', 'host', 'directive',
]);
const SPEECH_KINDS = new Set<string>(['tell', 'ask', 'sell']);

function nextBeat(now: Tick): Tick {
  const offset = (CONVERSATION_BEAT - (minuteOfDay(now) % CONVERSATION_BEAT)) % CONVERSATION_BEAT;
  return now + offset;
}

function queuedTickFor(intent: ActionIntent, now: Tick): Tick {
  if (LOCAL_KINDS.has(intent.kind)) return nextBeat(now);
  return now;
}

function localParticipants(intent: LocalActionIntent): EntityId[] {
  const value = intent as unknown as {
    kind: string; to?: EntityId; buyer?: EntityId; target?: EntityId; asset?: EntityId;
    informant?: EntityId; invitees?: EntityId[]; viaDrop?: string | null;
    outboundVia?: EntityId[]; recipient?: EntityId;
  };
  switch (value.kind) {
    case 'tell': case 'ask': return [value.to!];
    case 'sell': return [value.buyer!];
    case 'recruit': return [value.target!];
    case 'debrief': case 'meet': return [value.asset!];
    case 'host': return [...(value.invitees ?? [])];
    case 'assignInformant': return [value.informant!];
    case 'courier': return value.viaDrop === null ? [value.asset!] : [];
    case 'directive': return [value.outboundVia?.[0] ?? value.recipient!];
    default: return [];
  }
}

function stageWorld(seed: string): WorldState {
  const { town } = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
  const world = worldFromTown(town, seed, STANDARD_RULES);
  attachPlayer(world, town);
  attachScenario(world, town, CORONATION);
  return world;
}

interface PendingOffer {
  frame: PreparedTick;
  offer: LocalOffer;
  action: Action | null;
}

function makeSession(seed: string, world: WorldState, log: Action[]): Session {
  const queue: Action[] = [];
  let requestedFor: Tick | null = null;
  let pendingOffer: PendingOffer | null = null;
  let nextOfferSerial = 0;

  const pendingTick = (): Tick | null => pendingOffer?.offer.tick ?? requestedFor;

  const applyQueued = (): unknown => {
    let firstError: unknown = null;
    for (let i = 0; i < queue.length;) {
      if (queue[i]!.tick !== world.tick) { i += 1; continue; }
      const action = queue[i]!;
      queue.splice(i, 1);
      try {
        applyAction(world, action, STANDARD_RULES);
        log.push(action);
      } catch (error) {
        if (firstError === null) firstError = error;
      }
    }
    return firstError;
  };

  return {
    seed,
    world,
    log,
    submit(intent: NonLocalActionIntent): SubmitResult {
      if (LOCAL_KINDS.has((intent as ActionIntent).kind)) {
        throw new Error('session: local actions require a requested-beat offer');
      }
      const pending = pendingTick();
      if (pending !== null) return { queuedFor: pending, refused: true };
      const tick = queuedTickFor(intent, world.tick);
      queue.push({ ...intent, tick } as Action);
      return { queuedFor: tick };
    },
    requestLocalInteraction(): RequestLocalResult {
      const existing = pendingTick();
      if (existing !== null) return { requestedFor: existing, refused: true };
      const next = nextBeat(world.tick);
      if (queue.some((action) => action.tick === next)) return { requestedFor: next, refused: true };
      requestedFor = next;
      return { requestedFor: next, refused: false };
    },
    cancelLocalInteraction(): void {
      requestedFor = null;
      pendingOffer = null;
    },
    localOffer(): LocalOffer | null {
      if (!pendingOffer) return null;
      return { ...pendingOffer.offer, circleMembers: [...pendingOffer.offer.circleMembers] };
    },
    chooseLocal(token: string, intent: LocalActionIntent): SubmitResult {
      if (!pendingOffer || pendingOffer.offer.token !== token) {
        throw new Error('session: stale or invalid local offer token');
      }
      if (pendingOffer.action !== null) throw new Error('session: local offer already chosen');
      const members = new Set(pendingOffer.offer.circleMembers);
      for (const participant of localParticipants(intent)) {
        if (!members.has(participant)) throw new Error(`session: local participant '${participant}' is not in the offered circle`);
      }
      pendingOffer.action = { ...intent, tick: pendingOffer.offer.tick } as Action;
      return { queuedFor: pendingOffer.offer.tick };
    },
    speechQueuedForBeat(now: Tick): boolean {
      const beat = nextBeat(now);
      return pendingOffer?.action !== null
        && pendingOffer?.action !== undefined
        && pendingOffer.action.tick === beat
        && SPEECH_KINDS.has(pendingOffer.action.kind);
    },
    advance(ticks: number): AdvanceResult {
      const start = world.tick;
      const target = world.tick + ticks;
      let firstError: unknown = null;

      while (world.tick < target) {
        if (isTerminal(world)) return { advanced: world.tick - start, stopped: 'terminal' };

        if (pendingOffer) {
          if (pendingOffer.action === null) {
            return { advanced: world.tick - start, stopped: 'local-offer' };
          }
          const held = pendingOffer;
          finishTick(world, STANDARD_RULES, held.frame, () => {
            try {
              applyAction(world, held.action!, STANDARD_RULES);
              log.push(held.action!);
            } catch (error) {
              firstError = error;
            }
          });
          pendingOffer = null;
          if (firstError !== null) throw firstError;
          if (isTerminal(world)) return { advanced: world.tick - start, stopped: 'terminal' };
          continue;
        }

        if (requestedFor === world.tick) {
          const frame = prepareTick(world, STANDARD_RULES);
          const player = world.playerId;
          if (player === null || frame.positions[player] === undefined) {
            throw new Error('session: cannot offer a local interaction without a placed avatar');
          }
          const circle = frame.circles.find((candidate) => candidate.members.includes(player));
          pendingOffer = {
            frame,
            offer: {
              tick: frame.tick,
              venue: frame.positions[player]!,
              circleMembers: (circle?.members ?? []).filter((id) => id !== player).sort(),
              token: `${frame.offerToken}#${nextOfferSerial++}`,
            },
            action: null,
          };
          requestedFor = null;
          return { advanced: world.tick - start, stopped: 'local-offer' };
        }

        const frame = prepareTick(world, STANDARD_RULES);
        const hasDueAction = queue.some((action) => action.tick === world.tick);
        if (hasDueAction) {
          finishTick(world, STANDARD_RULES, frame, () => { firstError = applyQueued(); });
        } else {
          finishTick(world, STANDARD_RULES, frame);
        }
        if (firstError !== null) throw firstError;
        if (isTerminal(world)) return { advanced: world.tick - start, stopped: 'terminal' };
      }
      return { advanced: world.tick - start, stopped: isTerminal(world) ? 'terminal' : 'complete' };
    },
    save(): { seed: string; log: Action[] } {
      return { seed, log: [...log] };
    },
  };
}

export function newSession(seed: string): Session {
  return makeSession(seed, stageWorld(seed), []);
}

export function loadSession(save: { seed: string; log: Action[] }, untilTick: Tick): Session {
  const world = stageWorld(save.seed);
  runLogOn(world, STANDARD_RULES, save.log, untilTick);
  return makeSession(save.seed, world, [...save.log]);
}
