import { dayOf, dayOfWeek, minuteOfDay, REST_DAY, type Tick } from '../core/time';
import { fnv1a32, Rng } from '../core/rng';
import { CIRCLE_SIZE, positionOf, type Circle } from './agents';
import { captureEvidence, noticedByObserver, runEnemyDay } from './counterintel';
import { captureIntel } from './fieldwork';
import { cloneSerializable, stableStringify } from './hash';
import { chooseAnswer, collectOrdinaryAskOffers, expireInquiries, runPlayerAskPhase } from './inquiry';
import { deliverCouriers } from './network/couriers';
import { payWagesNightly } from './network/roster';
import { runTurncoatPass } from './network/turncoats';
import { observationsFor, type Asking, type TickEvents, type Utterance } from './perception';
import { reactToSelfRumor } from './reactions';
import { ingest, realizeTelling, selectTelling, CONVERSATION_BEAT } from './rumors/propagation';
import { mintClaim, type EntityId, type RumorId, type VenueId } from './rumors/claim';
import { scenarioNightly } from './scenario/referee';
import { runVignettes } from './vignettes/engine';
import type { Rules } from './rules';
import type { ScheduleOverride, WorldState } from './types';
import { trustBetween } from './world';
import {
  collectNetworkForwardIntents, deliverNetworkMessages, realizeNetworkForward,
} from './directives/transport';
import { queueUnqueuedFieldReports } from './directives/field-reports';
import type { NetworkSpeech } from './directives/types';

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

export type NpcAutonomousIntent =
  | { kind: 'recruitment-answer'; actor: EntityId; ref: string; rank: 0 }
  | { kind: 'network-forward'; actor: EntityId; ref: string; rank: 1 }
  | { kind: 'directive-act'; actor: EntityId; ref: string; rank: 2 | 4 | 6 }
  | { kind: 'drop-pickup'; actor: EntityId; ref: string; rank: 3 }
  | { kind: 'ordinary-ask'; actor: EntityId; ref: string; rank: 5;
      taskIndex: number; preferred: EntityId[] }
  | { kind: 'ordinary-tell'; actor: EntityId; ref: string; rank: 7;
      family: RumorId; addressedTo: EntityId };

export interface CircleIntentFrame {
  circle: Circle;
  candidates: NpcAutonomousIntent[];
  selected: NpcAutonomousIntent[];
  answeredDirectly: EntityId[];
}

export interface NpcIntentRealization<Extra = never> {
  askings: Asking[];
  answers: Utterance[];
  tellings: Utterance[];
  extras: Extra[];
}

export type RealizeExtraIntent<Extra = never> = (
  world: WorldState,
  intent: Exclude<NpcAutonomousIntent, { kind: 'ordinary-ask' } | { kind: 'ordinary-tell' }>,
  circle: Circle,
  t: Tick,
  rules: Rules,
) => NpcIntentRealization<Extra>;

const canonicalCircle = (circle: Circle): Circle => ({
  venue: circle.venue,
  members: [...circle.members].sort(),
});

const compareIntent = (a: NpcAutonomousIntent, b: NpcAutonomousIntent): number =>
  a.rank - b.rank || a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref);

/** Purely collect one circle's complete offers from the shared pre-action world. */
export function collectCircleIntents(
  world: WorldState,
  circle: Circle,
  t: Tick,
  rules: Rules,
  extra: readonly NpcAutonomousIntent[],
  answeredDirectly: ReadonlySet<EntityId>,
): CircleIntentFrame {
  const canonical = canonicalCircle(circle);
  const candidates: NpcAutonomousIntent[] = collectOrdinaryAskOffers(world, canonical, t)
    .map((offer) => ({
      kind: 'ordinary-ask' as const,
      actor: offer.actor,
      ref: String(offer.taskIndex).padStart(10, '0'),
      rank: 5 as const,
      taskIndex: offer.taskIndex,
      preferred: [...offer.preferred],
    }));

  for (const actor of canonical.members) {
    if (actor === world.playerId) continue;
    const offer = selectTelling(world, actor, canonical, t, rules);
    if (offer !== null) {
      candidates.push({
        kind: 'ordinary-tell', actor, ref: `${offer.family}:${offer.addressedTo}`, rank: 7,
        family: offer.family, addressedTo: offer.addressedTo,
      });
    }
  }
  candidates.push(...extra
    .filter((intent) => canonical.members.includes(intent.actor) && intent.actor !== world.playerId)
    .map((intent) => cloneSerializable(intent)));
  candidates.sort((a, b) => a.actor.localeCompare(b.actor) || compareIntent(a, b));

  const selected: NpcAutonomousIntent[] = [];
  for (const actor of [...new Set(candidates.map((candidate) => candidate.actor))].sort()) {
    const winner = candidates.filter((candidate) => candidate.actor === actor).sort(compareIntent)[0];
    if (winner !== undefined) selected.push(cloneSerializable(winner));
  }
  return {
    circle: canonical,
    candidates,
    selected,
    answeredDirectly: [...answeredDirectly].sort(),
  };
}

const defaultExtra: RealizeExtraIntent<NetworkSpeech> = (world, intent, circle, t, rules) => {
  switch (intent.kind) {
    case 'network-forward': {
      const speech = realizeNetworkForward(world, intent.ref, circle, t, rules);
      return { askings: [], answers: [], tellings: [], extras: speech ? [speech] : [] };
    }
    case 'directive-act':
      throw new Error('phase4: directive-act handler not installed');
    case 'drop-pickup':
      throw new Error('phase4: drop-pickup handler not installed');
    case 'recruitment-answer':
      throw new Error('phase4: recruitment-answer handler not installed');
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
};

/** Realize selections without allowing response speech to consume an NPC's autonomous slot. */
export function realizeCircleIntents<Extra = NetworkSpeech>(
  world: WorldState,
  frame: CircleIntentFrame,
  t: Tick,
  rules: Rules,
  realizeExtra?: RealizeExtraIntent<Extra>,
): NpcIntentRealization<Extra> {
  const circle = canonicalCircle(frame.circle);
  const askings: Asking[] = [];
  const answers: Utterance[] = [];
  const tellings: Utterance[] = [];
  const extras: Extra[] = [];
  const selectedAsks = frame.selected
    .filter((intent): intent is Extract<NpcAutonomousIntent, { kind: 'ordinary-ask' }> =>
      intent.kind === 'ordinary-ask')
    .sort((a, b) => a.actor.localeCompare(b.actor));
  const realizedAsks: {
    asking: Asking;
    taskIndex: number;
  }[] = [];

  for (const intent of selectedAsks) {
    const task = world.inquiries[intent.actor]?.[intent.taskIndex];
    if (task === undefined) continue;
    const addressedTo = intent.preferred.find((id) =>
      circle.members.includes(id) && id !== intent.actor && !task.asked.includes(id));
    if (addressedTo === undefined) continue;
    const asking: Asking = {
      tick: t,
      venue: circle.venue,
      circleMembers: [...circle.members],
      speaker: intent.actor,
      addressedTo,
      about: task.about,
      authority: task.from === 'enemy',
    };
    askings.push(asking);
    task.asked.push(addressedTo);
    realizedAsks.push({ asking, taskIndex: intent.taskIndex });
  }

  const answeredDirectly = new Set(frame.answeredDirectly);
  const answerWinners = new Map<EntityId, { asking: Asking; taskIndex: number }>();
  for (const realized of realizedAsks) {
    const answerer = realized.asking.addressedTo;
    if (answeredDirectly.has(answerer)) continue;
    const current = answerWinners.get(answerer);
    if (current === undefined) {
      answerWinners.set(answerer, realized);
      continue;
    }
    const nextTrust = trustBetween(world, answerer, realized.asking.speaker);
    const currentTrust = trustBetween(world, answerer, current.asking.speaker);
    if (nextTrust > currentTrust ||
      (nextTrust === currentTrust && realized.asking.speaker < current.asking.speaker)) {
      answerWinners.set(answerer, realized);
    }
  }
  for (const [answerer, winner] of [...answerWinners.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const answer = chooseAnswer(world, answerer, winner.asking, t, rules);
    if (answer === null) continue;
    answers.push(answer);
    const tasks = world.inquiries[winner.asking.speaker] ?? [];
    const task = tasks[winner.taskIndex];
    if (task === undefined) continue;
    task.answersHeard += 1;
    if (task.answersHeard >= 2) {
      const remaining = tasks.filter((_, index) => index !== winner.taskIndex);
      if (remaining.length === 0) delete world.inquiries[winner.asking.speaker];
      else world.inquiries[winner.asking.speaker] = remaining;
    }
  }

  const extraHandler = realizeExtra ?? (defaultExtra as RealizeExtraIntent<Extra>);
  const selectedExtras = frame.selected
    .filter((intent): intent is Exclude<NpcAutonomousIntent,
      { kind: 'ordinary-ask' } | { kind: 'ordinary-tell' }> =>
      intent.kind !== 'ordinary-ask' && intent.kind !== 'ordinary-tell')
    .sort((a, b) => a.actor.localeCompare(b.actor));
  for (const intent of selectedExtras) {
    const realized = extraHandler(world, intent, circle, t, rules);
    askings.push(...realized.askings.map((asking) => ({
      ...asking, circleMembers: [...asking.circleMembers].sort(),
    })));
    answers.push(...realized.answers.map((answer) => ({
      ...answer, circleMembers: [...answer.circleMembers].sort(),
    })));
    tellings.push(...realized.tellings.map((telling) => ({
      ...telling, circleMembers: [...telling.circleMembers].sort(),
    })));
    extras.push(...realized.extras);
  }

  const selectedTellings = frame.selected
    .filter((intent): intent is Extract<NpcAutonomousIntent, { kind: 'ordinary-tell' }> =>
      intent.kind === 'ordinary-tell')
    .sort((a, b) => a.actor.localeCompare(b.actor));
  const answeredFamilies = new Set(answers.map((answer) =>
    `${answer.speaker}:${answer.claim.family}`));
  for (const intent of selectedTellings) {
    // A same-family answer and autonomous telling both remain observable, but the answer path must
    // not manufacture a retell cooldown. The independent telling reuses that already-spoken family
    // without turning the causally compelled answer into a cooldown write.
    const telling = realizeTelling(world, intent.actor, {
      family: intent.family, addressedTo: intent.addressedTo,
    }, circle, t, rules, !answeredFamilies.has(`${intent.actor}:${intent.family}`));
    if (telling !== null) tellings.push(telling);
  }
  return { askings, answers, tellings, extras };
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
      circles.push({ venue, members: shuffled.slice(i, i + CIRCLE_SIZE).sort() });
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
      : [...(circles.find((circle) => circle.members.includes(world.playerId!))?.members ?? [])].sort(),
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
        tick, venue: offered.venue, circleMembers: [...offered.members].sort(),
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
        tick, venue: offered.venue, circleMembers: [...offered.members].sort(),
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

export function resolveAutonomousPhase(
  world: WorldState,
  rules: Rules,
  tick: Tick,
  circles: Circle[],
  answeredDirectly: ReadonlySet<EntityId>,
  extra: readonly NpcAutonomousIntent[] = [],
): NpcIntentRealization<NetworkSpeech> {
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) {
    return { askings: [], answers: [], tellings: [], extras: [] };
  }
  const orderedCircles = circles
    .map(canonicalCircle)
    .sort((a, b) => a.venue.localeCompare(b.venue) ||
      a.members.join('\0').localeCompare(b.members.join('\0')));
  // Every frame is collected before any realization mutates the live world.
  const frames = orderedCircles
    .filter((circle) => circle.members.length >= 2)
    .map((circle) => collectCircleIntents(world, circle, tick, rules, extra, answeredDirectly));
  const result: NpcIntentRealization<NetworkSpeech> = { askings: [], answers: [], tellings: [], extras: [] };
  for (const frame of frames) {
    const realized = realizeCircleIntents(world, frame, tick, rules);
    result.askings.push(...realized.askings);
    result.answers.push(...realized.answers);
    result.tellings.push(...realized.tellings);
    result.extras.push(...realized.extras);
  }
  return result;
}

function resolveNpcSpeech(
  world: WorldState, rules: Rules, tick: Tick, circles: Circle[],
  utterances: Utterance[], askings: Asking[], networkSpeeches: NetworkSpeech[],
  alreadySpoke: readonly EntityId[],
): void {
  const network = collectNetworkForwardIntents(world, tick, circles);
  const phase = resolveAutonomousPhase(world, rules, tick, circles, new Set(alreadySpoke), network);
  askings.push(...phase.askings);
  utterances.push(...phase.answers, ...phase.tellings);
  networkSpeeches.push(...phase.extras);
  // Transitional Plan-8 courier loop. Task 9 replaces it with directive-act candidates.
  utterances.push(...deliverCouriers(world, tick, rules).map((utterance) => ({
    ...utterance,
    circleMembers: [...utterance.circleMembers].sort(),
  })));
}

function recordAndIngest(
  world: WorldState, rules: Rules, events: TickEvents, utterances: Utterance[], askings: Asking[],
  networkSpeeches: NetworkSpeech[],
): void {
  for (const utterance of utterances) {
    world.chronicle.push({
      kind: 'telling', tick: utterance.tick, venue: utterance.venue, speaker: utterance.speaker,
      addressedTo: utterance.addressedTo, claimId: utterance.claim.id,
      heardBy: utterance.circleMembers.filter((member) => member !== utterance.speaker)
        .sort()
        .map((id) => ({ id, addressed: id === utterance.addressedTo })),
      mode: utterance.mode,
    });
  }
  for (const asking of askings) {
    world.chronicle.push({
      kind: 'asking', tick: asking.tick, venue: asking.venue, speaker: asking.speaker,
      addressedTo: asking.addressedTo, about: asking.about, authority: asking.authority,
      heardBy: asking.circleMembers.filter((member) => member !== asking.speaker)
        .sort()
        .map((id) => ({ id, addressed: id === asking.addressedTo })),
    });
  }

  for (const speech of networkSpeeches) {
    world.chronicle.push({
      kind: 'network-speech', tick: speech.tick, venue: speech.venue,
      speaker: speech.speaker, addressedTo: speech.addressedTo,
      messageId: speech.messageId, spoken: cloneSerializable(speech.spoken),
      cause: cloneSerializable(speech.cause),
      heardBy: speech.circleMembers.filter((member) => member !== speech.speaker)
        .sort().map((id) => ({ id, addressed: id === speech.addressedTo })),
    });
  }

  if (utterances.length > 0 || askings.length > 0 || networkSpeeches.length > 0) {
    captureEvidence(world, events, rules);
  }
  if (world.scenario?.status === 'running' && world.playerId !== null) {
    let caught: { observer: EntityId; venue: VenueId; claimId: string | null } | null = null;
    for (const spec of [...world.enemy.observers].sort((a, b) => a.id.localeCompare(b.id))) {
      const observation = observationsFor(spec.id, events).observations.find((candidate) =>
        (candidate.kind === 'utterance' || candidate.kind === 'network-speech')
        && candidate.speaker === world.playerId && noticedByObserver(spec, candidate, rules));
      if (observation) {
        caught = {
          observer: spec.id, venue: observation.venue,
          claimId: observation.kind === 'utterance' ? observation.claim.id : null,
        };
        break;
      }
    }
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
  queueUnqueuedFieldReports(world);
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
  const networkSpeeches: NetworkSpeech[] = [];
  networkSpeeches.push(...deliverNetworkMessages(world, frame, rules, 'player'));
  const directSpeakers = resolvePlayerSpeech(
    world, rules, frame.tick, frame.circles, utterances, askings,
  );

  const positions = playerPhase === undefined ? preflightPositions : positionsAt(world, frame.tick);
  const npcCircles = playerPhase === undefined
    ? preflightCircles
    : circlesFromPositions(world, frame.tick, positions);
  networkSpeeches.push(...deliverNetworkMessages(world, frame, rules, 'response'));
  resolveNpcSpeech(
    world, rules, frame.tick, npcCircles, utterances, askings, networkSpeeches, directSpeakers,
  );

  const events: TickEvents = { tick: frame.tick, positions, utterances, askings };
  if (networkSpeeches.length > 0) events.networkSpeeches = networkSpeeches;
  recordAndIngest(world, rules, events, utterances, askings, networkSpeeches);
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
