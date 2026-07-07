import { dayOf, minuteOfDay, type Tick } from '../core/time';
import { circlesAt } from './agents';
import type { InquiryKey } from './perception';
import { CONVERSATION_BEAT } from './rumors/propagation';
import { mintClaim, type Claim, type EntityId, type VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import type { Venue, WorldState } from './types';

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

/** The avatar asks a circle-mate about a family/subject. Enqueues a 'self' inquiry task — the one
 *  place the avatar is a volitional asker (runAskPhase consumes it; it still never auto-answers). */
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
  tasks.push({ about, from: 'self', expiresDay: dayOf(tick) + 2, asked: [], answersHeard: 0 });
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
