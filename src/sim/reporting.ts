import { applyTraits, type TraitContext } from './rumors/traits';
import type { Claim } from './rumors/claim';
import type { ReportedClaim } from './enemy/state';
import type { Npc, WorldState } from './types';
import type { Rules } from './rules';
import { isTurnedAsset } from './network/roster';

function ctxOf(npc: Npc, world: WorldState): TraitContext {
  return {
    ownerId: npc.id, faction: npc.faction, rivals: npc.rivals,
    factionOf: (e) => world.npcs[e]?.faction ?? null,
  };
}

/**
 * What a claim sounds like after passing through the reporter's firmware — its traits get
 * their say before any consumer reads it. Pure. The one encoding of "reports lie": the
 * enemy's evidence capture and the player's informant feed both report THROUGH this.
 *
 * Ego overlay (Plan 8 Task 4): an ego-recruited asset exaggerates chronically. The overlay is
 * ONE MECHANIC — the registered `exaggerator` transform composed AFTER the reporter's real traits,
 * never a bespoke doubling and never a traits write (it lives on the roster: `mice === 'ego'`, and
 * is permanent while the record stands). Reads the PLAYER-side roster: the enemy-side mirror is
 * Task 7's concern. No asset / non-ego reporter → the chain is exactly the real traits (unchanged).
 *
 * Turncoat doctoring (Plan 8 Task 8): a TURNED player-side asset walks their story reports DOWN —
 * the registered `minimizer` transform composed LAST, on top of everything above (the ego-overlay
 * idiom, inverted). Disclosed composition order: REAL traits → ego overlay (if ego) → doctoring (if
 * turned). One mechanic — each layer is a registered `TraitDef.transform` on the chain, never a
 * bespoke reduction. This only ever fires on the PLAYER'S channel: a turned asset is nobody's enemy
 * observer, so captureEvidence never routes through here for them.
 */
export function reportThrough(world: WorldState, reporterId: string, claim: Claim, rules: Rules): ReportedClaim {
  const reporter = world.npcs[reporterId]!;
  const traits = reporter.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const exaggerator = rules.traits['exaggerator'];
  const minimizer = rules.traits['minimizer'];
  const isEgoAsset = world.network.assets.some((a) => a.id === reporterId && a.mice === 'ego');
  const chain = [
    ...traits,
    ...(isEgoAsset && exaggerator ? [exaggerator] : []),
    ...(isTurnedAsset(world, reporterId) && minimizer ? [minimizer] : []),
  ];
  const filtered = { ...claim, ...applyTraits(chain, claim, ctxOf(reporter, world)) };
  const { subject, predicate, object, count, severity, place, attribution } = filtered;
  return { subject, predicate, object, count, severity, place, attribution };
}
