import { dayOf, dayOfWeek, minuteOfDay, REST_DAY, type Tick } from '../core/time';
import { fnv1a32, Rng } from '../core/rng';
import { CIRCLE_SIZE, positionOf, type Circle } from './agents';
import { captureEvidence, runEnemyDay } from './counterintel';
import { captureIntel } from './fieldwork';
import { cloneSerializable, stableStringify } from './hash';
import { expireInquiries, runAskPhase, runPlayerAskPhase } from './inquiry';
import { deliverCouriers } from './network/couriers';
import { payWagesNightly } from './network/roster';
import { runTurncoatPass } from './network/turncoats';
import { observationsFor, type Asking, type TickEvents, type Utterance } from './perception';
import { reactToSelfRumor } from './reactions';
import { chooseTelling, ingest, CONVERSATION_BEAT } from './rumors/propagation';
import { mintClaim, type EntityId, type VenueId } from './rumors/claim';
import { scenarioNightly } from './scenario/referee';
import { runVignettes } from './vignettes/engine';
import type { Rules } from './rules';
import type { ScheduleOverride, WorldState } from './types';

export interface ScheduledSetup {
  id: string;
  due: Tick;
  kind: 'schedule-override' | 'directive-due' | 'recruitment-response';
  actor: EntityId;
  ref: string;
  override: ScheduleOverride | null;
}

export interface PreparedTick {
  tick: Tick;
  prior: ScheduledSetup[];
  positions: Record<EntityId, VenueId>;
  circles: Circle[];
  offerToken: string;
}

function applySetup(world: WorldState, setup: ScheduledSetup): void {
  switch (setup.kind) {
    case 'schedule-override': {
      if (setup.override === null) {
        throw new Error(`schedule-override '${setup.id}': override is required`);
      }
      if (!world.npcs[setup.actor]) {
        throw new Error(`schedule-override '${setup.id}': unknown actor '${setup.actor}'`);
      }
      world.scheduleOverrides[setup.actor] = [
        cloneSerializable(setup.override),
        ...(world.scheduleOverrides[setup.actor] ?? []),
      ];
      return;
    }
    case 'directive-due':
      throw new Error(`directive-due handler not installed (setup '${setup.id}')`);
    case 'recruitment-response':
      throw new Error(`recruitment-response handler not installed (setup '${setup.id}')`);
  }
}

function dueSetup(world: WorldState, tick: Tick): ScheduledSetup[] {
  if (world.scheduledSetup === undefined) return [];
  return world.scheduledSetup
    .filter((setup) => setup.due === tick)
    .sort((a, b) => a.due - b.due || a.id.localeCompare(b.id))
    .map(cloneSerializable);
}

function positionsAt(world: WorldState, tick: Tick): Record<EntityId, VenueId> {
  return Object.fromEntries(
    Object.values(world.npcs).map((npc) => [npc.id, positionOf(world, npc, tick)]),
  );
}

/** Build the exact circlesAt projection without recomputing every NPC position. */
function circlesFromPositions(
  world: WorldState, tick: Tick, positions: Readonly<Record<EntityId, VenueId>>,
): Circle[] {
  const occupants = new Map<VenueId, EntityId[]>();
  for (const id of Object.keys(world.npcs)) {
    const venue = positions[id]!;
    (occupants.get(venue) ?? occupants.set(venue, []).get(venue)!).push(id);
  }

  const hour = Math.floor(minuteOfDay(tick) / 60);
  const circles: Circle[] = [];
  for (const [venue, ids] of [...occupants.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const rng = new Rng(world.seed, `circles:${venue}:${dayOf(tick)}:${hour}`);
    const shuffled = rng.shuffle([...ids].sort());
    for (let i = 0; i < shuffled.length; i += CIRCLE_SIZE) {
      circles.push({ venue, members: shuffled.slice(i, i + CIRCLE_SIZE) });
    }
  }
  return circles;
}

function offerTokenFor(world: WorldState, tick: Tick, circles: Circle[], prior: ScheduledSetup[]): string {
  const offerBasis = {
    tick,
    venue: world.playerVenue,
    circle: world.playerId === null
      ? []
      : (circles.find((circle) => circle.members.includes(world.playerId!))?.members ?? []),
    priorIds: prior.map((setup) => setup.id),
  };
  return `offer-${fnv1a32(stableStringify(offerBasis))}`;
}

export function scheduleSetup(world: WorldState, setup: ScheduledSetup): void {
  if (setup.due <= world.tick) {
    throw new Error(`scheduleSetup: due tick ${setup.due} must be in the future (world tick ${world.tick})`);
  }
  if (world.scheduledSetup?.some((existing) => existing.id === setup.id)) {
    throw new Error(`scheduleSetup: duplicate id '${setup.id}'`);
  }
  const copy = cloneSerializable(setup);
  if (world.scheduledSetup) world.scheduledSetup.push(copy);
  else world.scheduledSetup = [copy];
}

export function prepareTick(world: WorldState, rules: Rules): PreparedTick {
  void rules;
  const tick = world.tick;
  const prior = dueSetup(world, tick);
  const preview = prior.length === 0 ? world : cloneSerializable(world);
  if (prior.length > 0) {
    for (const setup of prior) applySetup(preview, setup);
  }
  const positions = positionsAt(preview, tick);
  const circles = circlesFromPositions(preview, tick, positions);
  return {
    tick,
    prior,
    positions,
    circles,
    offerToken: offerTokenFor(preview, tick, circles, prior),
  };
}

function consumePrior(world: WorldState, prior: ScheduledSetup[]): void {
  for (const setup of prior) applySetup(world, setup);
  if (!world.scheduledSetup) return;
  const consumed = new Set(prior.map((setup) => setup.id));
  const remaining = world.scheduledSetup.filter((setup) => !consumed.has(setup.id));
  if (remaining.length > 0) world.scheduledSetup = remaining;
  else delete world.scheduledSetup;
}

function resolvePlayerSpeech(
  world: WorldState, rules: Rules, tick: Tick, offeredCircles: Circle[],
  utterances: Utterance[], askings: Asking[],
): EntityId[] {
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0 || world.playerId === null) return [];
  const offered = offeredCircles.find((circle) => circle.members.includes(world.playerId!));

  if (world.pendingTell) {
    if (offered) {
      const family = `f${world.claimCounter}`;
      const claim = mintClaim(world, { ...world.pendingTell.spec, family, parent: null });
      world.claims[claim.id] = claim;
      utterances.push({
        tick, venue: offered.venue, circleMembers: offered.members,
        speaker: world.playerId, addressedTo: world.pendingTell.to, claim, mode: 'telling',
      });
    }
    world.pendingTell = null;
  }

  if (world.pendingSell) {
    if (offered) {
      const { buyer, family, price, claimId } = world.pendingSell;
      const claim = world.claims[claimId]!;
      world.coin += price;
      world.network.sales.push({ family, buyer });
      world.beliefs[buyer]![family] = {
        claim, credence: 0.85, heardFrom: world.playerId, heardAt: tick, firstHeardAt: tick,
        timesHeard: 1, apparentSources: [world.playerId], discretion: false, counterSpun: false,
      };
      utterances.push({
        tick, venue: offered.venue, circleMembers: offered.members,
        speaker: world.playerId, addressedTo: buyer, claim, mode: 'telling',
      });
    }
    world.pendingSell = null;
  }

  const directAsk = runPlayerAskPhase(world, offered, tick, rules);
  askings.push(...directAsk.askings);
  utterances.push(...directAsk.answers);
  return directAsk.spoke;
}

function resolveNpcSpeech(
  world: WorldState, rules: Rules, tick: Tick, circles: Circle[],
  utterances: Utterance[], askings: Asking[], alreadySpoke: readonly EntityId[],
): void {
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) return;
  for (const circle of circles) {
    if (circle.members.length < 2) continue;
    const phase = runAskPhase(world, circle, tick, rules, alreadySpoke);
    askings.push(...phase.askings);
    utterances.push(...phase.answers);
    const spoke = new Set(phase.spoke);
    for (const member of circle.members) {
      if (spoke.has(member) || alreadySpoke.includes(member) || member === world.playerId) continue;
      const utterance = chooseTelling(world, member, circle, tick, rules);
      if (utterance) utterances.push(utterance);
    }
  }
  utterances.push(...deliverCouriers(world, tick, rules));
}

function recordAndIngest(
  world: WorldState, rules: Rules, events: TickEvents, utterances: Utterance[], askings: Asking[],
): void {
  for (const utterance of utterances) {
    world.chronicle.push({
      kind: 'telling', tick: utterance.tick, venue: utterance.venue, speaker: utterance.speaker,
      addressedTo: utterance.addressedTo, claimId: utterance.claim.id,
      heardBy: utterance.circleMembers.filter((member) => member !== utterance.speaker)
        .map((id) => ({ id, addressed: id === utterance.addressedTo })),
      mode: utterance.mode,
    });
  }
  for (const asking of askings) {
    world.chronicle.push({
      kind: 'asking', tick: asking.tick, venue: asking.venue, speaker: asking.speaker,
      addressedTo: asking.addressedTo, about: asking.about, authority: asking.authority,
      heardBy: asking.circleMembers.filter((member) => member !== asking.speaker)
        .map((id) => ({ id, addressed: id === asking.addressedTo })),
    });
  }

  const preLen = world.enemy.evidence.length;
  if (utterances.length > 0 || askings.length > 0) captureEvidence(world, events, rules);
  if (world.scenario?.status === 'running' && world.playerId !== null) {
    const caught = world.enemy.evidence.slice(preLen)
      .find((evidence) => evidence.kind === 'utterance' && evidence.speaker === world.playerId);
    if (caught) {
      const scenario = world.scenario;
      scenario.status = 'lost-caught';
      scenario.resolution = {
        kind: 'lost-caught', day: dayOf(events.tick), heardBy: caught.observer, venue: caught.venue,
      };
      world.chronicle.push({
        kind: 'institution', tick: events.tick, action: 'arrest', subject: world.playerId,
        actors: [caught.observer], claimIds: caught.claimId ? [caught.claimId] : [],
      });
    }
  }

  captureIntel(world, events, rules);
  if (utterances.length === 0 && askings.length === 0) return;
  for (const hearerId of Object.keys(world.npcs).sort()) {
    if (hearerId === world.playerId) continue;
    const feed = observationsFor(hearerId, events);
    for (const observation of feed.observations) {
      if (observation.kind !== 'utterance') continue;
      ingest(world, hearerId, {
        tick: observation.tick, speaker: observation.speaker, claim: observation.claim,
      }, !observation.overheard, rules);
      if (observation.claim.subject === hearerId) {
        reactToSelfRumor(world, hearerId, observation.claim.family, observation.tick, rules);
      }
    }
  }
}

function resolveEnvironment(world: WorldState, rules: Rules, tick: Tick): void {
  if (minuteOfDay(tick) !== 1439) return;
  if (dayOfWeek(tick) === REST_DAY) {
    world.coin += rules.economy.weeklyStipend;
    payWagesNightly(world, rules);
  }
  runTurncoatPass(world, rules);
  runEnemyDay(world, rules);
  expireInquiries(world, dayOf(tick));
  runVignettes(world, rules);
  scenarioNightly(world, rules);
}

function finishTickInternal(
  world: WorldState,
  rules: Rules,
  frame: PreparedTick,
  playerPhase?: () => void,
  validate = true,
): TickEvents {
  if (frame.tick !== world.tick) {
    throw new Error(`finishTick: frame tick ${frame.tick} differs from world tick ${world.tick}`);
  }

  let preflightPositions = frame.positions;
  let preflightCircles = frame.circles;
  if (validate) {
    const validation = frame.prior.length === 0 ? world : cloneSerializable(world);
    if (frame.prior.length > 0) {
      for (const setup of frame.prior) applySetup(validation, setup);
    }
    const validationPositions = positionsAt(validation, frame.tick);
    const validationCircles = circlesFromPositions(validation, frame.tick, validationPositions);
    const validationToken = offerTokenFor(validation, frame.tick, validationCircles, frame.prior);
    if (validationToken !== frame.offerToken) {
      throw new Error(`finishTick: offer token mismatch (${frame.offerToken} != ${validationToken})`);
    }
    preflightPositions = validationPositions;
    preflightCircles = validationCircles;
  }

  consumePrior(world, frame.prior);
  playerPhase?.();

  const utterances: Utterance[] = [];
  const askings: Asking[] = [];
  const directSpeakers = resolvePlayerSpeech(
    world, rules, frame.tick, frame.circles, utterances, askings,
  );

  const positions = playerPhase === undefined ? preflightPositions : positionsAt(world, frame.tick);
  const npcCircles = playerPhase === undefined
    ? preflightCircles
    : circlesFromPositions(world, frame.tick, positions);
  resolveNpcSpeech(world, rules, frame.tick, npcCircles, utterances, askings, directSpeakers);

  const events: TickEvents = { tick: frame.tick, positions, utterances, askings };
  recordAndIngest(world, rules, events, utterances, askings);
  resolveEnvironment(world, rules, frame.tick);
  world.tick = frame.tick + 1;
  return events;
}

export function finishTick(
  world: WorldState,
  rules: Rules,
  frame: PreparedTick,
  playerPhase?: () => void,
): TickEvents {
  return finishTickInternal(world, rules, frame, playerPhase);
}

function finishTickImmediately(
  world: WorldState, rules: Rules, frame: PreparedTick,
): TickEvents {
  return finishTickInternal(world, rules, frame, undefined, false);
}

/** Safe synchronous composition: the trusted frame cannot escape or be supplied by a caller. */
export function stepTransaction(world: WorldState, rules: Rules): TickEvents {
  const frame = prepareTick(world, rules);
  return finishTickImmediately(world, rules, frame);
}
