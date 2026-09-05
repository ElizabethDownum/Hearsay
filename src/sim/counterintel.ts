import { dayOf, TICKS_PER_DAY } from '../core/time';
import { observationsFor, type Observation, type TickEvents } from './perception';
import { juiciness, STANCE } from './rumors/propagation';
import { reportThrough } from './reporting';
import { enemyDigest, pressureFor } from './enemy/digest';
import { exposureStatus } from './scenario/exposure';
import type { Rules } from './rules';
import type { EnemyActionLedgerEntry, EnemyDecision, TailDrop, WatchPost } from './enemy/state';
import { INTERROGATION as INTERROGATION_WINDOW, WATCH as WATCH_WINDOW } from './enemy/state';
import type { WorldState } from './types';
import { stableStringify } from './hash';
import {
  holdFieldObservation, holdObservedFieldReportItems, ingestObservedFieldReport,
} from './directives/field-reports';
import type { ObserverSpec } from './enemy/state';
import { issueDirectiveRecord, strictNextBeat } from './directives/state';
import type { DirectiveBrief, DirectiveCorrelation } from './directives/types';
import type { EntityId } from './rumors/claim';

export function noticedByObserver(spec: ObserverSpec, observation: Observation, rules: Rules): boolean {
  if (observation.kind === 'utterance') {
    return !observation.overheard || juiciness(observation.claim, rules) >= 1 - spec.vigilance;
  }
  return observation.kind === 'asking' || observation.kind === 'network-speech';
}

function sourceDirectiveId(world: WorldState, messageId: string): string | null {
  const payload = world.network.directiveState?.messages.find((message) => message.id === messageId)?.payload;
  if (!payload) return null;
  if (payload.kind === 'directive') return payload.version.directiveId;
  if (payload.kind === 'directive-report') return payload.directiveId;
  if (payload.kind === 'handler-brief') return payload.sourceDirectiveId;
  return null;
}

function ingestEnemyObservation(
  world: WorldState, observer: string, observation: Observation, rules: Rules,
): void {
  if (observation.kind === 'utterance') {
    world.enemy.evidence.push({
      tick: observation.tick, venue: observation.venue, observer,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, kind: 'utterance', mode: observation.mode,
      claimId: observation.claim.id, family: observation.claim.family,
      reported: reportThrough(world, observer, observation.claim, rules, 'enemy'), about: null,
      ...(observation.document === true ? { document: true as const } : {}),
    });
  } else if (observation.kind === 'asking') {
    world.enemy.evidence.push({
      tick: observation.tick, venue: observation.venue, observer,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, kind: 'asking', mode: null,
      claimId: null, family: 'family' in observation.about ? observation.about.family : null,
      reported: null, about: observation.about,
    });
  } else if (observation.kind === 'network-speech') {
    const leaked = observation.spoken.kind === 'compartment-fact'
      ? { from: observation.spoken.asset, fact: { ...observation.spoken.fact } }
      : undefined;
    const evidenceObserver = leaked?.from ?? observer;
    const duplicate = world.enemy.evidence.some((entry) => entry.kind === 'network'
      && entry.tick === observation.tick && entry.observer === evidenceObserver
      && entry.speaker === observation.speaker
      && entry.network.messageId === observation.messageId);
    if (duplicate) return;
    world.enemy.evidence.push({
      tick: observation.tick, venue: observation.venue, observer: evidenceObserver,
      overheard: observation.overheard, speaker: observation.speaker,
      addressedTo: observation.addressedTo, kind: 'network', mode: null,
      claimId: null, family: null, reported: null, about: null,
      network: {
        messageId: observation.messageId,
        sourceDirectiveId: sourceDirectiveId(world, observation.messageId),
        spoken: JSON.parse(stableStringify(observation.spoken)),
      },
      ...(leaked ? { leaked } : {}),
    });
    ingestObservedFieldReport(world, 'enemy', {
      tick: observation.tick, venue: observation.venue, circleMembers: [],
      speaker: observation.speaker, addressedTo: observation.addressedTo,
      messageId: observation.messageId, spoken: observation.spoken, cause: null,
    });
  }
}

/**
 * The enemy's ONLY sensory input. Reads observers' feeds (never world state directly),
 * applies the vigilance rule, and appends to the evidence log the digest will consume.
 */
export function captureEvidence(world: WorldState, events: TickEvents, rules: Rules): void {
  const spymaster = world.network.spymaster;
  if (spymaster !== null && world.npcs[spymaster]) {
    for (const observation of observationsFor(spymaster, events).observations) {
      ingestEnemyObservation(world, spymaster, observation, rules);
    }
    for (const speech of events.networkSpeeches ?? []) {
      if (speech.speaker !== spymaster) continue;
      ingestEnemyObservation(world, spymaster, {
        kind: 'network-speech', tick: speech.tick, venue: speech.venue,
        speaker: speech.speaker, addressedTo: speech.addressedTo,
        messageId: speech.messageId, spoken: speech.spoken, overheard: false,
      }, rules);
    }
  }
  if (spymaster === null) return;

  const candidates: { spec: ObserverSpec; observation: Observation }[] = [];
  for (const spec of [...world.enemy.observers].sort((a, b) => a.id.localeCompare(b.id))) {
    if (spec.id === spymaster) continue;
    const observer = world.npcs[spec.id];
    if (!observer) continue;
    for (const observation of observationsFor(spec.id, events).observations) {
      if (noticedByObserver(spec, observation, rules)) candidates.push({ spec, observation });
    }
  }
  candidates.sort((a, b) => a.spec.id.localeCompare(b.spec.id)
    || stableStringify(a.observation).localeCompare(stableStringify(b.observation)));
  for (const { spec, observation } of candidates) {
    if (observation.kind === 'network-speech'
      && holdObservedFieldReportItems(world, 'enemy', spec.id, observation, [spymaster])) continue;
    holdFieldObservation(
      world, 'enemy', spec.id, { kind: 'raw', observation }, null,
      [spymaster], null, [],
    );
  }
}

// The interrogation/watch minute windows moved to `src/sim/enemy/state.ts` in Task 12 (one source of
// truth reachable from the no-omniscience side of the fence — the runaround rule inside `enemyDigest`
// has to know which minutes a posted guard was actually standing). The values are unchanged; every
// existing importer keeps reading them from here.
export { INTERROGATION, WATCH } from './enemy/state';

const aboutKey = (about: { family: string } | { subject: EntityId }): string =>
  'family' in about ? `f:${about.family}` : `s:${about.subject}`;
const inquiryOrderKey = (about: { family: string } | { subject: EntityId }): string =>
  `inquiry:${aboutKey(about)}`;
const interrogationOrderKey = (
  target: EntityId, about: { family: string } | { subject: EntityId },
): string => `interrogation:${target}:${aboutKey(about)}`;
const watchOrderKey = (district: string): string => `watch:${district}`;

export function enemyRoute(world: WorldState, recipient: EntityId): EntityId[] {
  const district = world.enemy.map.directory.find((person) => person.id === recipient)?.district ?? null;
  const relay = [...world.network.enemyAssets]
    .map((asset) => asset.id)
    .filter((id) => id !== recipient)
    .filter((id) => world.enemy.map.directory.find((person) => person.id === id)?.district === district)
    .sort()[0];
  return relay === undefined ? [recipient] : [relay, recipient];
}

const cancelOrderKey = (district: string, guard: EntityId): string =>
  `cancel:watch:${district}:${guard}`;

type OrderInput =
  | { kind: 'inquiry'; order: EnemyDecision['inquiries'][number] }
  | { kind: 'interrogation'; order: EnemyDecision['interrogations'][number] }
  | { kind: 'watch'; watch: EnemyDecision['watches'][number]; post: WatchPost }
  | { kind: 'cancel'; drop: TailDrop; post: WatchPost };

function orderBrief(
  world: WorldState, decision: EnemyDecision, input: OrderInput,
): { key: string; recipient: EntityId; brief: DirectiveBrief; correlation: DirectiveCorrelation } {
  const issueTick = world.tick;
  let key: string;
  let recipient: EntityId;
  let brief: DirectiveBrief;
  let sourceRef: string | null = null;
  if (input.kind === 'inquiry') {
    const { order } = input;
    key = inquiryOrderKey(order.about); recipient = order.asker;
    brief = {
      mission: { kind: 'learn', target: 'family' in order.about
        ? { kind: 'story', family: order.about.family }
        : { kind: 'person', id: order.about.subject } },
      priority: 'important', authority: 'office', discretion: 'open', specificity: 'guided',
      guidance: [], active: { from: strictNextBeat(issueTick), until: order.expiresDay * TICKS_PER_DAY - 1 },
      report: 'outcome', reportBy: null, purpose: null,
      application: { kind: 'enemy-inquiry', about: { ...order.about }, expiresDay: order.expiresDay },
    };
  } else if (input.kind === 'interrogation') {
    const { order } = input;
    key = interrogationOrderKey(order.target, order.about); recipient = order.guard;
    brief = {
      mission: { kind: 'learn', target: { kind: 'person', id: order.target } },
      priority: 'urgent', authority: 'compel', discretion: 'quiet', specificity: 'detailed',
      guidance: [{ kind: 'expected-presence', person: order.target, venue: order.venue,
        at: order.day * TICKS_PER_DAY + INTERROGATION_WINDOW.from }],
      active: { from: order.day * TICKS_PER_DAY + INTERROGATION_WINDOW.from,
        until: order.day * TICKS_PER_DAY + INTERROGATION_WINDOW.to - 1 },
      report: 'outcome', reportBy: null, purpose: null,
      application: { kind: 'enemy-interrogation', target: order.target,
        about: { ...order.about }, venue: order.venue, day: order.day },
    };
  } else if (input.kind === 'watch') {
    const { watch, post } = input;
    key = watchOrderKey(watch.district); recipient = post.guard;
    brief = {
      mission: { kind: 'learn', target: { kind: 'venue', id: post.venue } },
      priority: 'important', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      guidance: [{ kind: 'expected-presence', person: post.guard, venue: post.venue,
        at: watch.startDay * TICKS_PER_DAY + WATCH_WINDOW.from }],
      active: { from: watch.startDay * TICKS_PER_DAY + WATCH_WINDOW.from,
        until: (watch.startDay + 7) * TICKS_PER_DAY + WATCH_WINDOW.to - 1 },
      report: 'outcome', reportBy: null, purpose: null,
      // Task 12: the bound lead's subject/about ride the ORDER, so the returned report, the ledger
      // row, and the runaround touch rule all read one subject that one digest rule chose.
      application: { kind: 'enemy-watch', district: watch.district, post: { ...post },
        startDay: watch.startDay, subject: watch.subject ?? null,
        about: watch.about === undefined || watch.about === null ? null : { ...watch.about } },
    };
  } else {
    // Task 12: stand a tail down. The carried `cancel-watch` application (not the mission) selects
    // the stand-down behaviour at attempt, via Task 9's total application switch.
    const { drop, post } = input;
    key = cancelOrderKey(drop.district, post.guard); recipient = post.guard;
    sourceRef = `order:watch:${drop.district}:${post.guard}`;
    brief = {
      mission: { kind: 'learn', target: { kind: 'venue', id: post.venue } },
      priority: 'urgent', authority: 'office', discretion: 'quiet', specificity: 'detailed',
      guidance: [],
      active: { from: strictNextBeat(issueTick), until: (decision.day + 7) * TICKS_PER_DAY - 1 },
      report: 'outcome', reportBy: null, purpose: null,
      application: { kind: 'cancel-watch', district: drop.district, guard: post.guard,
        venue: post.venue, startDay: drop.watchStartDay },
    };
  }
  const leadFeatureId = input.kind === 'watch' ? input.watch.leadFeatureId ?? null
    : input.kind === 'interrogation' ? input.order.leadFeatureId ?? null
      : input.kind === 'cancel' ? input.drop.leadFeatureId
        : decision.features.find((feature) => {
          const about = input.order.about;
          return 'family' in about ? feature.family === about.family
            : feature.subject === about.subject;
        })?.id ?? null;
  return { key, recipient, brief, correlation: {
    kind: 'enemy-order', orderKey: key, leadFeatureId,
    sourceRef: sourceRef ?? `order:${key}:${recipient}`,
  } };
}

/**
 * Tail drops travel; they never teleport. HQ can only stand down posts it KNOWS about, so this reads
 * the enemy's OWN `actionLedger` row for `watch:<district>` at that schedule start day — and the
 * runaround guarantees the row exists, because the two wasted nights arrived as reports. One
 * cancellation per REMAINING ledger post, each an ordinary physical order to that exact guard.
 */
function cancelSpecs(
  world: WorldState, decision: EnemyDecision,
): ReturnType<typeof orderBrief>[] {
  const ledger: EnemyActionLedgerEntry[] = world.enemy.actionLedger ?? [];
  return (decision.tailDrops ?? []).flatMap((drop) => {
    const row = ledger.find((candidate) => candidate.orderKey === watchOrderKey(drop.district)
      && candidate.scheduleStartDay === drop.watchStartDay);
    if (!row) return [];
    return [...row.posts]
      .sort((a, b) => a.guard.localeCompare(b.guard) || a.venue.localeCompare(b.venue))
      .map((post) => orderBrief(world, decision, { kind: 'cancel', drop, post }));
  });
}

/** Record the digest and issue embodied orders; no remote operation is applied here. */
export function applyEnemyDecision(world: WorldState, decision: EnemyDecision): void {
  const enemy = world.enemy;
  enemy.decisions.push(decision);
  enemy.sketch.push(...decision.features);
  enemy.featureCounter += decision.features.length;
  enemy.digestedThrough = enemy.evidence.length;

  const spymaster = world.network.spymaster;
  if (spymaster === null || !world.npcs[spymaster]) return;
  const specs = [
    ...decision.inquiries.map((order) => orderBrief(world, decision, { kind: 'inquiry', order })),
    ...decision.interrogations.map((order) => orderBrief(world, decision, { kind: 'interrogation', order })),
    ...decision.watches.flatMap((watch) => watch.posts.map((post) =>
      orderBrief(world, decision, { kind: 'watch', watch, post }))),
    ...cancelSpecs(world, decision),
  ];
  const grouped = new Map<string, typeof specs>();
  for (const spec of specs) (grouped.get(spec.key) ?? grouped.set(spec.key, []).get(spec.key)!).push(spec);
  for (const [key, group] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
    if (enemy.pendingOrders?.some((pending) => pending.key === key)) continue;
    const directiveIds: string[] = [];
    let reconsiderAfterDay = decision.day;
    for (const spec of group) {
      // A person cannot physically hand a message to themself. Treat a digest-selected handler as
      // an unqueued member of the group; other guards still receive their own embodied orders.
      if (spec.recipient === spymaster) continue;
      const route = enemyRoute(world, spec.recipient);
      const record = issueDirectiveRecord(world, {
        principal: 'enemy', principalId: spymaster, recipient: spec.recipient,
        handoff: { outboundVia: route.slice(0, -1), reportVia: route.slice(0, -1).reverse() },
        brief: spec.brief, correlation: spec.correlation, tick: world.tick, cause: null,
      });
      directiveIds.push(record.id);
      reconsiderAfterDay = dayOf(spec.brief.active.until) + 2;
    }
    if (directiveIds.length === 0) continue;
    const pending = enemy.pendingOrders ?? (enemy.pendingOrders = []);
    pending.push({ key, issuedDay: decision.day, reconsiderAfterDay, directiveIds });
    const issued = enemy.issuedDirectiveIds ?? (enemy.issuedDirectiveIds = []);
    issued.push(...directiveIds);
  }
}

/**
 * The embodied spymaster's nightly countermeasure budget (Plan 8 §13; amendment #4, ratified:
 * "effectiveness loss = nightly countermeasure budget spent reacting to their own scandal"). This
 * is the WORLD-SIDE seam — it runs AFTER the digest and reads the spymaster's OWN belief store
 * (amendment-#3 machinery: `counterSpun` + credence), never digest input. The digest signature stays
 * `(EnemyState, day, rules)` and cannot see his mind, so the no-omniscience pillar holds UNCHANGED.
 *
 * Each un-counter-spun damaging self-rumor he holds at >= REPEAT stance consumes one countermeasure
 * slot; slots are spent interrogation-first, then watch (deterministic). He spends the night on his
 * own scandal instead of hunting you — the digest emits fewer orders, one dropped per scandal. No-op
 * when no spymaster is wired (a headless / hand-built world) or his mind holds no qualifying scandal.
 */
function spendCountermeasureBudget(world: WorldState, decision: EnemyDecision, rules: Rules): void {
  const spymaster = world.network.spymaster;
  if (spymaster === null) return;
  const store = world.beliefs[spymaster];
  if (!store) return;

  let slotsToSpend = 0;
  for (const belief of Object.values(store)) {
    if (belief.claim.subject !== spymaster) continue;                        // only rumors about HIM
    if (belief.counterSpun) continue;                                        // he already answered it
    if (rules.predicates[belief.claim.predicate]?.valence !== 'damaging') continue; // must sting
    if (belief.credence < STANCE.REPEAT) continue;                           // and be taken seriously
    slotsToSpend += 1;
  }
  if (slotsToSpend === 0) return;

  // Deterministic: the interrogation slot goes first, then the watch — one order per spent slot.
  if (slotsToSpend > 0 && decision.interrogations.length > 0) {
    decision.interrogations = decision.interrogations.slice(1);
    slotsToSpend -= 1;
  }
  if (slotsToSpend > 0 && decision.watches.length > 0) {
    decision.watches = decision.watches.slice(1);
    slotsToSpend -= 1;
  }
}

/**
 * The nightly beat: digest what the network sampled today, spend the spymaster's budget, act on
 * it. `pressure` (Plan 8 Task 10, exposure escalation tiers) is computed HERE — the world-side
 * seam — from `exposureStatus(world).score` (adjudicator-only, but runEnemyDay is world-side and
 * reads it the same lawful way the referee does) and threaded into the digest as a plain integer.
 * The digest signature stays a pure fold: it never sees `world`, only the single number this
 * function hands it, so the no-omniscience pillar holds UNCHANGED. Computed AFTER the observers-
 * empty guard, so an enemy-off world never even touches exposureStatus (the enemy-off pins never
 * move — Task 10 changes nothing about a headless/guardless roster).
 */
export function runEnemyDay(world: WorldState, rules: Rules): void {
  if (world.enemy.observers.length === 0) return;
  const day = dayOf(world.tick);
  if (world.enemy.pendingOrders) {
    world.enemy.pendingOrders = world.enemy.pendingOrders
      .filter((pending) => day <= pending.reconsiderAfterDay);
    if (world.enemy.pendingOrders.length === 0) delete world.enemy.pendingOrders;
  }
  const pressure = pressureFor(exposureStatus(world).score);
  const decision = enemyDigest(world.enemy, day, rules, pressure);
  spendCountermeasureBudget(world, decision, rules);
  applyEnemyDecision(world, decision);
}
