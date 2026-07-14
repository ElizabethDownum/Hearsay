import { dayOf } from '../core/time';
import { observationsFor, type Observation, type TickEvents } from './perception';
import { juiciness, STANCE } from './rumors/propagation';
import { reportThrough } from './reporting';
import { enemyDigest, pressureFor } from './enemy/digest';
import { exposureStatus } from './scenario/exposure';
import type { Rules } from './rules';
import type { EnemyDecision } from './enemy/state';
import type { WorldState } from './types';
import { stableStringify } from './hash';
import {
  holdFieldObservation, holdObservedFieldReportItems, ingestObservedFieldReport,
} from './directives/field-reports';
import type { ObserverSpec } from './enemy/state';

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
    const duplicate = world.enemy.evidence.some((entry) => entry.kind === 'network'
      && entry.tick === observation.tick && entry.observer === observer
      && entry.speaker === observation.speaker
      && entry.network.messageId === observation.messageId);
    if (duplicate) return;
    const leaked = observation.spoken.kind === 'compartment-fact'
      ? { from: observation.spoken.asset, fact: { ...observation.spoken.fact } }
      : undefined;
    world.enemy.evidence.push({
      tick: observation.tick, venue: observation.venue, observer,
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

// 15-alignment (spec): interrogations 900–1020. Watches retuned to 960–1140 (P6-T8): measured
// against evening gossip flow — the old {1080,1200} sat in a retell-cooldown lull and caught none
// of the 480/720/960/1200 bursts (1200 exclusive), so a watch's first capture arrived a day late.
// {960,1140} straddles the 960 cooldown-burst shoulder: +49% total public-venue utterance exposure
// over 5 procgen seeds, winning on every seed (tests/harness/watch-window.report.test.ts). Both
// bounds 15-aligned. INTERROGATION unchanged.
export const INTERROGATION = { from: 900, to: 1020 } as const;
export const WATCH = { from: 960, to: 1140 } as const;

function addOverride(world: WorldState, id: string, o: WorldState['scheduleOverrides'][string][number]): void {
  world.scheduleOverrides[id] = [...(world.scheduleOverrides[id] ?? []), o];
}

/** Decisions become world facts — all of them observable through ordinary perception. */
export function applyEnemyDecision(world: WorldState, decision: EnemyDecision): void {
  const enemy = world.enemy;
  enemy.decisions.push(decision);
  enemy.sketch.push(...decision.features);
  enemy.featureCounter += decision.features.length;
  enemy.digestedThrough = enemy.evidence.length;

  for (const q of decision.inquiries) {
    world.inquiries[q.asker] = [...(world.inquiries[q.asker] ?? []),
      { about: q.about, from: 'enemy', expiresDay: q.expiresDay, asked: [], answersHeard: 0 }];
    enemy.inquiriesIssued.push('family' in q.about ? `f:${q.about.family}` : `s:${q.about.subject}`);
  }
  for (const order of decision.interrogations) {
    enemy.interrogated.push(`${order.target}:${'family' in order.about ? `f:${order.about.family}` : `s:${order.about.subject}`}`);
    for (const id of [order.guard, order.target]) {
      addOverride(world, id, { fromDay: order.day, toDay: order.day + 1,
        from: INTERROGATION.from, to: INTERROGATION.to, venue: order.venue, source: 'enemy' });
    }
    world.inquiries[order.guard] = [...(world.inquiries[order.guard] ?? []),
      { about: order.about, from: 'enemy', expiresDay: order.day + 2, asked: [], answersHeard: 0 }];
  }
  for (const w of decision.watches) {
    enemy.watchedDistricts.push(w.district);
    for (const post of w.posts) {
      addOverride(world, post.guard, { fromDay: w.startDay, toDay: null,
        from: WATCH.from, to: WATCH.to, venue: post.venue, source: 'enemy' });
    }
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
  const pressure = pressureFor(exposureStatus(world).score);
  const decision = enemyDigest(world.enemy, dayOf(world.tick), rules, pressure);
  spendCountermeasureBudget(world, decision, rules);
  applyEnemyDecision(world, decision);
}
