import { dayOf, type Tick } from '../core/time';
import { mintClaim, type Claim, type EntityId, type VenueId } from './rumors/claim';
import type { TraitId } from './rumors/traits';
import type { WorldState } from './types';

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

/** Informant posting window (spec: 15-aligned, mid-day). Exported for the assign law + tests. */
export const ASSIGNMENT = { from: 960, to: 1200 } as const;

/** Move the avatar to a venue. Requires an enrolled player and a real venue. */
export function applyGoTo(world: WorldState, venue: VenueId): void {
  if (world.playerId === null) throw new Error('goTo: no player is enrolled');
  if (!world.venues[venue]) throw new Error(`goTo: unknown venue '${venue}'`);
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
    if (text !== null) card.text = text;
    if (confidence !== null) {
      if (!validConfidence(confidence)) throw new Error('card update: confidence must be in [0, 1]');
      card.confidence = confidence;
    }
    if (links !== null) card.links = links;
    card.updatedTick = tick;
    return;
  }
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`card remove: unknown id '${id}'`);
  cards.splice(idx, 1);
}
