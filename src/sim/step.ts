import { dayOf, dayOfWeek, minuteOfDay, REST_DAY } from '../core/time';
import { circlesAt, positionOf } from './agents';
import { expireInquiries, runAskPhase } from './inquiry';
import { observationsFor, type Asking, type TickEvents, type Utterance } from './perception';
import { chooseTelling, ingest, CONVERSATION_BEAT } from './rumors/propagation';
import { mintClaim } from './rumors/claim';
import { captureEvidence, runEnemyDay } from './counterintel';
import { captureIntel } from './fieldwork';
import { payWagesNightly } from './network/roster';
import { runTurncoatPass } from './network/turncoats';
import { deliverCouriers } from './network/couriers';
import { reactToSelfRumor } from './reactions';
import { runVignettes } from './vignettes/engine';
import { scenarioNightly } from './scenario/referee';
import type { Rules } from './rules';
import type { WorldState } from './types';

/** Advance one tick. Movement -> circles -> tellings -> ingestion. Deterministic order. */
export function step(world: WorldState, rules: Rules): TickEvents {
  const t = world.tick;
  const positions = Object.fromEntries(
    Object.values(world.npcs).map((n) => [n.id, positionOf(world, n, t)]),
  );

  const utterances: Utterance[] = [];
  const askings: Asking[] = [];
  if (minuteOfDay(t) % CONVERSATION_BEAT === 0) {
    // The player's word opens the beat, in pinned deterministic order (before any NPC ask/tell).
    // Validated at apply-time this same tick; the circle is the same deterministic computation. The
    // claim mints EXACTLY as applyInject's hop-zero inject does, so tells and injects are alike.
    if (world.pendingTell && world.playerId !== null) {
      const pc = circlesAt(world, t).find((c) => c.members.includes(world.playerId!));
      if (pc) {
        const family = `f${world.claimCounter}`;
        const claim = mintClaim(world, { ...world.pendingTell.spec, family, parent: null });
        world.claims[claim.id] = claim;
        utterances.push({
          tick: t, venue: world.playerVenue!, circleMembers: pc.members,
          speaker: world.playerId, addressedTo: world.pendingTell.to, claim, mode: 'telling',
        });
      }
      world.pendingTell = null;
    }
    // The brokerage (Task 10): a sale is ALSO the player's word this beat, consumed the SAME way
    // (validated at apply-time; the circle re-found here, tell's own laxity mirrored — see
    // applyTell's comment). The claim is NEVER re-minted (the existing claim behind the best
    // intel version, already resolved at apply-time); effects (coin, dedupe, the buyer's belief)
    // land ATOMICALLY with the utterance — either the whole sale happens, or (circle vanished
    // since apply-time) none of it does, exactly like tell.
    if (world.pendingSell && world.playerId !== null) {
      const pc = circlesAt(world, t).find((c) => c.members.includes(world.playerId!));
      if (pc) {
        const { buyer, family, price, claimId } = world.pendingSell;
        const claim = world.claims[claimId]!;
        world.coin += price;
        world.network.sales.push({ family, buyer });
        world.beliefs[buyer]![family] = {
          claim, credence: 0.85, heardFrom: world.playerId, heardAt: t, firstHeardAt: t,
          timesHeard: 1, apparentSources: [world.playerId], discretion: false, counterSpun: false,
        };
        utterances.push({
          tick: t, venue: world.playerVenue!, circleMembers: pc.members,
          speaker: world.playerId, addressedTo: buyer, claim, mode: 'telling',
        });
      }
      world.pendingSell = null;
    }
    for (const circle of circlesAt(world, t)) {
      if (circle.members.length < 2) continue;
      const phase = runAskPhase(world, circle, t, rules);
      askings.push(...phase.askings);
      utterances.push(...phase.answers);
      const spoke = new Set(phase.spoke);
      for (const member of circle.members) {
        if (spoke.has(member)) continue;
        // The avatar never auto-tells — the human speaks (or doesn't). Bystander physics
        // (being heard, being addressed) are untouched; only volition is skipped.
        if (member === world.playerId) continue;
        const u = chooseTelling(world, member, circle, t, rules);
        if (u) utterances.push(u);
      }
    }
    // Couriers deliver: a tasked asset that shares a circle with its target THIS beat tells the
    // player's payload as an ordinary utterance (their schedule did the walking — zero new spread
    // machinery). The utterances fold into the SAME chronicle/capture/ingest passes below, so a
    // guard who overhears attributes the CARRIER, and the delivery is heard by the circle like any.
    utterances.push(...deliverCouriers(world, t, rules));
  }

  const events: TickEvents = { tick: t, positions, utterances, askings };

  for (const u of utterances) {
    world.chronicle.push({
      kind: 'telling', tick: u.tick, venue: u.venue, speaker: u.speaker,
      addressedTo: u.addressedTo, claimId: u.claim.id,
      heardBy: u.circleMembers.filter((m) => m !== u.speaker)
        .map((id) => ({ id, addressed: id === u.addressedTo })),
      mode: u.mode,
    });
  }

  for (const a of askings) {
    world.chronicle.push({
      kind: 'asking', tick: a.tick, venue: a.venue, speaker: a.speaker,
      addressedTo: a.addressedTo, about: a.about, authority: a.authority,
      heardBy: a.circleMembers.filter((m) => m !== a.speaker)
        .map((id) => ({ id, addressed: id === a.addressedTo })),
    });
  }

  // The enemy hears only what its people heard: capture reads the same feeds, gated by
  // vigilance, filtered through observer traits. Independent of ingestion — no-op when
  // there are no observers (Testford/miniTown), so old suites are untouched.
  const preLen = world.enemy.evidence.length;
  if (utterances.length > 0 || askings.length > 0) captureEvidence(world, events, rules);
  // Caught in the act: if THIS tick's capture logged the avatar as the speaker of an utterance, a
  // guard heard you say it — the campaign ends now. Status is data (P6 latch discipline): the world
  // keeps stepping if the driver steps it; we only latch, never short-circuit the rest of the tick.
  if (world.scenario?.status === 'running' && world.playerId !== null) {
    const pid = world.playerId;
    const caught = world.enemy.evidence
      .slice(preLen)
      .find((e) => e.kind === 'utterance' && e.speaker === pid);
    if (caught) {
      const s = world.scenario;
      s.status = 'lost-caught';
      s.resolution = { kind: 'lost-caught', day: dayOf(t), heardBy: caught.observer, venue: caught.venue };
      world.chronicle.push({
        kind: 'institution', tick: t, action: 'arrest',
        subject: pid, actors: [caught.observer], claimIds: caught.claimId ? [caught.claimId] : [],
      });
    }
  }

  // The player's mirror of capture: the avatar (unfiltered) and informants (trait-filtered)
  // sense through the SAME feeds. Runs UNCONDITIONALLY — presence capture needs event-less
  // ticks too, and positions are always in `events`. Self-guards to a no-op with no sources,
  // so player-free worlds (all prior suites) are untouched.
  captureIntel(world, events, rules);

  // Ingestion flows through the one perception path: every NPC hears exactly what
  // observationsFor grants them (same-circle utterances they did not speak). This is
  // the single encoding of the co-presence law — hearing is never re-derived here.
  if (utterances.length > 0 || events.askings.length > 0) {
    for (const hearerId of Object.keys(world.npcs).sort()) {
      // The avatar's mind is not modelled by the sim: it neither ingests gossip nor reacts to
      // rumors about itself (so reactToSelfRumor can never fire for it). Task 2's capture, not
      // this loop, builds the player's feed. Skip BEFORE observationsFor — cheap and total.
      if (hearerId === world.playerId) continue;
      const feed = observationsFor(hearerId, events);
      for (const obs of feed.observations) {
        if (obs.kind !== 'utterance') continue;
        ingest(world, hearerId, { tick: obs.tick, speaker: obs.speaker, claim: obs.claim }, !obs.overheard, rules);
        if (obs.claim.subject === hearerId) {
          reactToSelfRumor(world, hearerId, obs.claim.family, obs.tick, rules);
        }
      }
    }
  }

  // The nightly beat: digest today's evidence into countermeasures (world facts),
  // THEN sweep spent inquiries. No-op on rosters with no observers (old suites untouched).
  if (minuteOfDay(t) === 1439) {
    // The treasury's weekly beat, exactly on the rest-day nightly (day 6, 13, ...). PINNED ORDER
    // (Task 4): the stipend credits FIRST, then payroll debits — a treasury the stipend just topped
    // up covers that night's wages (books-balance depends on this; Task 12 asserts it). A wage
    // shortfall never refuses: it strikes the unpaid asset and slides its disposition.
    if (dayOfWeek(t) === REST_DAY) {
      world.coin += rules.economy.weeklyStipend;
      payWagesNightly(world, rules);
    }
    // Turncoats (Task 8), plan-verbatim: AFTER wages — a rest-day wage slide can push an eroded asset
    // under the flip line the SAME night — and BEFORE vignettes. Flip detection runs every night; the
    // weekly leak/walk-in emissions gate to the rest-day beat INSIDE the pass (the wage cadence).
    runTurncoatPass(world, rules);
    runEnemyDay(world, rules);          // digest today's evidence into countermeasures...
    expireInquiries(world, dayOf(t));   // ...THEN sweep spent inquiries.
    runVignettes(world, rules);         // ...THEN tonight's micro-scenes fire (pillar 7), so...
    scenarioNightly(world, rules);      // ...the institutions read a settled day incl. the vignettes.
  }

  world.tick = t + 1;
  return events;
}

export function runUntil(world: WorldState, endTick: number, rules: Rules): void {
  while (world.tick < endTick) step(world, rules);
}
