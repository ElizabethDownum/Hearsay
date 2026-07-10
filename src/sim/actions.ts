import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { circlesAt } from './agents';
import type { InquiryKey } from './perception';
import { CONVERSATION_BEAT, STANCE } from './rumors/propagation';
import { mintClaim, SOMEONE, type Claim, type EntityId, type RumorId, type VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import type { Rules } from './rules';
import type { Belief, IntelEntry, ScheduleOverride, Venue, WorldState } from './types';
import type { Mice } from './network/types';
import { canAfford, debitCoin, dispositionOf, findAsset, setDispositionEdge, slideDisposition } from './network/roster';
import { recordFact } from './network/compartment';
import { blankIntel } from './fieldwork';
import { reportThrough } from './reporting';
import { confirmableUnderCompulsion } from './inquiry';

export interface InjectSpec {
  subject: Claim['subject'];
  predicate: Claim['predicate'];
  object: Claim['object'];
  count: Claim['count'];
  severity: Claim['severity'];
  place: Claim['place'];
  attribution: Claim['attribution'];
}

/** Player tells a rumor to one NPC. Hop zero — the town owns the rest. */
export function applyInject(
  world: WorldState, targetId: EntityId, spec: InjectSpec,
  by: 'player' | 'genesis' | EntityId = 'player',
): Claim {
  const store = world.beliefs[targetId];
  if (!store) throw new Error(`applyInject: unknown npc '${targetId}'`);
  const family = `f${world.claimCounter}`;
  const claim = mintClaim(world, { ...spec, family, parent: null });
  world.claims[claim.id] = claim;
  store[family] = {
    claim, credence: 0.85, heardFrom: 'injected', heardAt: world.tick,
    firstHeardAt: world.tick, timesHeard: 1, apparentSources: [],
    discretion: false, counterSpun: false,
  };
  world.chronicle.push({ kind: 'inject', tick: world.tick, target: targetId, claimId: claim.id, by });
  return claim;
}

/** The avatar speaks: hop zero made flesh. Valid only on a beat, to a circle-mate. Records the
 *  pending telling; the same tick's step mints the claim and emits the utterance (replay-exact). */
export function applyTell(world: WorldState, to: EntityId, spec: InjectSpec, tick: Tick): void {
  if (world.playerId === null) throw new Error('tell: no player is enrolled');
  if (world.playerVenue === null) throw new Error('tell: the avatar is nowhere');
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) throw new Error('tell: speech happens on conversation beats');
  if (!world.npcs[to]) throw new Error(`tell: unknown npc '${to}'`);
  if (world.pendingTell) throw new Error('tell: one telling per beat');
  const circle = circlesAt(world, tick).find((c) => c.members.includes(world.playerId!));
  if (!circle || !circle.members.includes(to)) {
    throw new Error(`tell: '${to}' is not in the avatar's circle this beat`);
  }
  world.pendingTell = { to, spec };
}

/**
 * Read severity from the family's BEST intel version the player holds: the highest-severity
 * `reported` entry in the player's OWN intel log for that family (never world truth — the same
 * epistemic stance coercion leverage takes, controller note 4). Ties break to the EARLIEST tick
 * (the first-known version) — a deterministic, zero-entropy pick. Null when the player holds no
 * intel entry for the family (an asking/presence/trait-read/... row never carries `reported`, so
 * this naturally excludes everything but utterance-kind rows).
 */
function bestIntelVersion(world: WorldState, family: RumorId): IntelEntry | null {
  let best: IntelEntry | null = null;
  for (const e of world.intel.log) {
    if (e.family !== family || e.reported === null) continue;
    if (best === null || e.reported.severity > best.reported!.severity ||
      (e.reported.severity === best.reported!.severity && e.tick < best.tick)) {
      best = e;
    }
  }
  return best;
}

/**
 * The brokerage (Plan 8 Task 10): sell a family you hold intel on to a buyer in your circle THIS
 * beat. Price = severity x `brokerSaleBase`, read from the family's BEST intel version (see
 * `bestIntelVersion` — the player's KNOWLEDGE prices the sale, not world truth). VALIDATE-BEFORE-
 * MUTATE: every precondition throws before any state change; one sale per (family, buyer) pair
 * ever (`world.network.sales`, the dedupe key).
 *
 * Effects are DEFERRED to the same tick's step() — the applyTell idiom: the sale's conversation
 * becomes an ordinary Utterance (speaker = avatar, mode 'telling'), so it rides the SAME capture /
 * caught-in-the-act physics as any other telling (selling info leaks it: your telling is
 * capturable like any tell). The claim is NOT re-minted — the buyer's belief store takes the
 * EXISTING claim behind the best intel version directly (applyInject's belief-entry idiom,
 * `apparentSources: [avatar]` so they now retell it by ordinary tellability), because it is the
 * SAME family entering their mind, never a fresh one.
 */
export function applySell(world: WorldState, buyer: EntityId, family: RumorId, tick: Tick, rules: Rules): void {
  if (world.playerId === null) throw new Error('sell: no player is enrolled');
  if (world.playerVenue === null) throw new Error('sell: the avatar is nowhere');
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) throw new Error('sell: speech happens on conversation beats');
  if (!world.npcs[buyer]) throw new Error(`sell: unknown npc '${buyer}'`);
  if (world.pendingSell) throw new Error('sell: one sale per beat');
  const circle = circlesAt(world, tick).find((c) => c.members.includes(world.playerId!));
  if (!circle || !circle.members.includes(buyer)) {
    throw new Error(`sell: '${buyer}' is not in the avatar's circle this beat`);
  }
  const best = bestIntelVersion(world, family);
  if (!best) throw new Error(`sell: you hold no intel on family '${family}' — you can't sell what you don't hold`);
  if (world.network.sales.some((s) => s.family === family && s.buyer === buyer)) {
    throw new Error(`sell: '${family}' has already been sold to '${buyer}'`);
  }
  const price = best.reported!.severity * rules.economy.brokerSaleBase;
  world.pendingSell = { buyer, family, price, claimId: best.claimId! };
}

/**
 * The avatar asks a named circle-mate about a family/subject — a FAMILY-1 speech act (like tell), not
 * family-2 dispatch (rider 11R). Enqueues a 'self' inquiry task RECORDING the addressee `to` (validated
 * in-circle just above): `runAskPhase` will address exactly them this same beat, never trust-repicking
 * or substituting, and consume the task at that firing beat. There is therefore NO 2-day / 2-answer
 * tail for player asks — `expiresDay` is only the tightest safety net (swept tonight) for a task that
 * could never fire; the normal path retires it the instant it fires. NPC inquiry-task semantics are
 * untouched (they place no addressee). It still never auto-answers — the human's testimony is not sim-driven.
 */
export function applyAsk(world: WorldState, to: EntityId, about: InquiryKey, tick: Tick): void {
  if (world.playerId === null) throw new Error('ask: no player is enrolled');
  if (world.playerVenue === null) throw new Error('ask: the avatar is nowhere');
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) throw new Error('ask: speech happens on conversation beats');
  if (!world.npcs[to]) throw new Error(`ask: unknown npc '${to}'`);
  const circle = circlesAt(world, tick).find((c) => c.members.includes(world.playerId!));
  if (!circle || !circle.members.includes(to)) {
    throw new Error(`ask: '${to}' is not in the avatar's circle this beat`);
  }
  const tasks = world.inquiries[world.playerId] ?? (world.inquiries[world.playerId] = []);
  tasks.push({ about, from: 'self', expiresDay: dayOf(tick) + 1, asked: [], answersHeard: 0, addressee: to });
}

/** Recruitment disposition floor by handle — the trust the recruit establishes toward the player.
 *  Coercion is lowest (they don't love you — nearest Task 8's flip line); ideology highest. */
const RECRUIT_DISPOSITION: Record<Mice, number> = {
  money: 0.6, ideology: 0.7, coercion: 0.5, ego: 0.6,
};

/** O3: the ONE uniform identity-exclusion refusal (see applyRecruit). It names no target and no
 *  category, so no throw string can leak guard / enemy-asset / spymaster status. */
const RECRUIT_EXCLUDED = 'recruit: this person cannot be recruited';

/**
 * Recruit an in-circle NPC onto the roster (spec's MICE). VALIDATE-BEFORE-MUTATE: every precondition
 * throws BEFORE any state changes, so a refused recruit leaves ZERO residue (no asset, informant,
 * edge, fact, or coin move). Recruitment is a conversation, like tell — beat-aligned, avatar present,
 * target in the avatar's circle this beat. Per-handle gate: `money` none; `ideology` needs the target
 * to already hold a damaging conviction about the usurper at ≥REPEAT (the cause is the coronation);
 * `coercion` needs `leverageFamily` to name a damaging family ABOUT the target in the PLAYER'S INTEL
 * LOG (never world truth — your leverage can be a lie you believe); `ego` none. Cost from the one
 * economy table; insufficient coin REFUSES (distinct from the nightly wage shortfall, which slides).
 */
export function applyRecruit(
  world: WorldState, target: EntityId, mice: Mice, leverageFamily: RumorId | null, tick: Tick, rules: Rules,
): void {
  if (world.playerId === null) throw new Error('recruit: no player is enrolled');
  if (world.playerVenue === null) throw new Error('recruit: the avatar is nowhere');
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) throw new Error('recruit: recruitment happens on conversation beats');
  if (!world.npcs[target]) throw new Error(`recruit: unknown npc '${target}'`);
  if (target === world.playerId) throw new Error('recruit: cannot recruit the avatar');

  // Identity exclusions (spec) — checked before the co-circle gate so a guard/cast member is refused
  // as such even when not in earshot. O3 (Plan 8 T12; T11 adjudication A; Ellie 2026-07-09): all four
  // excluded classes refuse with the SAME uniform message (RECRUIT_EXCLUDED). The message names no
  // category, so it can never hand the player a hidden-state oracle — that a target is a guard, the
  // enemy spymaster, or (the sharpest leak) a SECRETLY enemy-net asset, which a "already an asset"
  // string on someone the player never recruited would out. The residual recruitable/not oracle (a
  // refusal at all) is Ellie-ratified v1 tradecraft; composer-side sealing is structurally barred.
  if (world.enemy.observers.some((o) => o.id === target)) throw new Error(RECRUIT_EXCLUDED);
  const cast = world.scenario?.cast;
  if (cast && (cast.usurper === target || cast.council.includes(target))) throw new Error(RECRUIT_EXCLUDED);
  // The embodied spymaster (Task 7) is nobody's asset — his own gate; recruiting HIS asset is Task 8's
  // turncoat flow, a different verb. Both refuse with the SAME message as the guard/cast exclusions.
  if (world.network.spymaster === target) throw new Error(RECRUIT_EXCLUDED);
  if (findAsset(world, target)) throw new Error(RECRUIT_EXCLUDED);

  // Co-circle basis (recruitment is a conversation — the same validation shape as tell).
  const circle = circlesAt(world, tick).find((c) => c.members.includes(world.playerId!));
  if (!circle || !circle.members.includes(target)) {
    throw new Error(`recruit: '${target}' is not in the avatar's circle this beat`);
  }

  // Per-handle gate.
  if (mice === 'ideology') {
    const usurper = cast?.usurper;
    const leans = usurper !== undefined && Object.values(world.beliefs[target] ?? {}).some((b) =>
      b.claim.subject === usurper && rules.predicates[b.claim.predicate]?.valence === 'damaging' && b.credence >= STANCE.REPEAT);
    if (!leans) throw new Error('recruit: ideology needs the target to already hold a damaging conviction about the usurper');
  } else if (mice === 'coercion') {
    const holdsDirt = leverageFamily !== null && world.intel.log.some((e) =>
      e.family === leverageFamily && e.reported !== null && e.reported.subject === target
      && rules.predicates[e.reported.predicate]?.valence === 'damaging');
    if (!holdsDirt) throw new Error('recruit: coercion needs damaging leverage you hold on the target');
  }

  // Cost (validate-before-mutate: refuse an unaffordable recruit).
  const cost = rules.economy.recruitCost[mice];
  if (!canAfford(world, cost)) {
    throw new Error(`recruit: the treasury cannot cover this recruitment (${cost} needed, ${world.coin} held)`);
  }

  // --- Effects (all validation passed; edges-only writes keep the fixture clone sound) ---
  debitCoin(world, cost);
  world.network.assets.push({ id: target, mice, wagePaidThroughDay: dayOf(tick), strikes: 0, facts: [] });
  recordFact(world, target, { kind: 'recruited-by', ref: 'player' }); // tick-stamped from world.tick (=== tick)
  setDispositionEdge(world, target, RECRUIT_DISPOSITION[mice]);
  world.intel.informants.push({ id: target, assignedVenue: null });
}

/**
 * Place a dead drop at a PUBLIC venue (Plan 8 rung 2 — a drop breaks co-location). The placer is the
 * avatar, who knows it implicitly (`knownBy` seeds with the player). VALIDATE-BEFORE-MUTATE: a private/
 * unknown venue, a duplicate id, or an unaffordable setup REFUSES with zero residue. Cost from the one
 * economy table. No co-location needed — you designate the drop, the courier learns it at tasking.
 */
export function applySetDrop(world: WorldState, id: string, venue: VenueId, rules: Rules): void {
  if (world.playerId === null) throw new Error('setDrop: no player is enrolled');
  const v = world.venues[venue];
  if (!v) throw new Error(`setDrop: unknown venue '${venue}'`);
  if (v.access !== 'public') throw new Error(`setDrop: a dead drop hides in a public venue — '${venue}' is ${v.access}`);
  if (world.network.drops.some((d) => d.id === id)) throw new Error(`setDrop: duplicate drop id '${id}'`);
  const cost = rules.economy.deadDropSetup;
  if (!canAfford(world, cost)) {
    throw new Error(`setDrop: the treasury cannot cover this dead drop (${cost} needed, ${world.coin} held)`);
  }
  debitCoin(world, cost);
  world.network.drops.push({ id, venue, knownBy: [world.playerId] });
}

/**
 * Task one of YOUR assets to courier a payload to a target — store-and-forward made purchasable
 * (Plan 8 rung 2). The run queues on the asset (NetworkState.pendingCouriers); delivery is the asset's
 * next co-circle with the target, their schedule doing the walking (step's deliverCouriers). ZERO new
 * spread machinery: the delivery is an ordinary utterance, trait-transformed by the ASSET's real traits.
 *
 * VALIDATE-BEFORE-MUTATE — every precondition throws before any state changes (zero residue on refusal):
 *  - the asset must be one of YOUR assets; the target a real NPC.
 *  - Ideology refusal: an ideology asset won't smear its own side (subject's faction === the asset's
 *    faction && the predicate is damaging → throw, term-registered).
 *  - Face handoff (viaDrop null): beat-aligned + avatar present + the courier IN the avatar's circle
 *    this beat (the tell/recruit shape) — records a `met-asset` fact (the courier met the avatar).
 *  - Via a drop: the handoff leg is SKIPPED — no co-location, no `met-asset`; the named drop must exist
 *    and be avatar-known, the courier LEARNS it (a `knows-drop` fact) and the drop's knownBy grows.
 * Cost debits now; the 3-day expiry (step) never refunds — a priced failure.
 */
export function applyCourier(
  world: WorldState, asset: EntityId, spec: InjectSpec, target: EntityId, viaDrop: string | null,
  tick: Tick, rules: Rules,
): void {
  if (world.playerId === null) throw new Error('courier: no player is enrolled');
  const record = world.network.assets.find((a) => a.id === asset);
  if (!record) throw new Error(`courier: '${asset}' is not one of your assets`);
  if (!world.npcs[target]) throw new Error(`courier: unknown npc '${target}'`);

  // Ideology won't carry a smear of its own faction (the refusal law the debrief will reuse, Task 9).
  if (record.mice === 'ideology' && spec.subject !== SOMEONE) {
    const assetFaction = world.npcs[asset]!.faction;
    const subjectFaction = world.npcs[spec.subject]?.faction;
    const valence = rules.predicates[spec.predicate]?.valence;
    if (subjectFaction === assetFaction && valence === 'damaging') {
      throw new Error(`courier: '${asset}' is an ideology asset and refuses to carry a damaging claim about their own faction`);
    }
  }

  // The handoff leg. Face: co-locate now (validate-before-mutate — the tell/recruit circle shape).
  if (viaDrop === null) {
    if (world.playerVenue === null) throw new Error('courier: the avatar is nowhere for a face handoff');
    if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) throw new Error('courier: a face handoff happens on conversation beats');
    const circle = circlesAt(world, tick).find((c) => c.members.includes(world.playerId!));
    if (!circle || !circle.members.includes(asset)) {
      throw new Error(`courier: '${asset}' is not in the avatar's circle this beat for the handoff`);
    }
  } else {
    const drop = world.network.drops.find((d) => d.id === viaDrop);
    if (!drop) throw new Error(`courier: unknown dead drop '${viaDrop}'`);
    if (!drop.knownBy.includes(world.playerId)) throw new Error(`courier: you don't know the dead drop '${viaDrop}'`);
  }

  // Cost (validate-before-mutate: refuse an unaffordable run).
  const cost = rules.economy.courierRun;
  if (!canAfford(world, cost)) {
    throw new Error(`courier: the treasury cannot cover this run (${cost} needed, ${world.coin} held)`);
  }

  // --- Effects (all validation passed; edges-only + roster/queue writes keep the fixture clone sound) ---
  debitCoin(world, cost);
  if (viaDrop === null) {
    // A face handoff is a meeting: the courier's compartment records having met the avatar (ONE
    // direction — the avatar keeps no compartment). This is the `met-asset` that the drop path lacks.
    recordFact(world, asset, { kind: 'met-asset', ref: world.playerId });
  } else {
    const drop = world.network.drops.find((d) => d.id === viaDrop)!;
    if (!drop.knownBy.includes(asset)) drop.knownBy.push(asset);
    recordFact(world, asset, { kind: 'knows-drop', ref: viaDrop });
  }
  world.network.pendingCouriers.push({ asset, spec, target, viaDrop, queuedTick: tick });
}

/** The invitee cap on a hosted event (spec, rung 4) — you pick the circle, but a room seats only so many. */
export const HOST_INVITEE_CAP = 6;
/** The acceptance floor: only NPCs whose trust toward the player is ≥ this accept an invitation. */
const HOST_ACCEPT_TRUST = 0.5;
/** The hosted event's evening block (spec: 1080–1200, source 'player'), placed on the invitees' NEXT evening. */
export const HOST_EVENT = { from: 1080, to: 1200 } as const;

/**
 * Rung 3 — the safehouse meet. Pull one of YOUR assets to the private safehouse for the NEXT
 * conversation beat only: a guaranteed 2-person circle (the safehouse is private with no regulars, so
 * the pulled asset and the avatar are its only occupants) for a tell/ask/debrief with ZERO overhear
 * risk. The pull is a one-beat, 15-aligned, source-'player' schedule OVERRIDE (the assignInformant
 * override shape — never a base-schedule write, Task 3's edges-/overrides-only discipline), PREPENDED
 * so a transient meet wins over any standing player posting for its one beat and the posting resumes
 * the next beat. FREE — the economy table prices no meet; the WALK is the price (the asset's movement
 * is public presence, and a `met-asset` fact lands on the record: contact tracing's handle). The avatar
 * attends by being at (or going to) the safehouse, which the access law always opens — meet never moves
 * the avatar. VALIDATE-BEFORE-MUTATE: no-player / non-asset / no-safehouse REFUSES with zero residue.
 */
export function applyMeet(world: WorldState, asset: EntityId, tick: Tick): void {
  if (world.playerId === null) throw new Error('meet: no player is enrolled');
  if (!world.venues['safehouse']) throw new Error('meet: this world has no safehouse');
  if (!world.network.assets.some((a) => a.id === asset)) {
    throw new Error(`meet: '${asset}' is not one of your assets`);
  }
  // The next conversation beat STRICTLY after `tick` (absolute-tick arithmetic carries the day rollover).
  const nextBeat = (Math.floor(tick / CONVERSATION_BEAT) + 1) * CONVERSATION_BEAT;
  const override: ScheduleOverride = {
    fromDay: dayOf(nextBeat), toDay: dayOf(nextBeat) + 1,
    from: minuteOfDay(nextBeat), to: minuteOfDay(nextBeat) + CONVERSATION_BEAT,
    venue: 'safehouse', source: 'player',
  };
  // Prepend (not the assignInformant REPLACE): a meet is a transient pull, so it takes precedence for
  // its one beat over any standing player override, which resumes automatically once the window passes.
  world.scheduleOverrides[asset] = [override, ...(world.scheduleOverrides[asset] ?? [])];
  recordFact(world, asset, { kind: 'met-asset', ref: world.playerId }); // the visit, on the record
}

/** The room a standing HOSTS in (rung 4): noble → the salon, lowlife → any back-room. Stricter than the
 *  access law (which also opens public/safehouse) — an event is thrown ONLY at the standing's own room. */
function isHostRoom(station: 'noble' | 'lowlife', venue: VenueId): boolean {
  return station === 'noble' ? venue === 'salon' : venue.startsWith('back-room-');
}

/**
 * Rung 4 — the hosted room. Throw a salon (noble) / back-room (lowlife) evening: the invitees' NEXT
 * evening gains the event block (1080–1200, source 'player' — the assignInformant override shape,
 * PREPENDED so the event wins over a standing posting), and an `attended-hosting` fact lands on every
 * invitee (guest lists are evidence when compartments crack). A controlled room: you pick the circle,
 * sampling + injection in one place, with no bystander overhear. VALIDATE-BEFORE-MUTATE — every
 * precondition throws before any state changes (zero residue on refusal):
 *  - a standing must host its OWN room (noble→salon, lowlife→back-room); the wrong room REFUSES.
 *  - 1..6 distinct invitees, none the avatar (the invitee cap, spec).
 *  - the acceptance gate: each invitee's trust toward the player must be ≥ 0.5 (you can't summon
 *    strangers — a strike-slid asset that dropped under 0.5 stops coming). dispositionOf ≥ 0.5 implies
 *    roster membership (only assets carry a player-trust edge), so the effects' recordFact never throws.
 *  - the event cost (salon 8 / back-room 4) from the one economy table; an unaffordable event REFUSES.
 * The avatar attends by going to their own room at the event (the access law opens it) — host never
 * moves the avatar and never sets playerVenue.
 */
export function applyHost(
  world: WorldState, venue: VenueId, invitees: EntityId[], tick: Tick, rules: Rules,
): void {
  if (world.playerId === null) throw new Error('host: no player is enrolled');
  if (world.station === null) throw new Error('host: no standing to host an event');
  if (!world.venues[venue]) throw new Error(`host: unknown venue '${venue}'`);
  if (!isHostRoom(world.station, venue)) {
    throw new Error(world.station === 'noble'
      ? `host: a noble hosts in the salon, not '${venue}' — you'd have no standing there`
      : `host: a lowlife hosts in a back-room, not '${venue}' — you'd have no standing there`);
  }
  if (invitees.length === 0) throw new Error('host: an event needs at least one invitee');
  if (invitees.length > HOST_INVITEE_CAP) {
    throw new Error(`host: the invitee cap is ${HOST_INVITEE_CAP} (got ${invitees.length})`);
  }
  if (new Set(invitees).size !== invitees.length) throw new Error('host: duplicate invitee');
  for (const id of invitees) {
    if (id === world.playerId) throw new Error('host: the avatar cannot be their own invitee');
    if (!world.npcs[id]) throw new Error(`host: unknown npc '${id}'`);
    if (dispositionOf(world, id) < HOST_ACCEPT_TRUST) {
      throw new Error(`host: '${id}' will not accept — trust below ${HOST_ACCEPT_TRUST} (you can't summon strangers)`);
    }
  }
  const cost = world.station === 'noble' ? rules.economy.salonEvent : rules.economy.backRoomEvent;
  if (!canAfford(world, cost)) {
    throw new Error(`host: the treasury cannot cover this event (${cost} needed, ${world.coin} held)`);
  }

  // --- Effects (all validation passed) ---
  debitCoin(world, cost);
  for (const id of invitees) {
    const override: ScheduleOverride = {
      fromDay: dayOf(tick) + 1, toDay: dayOf(tick) + 2,
      from: HOST_EVENT.from, to: HOST_EVENT.to, venue, source: 'player',
    };
    world.scheduleOverrides[id] = [override, ...(world.scheduleOverrides[id] ?? [])];
    recordFact(world, id, { kind: 'attended-hosting', ref: venue }); // the guest list, on the record
  }
}

/**
 * The asset's own pick when compelled with no family named (Amendment #4b's typed action carries no
 * family field): the OLDEST belief in their store by `firstHeardAt` — that field's own doc comment
 * ("the debrief timeline reads this") marks it as this feature's substrate, so debrief reads the
 * existing field rather than minting a new rule. Ties broken alphabetically by family (matchBelief's
 * own tie-break, mirrored).
 *
 * The candidates are filtered by `confirmableUnderCompulsion` (inquiry.ts) — the compelled machinery
 * bypasses discretion and the trust gate, but the DISMISS floor and the self-dirt block are
 * `compelled`-independent and hold here too. So debrief answers about the oldest thing the asset CAN
 * be compelled to confirm; a floored belief (self-dirt or below-DISMISS) is silently skipped — the
 * asset never confirms THAT (mirroring chooseAnswer's null), it produces no refusal signal. Null when
 * NO belief survives the floors (or the store is empty) — a whole-debrief refusal upstream.
 */
function oldestConfirmableBelief(
  store: Record<string, Belief>, answererId: EntityId, rules: Rules,
): { family: RumorId; belief: Belief } | null {
  let best: Belief | null = null;
  let bestFamily = '';
  for (const family of Object.keys(store).sort()) {
    const b = store[family]!;
    if (!confirmableUnderCompulsion(b, answererId, rules)) continue;
    if (best === null || b.firstHeardAt < best.firstHeardAt) { best = b; bestFamily = family; }
  }
  return best ? { family: bestFamily, belief: best } : null;
}

/**
 * Amendment #4b — debrief under pressure: the compulsion machinery pointed at your OWN payroll.
 * Valid at the safehouse with the asset actually present (a Task 6 meet arranges this, or organic
 * co-presence — "luck"): the same beat-validation shape as tell/recruit, specialized to the one
 * venue (playerVenue === safehouse AND the asset in the avatar's circle there this beat).
 *
 * The asset answers ONE asking about the OLDEST family they CAN be compelled to confirm, AS IF
 * COMPELLED — discretion is bypassed entirely (your authority over your own payroll: chooseAnswer's
 * 0.7-confide gate and its trust≤0 gate never run here). But the two `compelled`-independent floors
 * STILL hold (`confirmableUnderCompulsion`, inquiry.ts): the DISMISS floor and the self-dirt block
 * ("never confirm dirt on yourself, not even behind closed doors"). A floored belief is silently
 * skipped by the pick — the asset simply never confirms THAT one, no refusal signal. The intel entry
 * rides `reportThrough` — the SAME channel every other report rides (one mechanic, no special-casing):
 * a turned asset's compelled answer is doctored exactly like their story reports.
 *
 * Cost is NOT coin: a disposition strike, via the SAME `slideDisposition` the nightly wage shortfall
 * uses (−0.1 trust) plus +1 on the strike counter. ZERO new constants — the existing 0.7 confide line
 * (chooseAnswer) and Task 8's 0.4 flip line (FLIP_DISPOSITION) already price the heavy-handedness;
 * debrief only ever pushes an asset toward them.
 *
 * Ideology refusal: the SAME law as courier (won't give up a damaging claim about their own faction),
 * checked against the ONE family the deterministic pick selects — there is no other family to fall
 * back to, so a refusal here refuses the WHOLE debrief.
 *
 * VALIDATE-BEFORE-MUTATE: every precondition — not-your-asset, wrong venue, off-beat, not co-present,
 * no belief the asset can be compelled to confirm (empty store OR all beliefs floored), the ideology
 * refusal — throws before any state change (zero residue).
 */
export function applyDebrief(world: WorldState, asset: EntityId, tick: Tick, rules: Rules): void {
  if (world.playerId === null) throw new Error('debrief: no player is enrolled');
  const record = world.network.assets.find((a) => a.id === asset);
  if (!record) throw new Error(`debrief: '${asset}' is not one of your assets`);
  if (world.playerVenue !== 'safehouse') throw new Error('debrief: the avatar must be at the safehouse');
  if (minuteOfDay(tick) % CONVERSATION_BEAT !== 0) throw new Error('debrief: debriefing happens on conversation beats');
  const circle = circlesAt(world, tick).find((c) => c.members.includes(world.playerId!));
  if (!circle || !circle.members.includes(asset)) {
    throw new Error(`debrief: '${asset}' is not with you at the safehouse this beat`);
  }

  const picked = oldestConfirmableBelief(world.beliefs[asset] ?? {}, asset, rules);
  if (!picked) throw new Error(`debrief: '${asset}' holds nothing they can be compelled to confirm`);
  const { belief } = picked;

  // Ideology won't give up its own faction under pressure either (the refusal law courier reuses).
  if (record.mice === 'ideology' && belief.claim.subject !== SOMEONE) {
    const assetFaction = world.npcs[asset]!.faction;
    const subjectFaction = world.npcs[belief.claim.subject]?.faction;
    const valence = rules.predicates[belief.claim.predicate]?.valence;
    if (subjectFaction === assetFaction && valence === 'damaging') {
      throw new Error(`debrief: '${asset}' is an ideology asset and refuses to give up their own faction under pressure`);
    }
  }

  // --- Effects (all validation passed) ---
  world.intel.log.push({
    ...blankIntel(), tick, venue: 'safehouse', via: asset,
    kind: 'utterance', overheard: false, speaker: asset, addressedTo: world.playerId,
    mode: 'answer', claimId: belief.claim.id, family: belief.claim.family,
    reported: reportThrough(world, asset, belief.claim, rules),
  });
  slideDisposition(world, asset, -0.1); // Amendment #4b's disposition strike — the wage-slide mechanics, reused
  record.strikes += 1;                  // +1 strike, the same ledger wages use
}

/** Informant posting window (spec: 15-aligned, mid-day). Exported for the assign law + tests. */
export const ASSIGNMENT = { from: 960, to: 1200 } as const;

/**
 * The access law (Plan 8): whether a given standing opens `venue` without suspicion.
 * public always · safehouse always · invitational: noble → salon only, lowlife → back-rooms only
 * (guard-post + every other invitational shut to both) · private never (engineered invitations are
 * post-v1 — the séance grave is Plan 9's own verb).
 */
export function venueOpensFor(station: 'noble' | 'lowlife', venue: Venue): boolean {
  if (venue.access === 'public') return true;
  if (venue.id === 'safehouse') return true;
  if (venue.access === 'private') return false;
  // invitational — only the room this standing hosts
  if (venue.id === 'salon') return station === 'noble';
  if (venue.id.startsWith('back-room-')) return station === 'lowlife';
  return false;
}

/**
 * The access law as a boolean (no throw) — the ONE predicate the UI/probe seam reuses. Inert
 * (every real venue opens) when no standing has been dealt: the P7 pre-station behavior. Unknown
 * venue → false.
 */
export function canEnter(world: WorldState, venue: VenueId): boolean {
  const v = world.venues[venue];
  if (!v) return false;
  return world.station === null || venueOpensFor(world.station, v);
}

/** The term-registered refusal for a door the standing doesn't open. */
function accessDenial(v: Venue): string {
  if (v.access === 'private') {
    return `goTo: '${v.id}' is private — no engineered invitation exists (post-v1)`;
  }
  if (v.id === 'salon') return `goTo: no standing at the salon — you'd be conspicuous`;
  if (v.id.startsWith('back-room-')) return `goTo: no standing in the back rooms — you'd be conspicuous`;
  return `goTo: no standing at the guard post — you'd be conspicuous`;
}

/**
 * Move the avatar to a venue. Requires an enrolled player and a real venue, and — once the seed has
 * dealt a standing (`world.station`) — that the standing opens that door (the access law). The P7
 * UI-only gate retires here: the sim now enforces it, so bots/fixtures using public venues stay
 * untouched while a station-bearing campaign is bound by the law.
 */
export function applyGoTo(world: WorldState, venue: VenueId): void {
  if (world.playerId === null) throw new Error('goTo: no player is enrolled');
  const v = world.venues[venue];
  if (!v) throw new Error(`goTo: unknown venue '${venue}'`);
  if (world.station !== null && !venueOpensFor(world.station, v)) throw new Error(accessDenial(v));
  world.playerVenue = venue;
}

/**
 * Post an informant to a venue (or unassign with null). Replaces ONLY this informant's own
 * player-placed override (source:'player') — enemy overrides on the same NPC are untouched.
 */
export function applyAssignInformant(
  world: WorldState, informant: EntityId, venue: VenueId | null, tick: Tick,
): void {
  const spec = world.intel.informants.find((i) => i.id === informant);
  if (!spec) throw new Error(`assignInformant: '${informant}' is not an informant`);
  if (venue !== null && !world.venues[venue]) throw new Error(`assignInformant: unknown venue '${venue}'`);
  spec.assignedVenue = venue;
  const kept = (world.scheduleOverrides[informant] ?? []).filter((o) => o.source !== 'player');
  if (venue !== null) {
    kept.push({
      fromDay: dayOf(tick) + 1, toDay: null,
      from: ASSIGNMENT.from, to: ASSIGNMENT.to, venue, source: 'player',
    });
  }
  if (kept.length === 0) delete world.scheduleOverrides[informant];
  else world.scheduleOverrides[informant] = kept;
}

/** Add/remove a trait hypothesis in the Codex. Propose is idempotent per (npc, trait). */
export function applyCodex(
  world: WorldState, op: 'propose' | 'retract', npc: EntityId, trait: TraitId, tick: Tick,
): void {
  if (!world.npcs[npc]) throw new Error(`codex: unknown npc '${npc}'`);
  const codex = world.intel.codex;
  if (op === 'propose') {
    if (!codex.some((c) => c.npc === npc && c.trait === trait)) {
      codex.push({ npc, trait, proposedAt: tick });
    }
  } else {
    world.intel.codex = codex.filter((c) => !(c.npc === npc && c.trait === trait));
  }
}

function validConfidence(c: number): boolean {
  return c >= 0 && c <= 1;
}

/** Add/update/remove a hypothesis card. Garbage (dup id, bad confidence, unknown id) throws. */
export function applyCard(
  world: WorldState, op: 'add' | 'update' | 'remove', id: string,
  text: string | null, confidence: number | null, links: string[] | null, tick: Tick,
): void {
  const cards = world.intel.cards;
  if (op === 'add') {
    if (cards.some((c) => c.id === id)) throw new Error(`card add: duplicate id '${id}'`);
    if (text === null) throw new Error('card add: text is required');
    if (confidence === null || !validConfidence(confidence)) {
      throw new Error('card add: confidence must be a number in [0, 1]');
    }
    cards.push({ id, text, confidence, links: links ?? [], createdTick: tick, updatedTick: tick });
    return;
  }
  if (op === 'update') {
    const card = cards.find((c) => c.id === id);
    if (!card) throw new Error(`card update: unknown id '${id}'`);
    // Validate BEFORE any mutation: a dropped bad-confidence update must leave the card untouched,
    // or a partial text write survives live but never enters the (rejected) log — a live≠replay
    // hazard now that the UI submits card updates. Validation first, then all-or-nothing mutation.
    if (confidence !== null && !validConfidence(confidence)) {
      throw new Error('card update: confidence must be in [0, 1]');
    }
    if (text !== null) card.text = text;
    if (confidence !== null) card.confidence = confidence;
    if (links !== null) card.links = links;
    card.updatedTick = tick;
    return;
  }
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`card remove: unknown id '${id}'`);
  cards.splice(idx, 1);
}

/** Margin-note target kinds (amendment #5b) — existence of the pointed-at thing is never
 *  validated, only that its kind is one the UI knows how to point at. */
const TAG_TARGET_KINDS = ['npc', 'entry', 'cluster', 'informant', 'venue'] as const;

function validTagTarget(target: string): boolean {
  return TAG_TARGET_KINDS.some((k) => target.startsWith(`${k}:`));
}

/** Add/update/remove a margin note. Garbage (dup id, bad target prefix, unknown id) throws —
 *  the same validation shape as applyCard, mirrored field-for-field. */
export function applyTag(
  world: WorldState, op: 'add' | 'update' | 'remove', id: string,
  target: string | null, text: string | null, tick: Tick,
): void {
  const tags = world.intel.tags;
  if (op === 'add') {
    if (tags.some((t) => t.id === id)) throw new Error(`tag add: duplicate id '${id}'`);
    if (target === null) throw new Error('tag add: target is required');
    if (!validTagTarget(target)) {
      throw new Error(`tag add: target must start with npc:|entry:|cluster:|informant:|venue: (got '${target}')`);
    }
    if (text === null) throw new Error('tag add: text is required');
    tags.push({ id, target, text, createdTick: tick, updatedTick: tick });
    return;
  }
  if (op === 'update') {
    const tag = tags.find((t) => t.id === id);
    if (!tag) throw new Error(`tag update: unknown id '${id}'`);
    if (target !== null) {
      if (!validTagTarget(target)) {
        throw new Error(`tag update: target must start with npc:|entry:|cluster:|informant:|venue: (got '${target}')`);
      }
      tag.target = target;
    }
    if (text !== null) tag.text = text;
    tag.updatedTick = tick;
    return;
  }
  const idx = tags.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`tag remove: unknown id '${id}'`);
  tags.splice(idx, 1);
}
