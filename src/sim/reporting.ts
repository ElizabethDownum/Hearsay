import { applyTraits, traitContextOf } from './rumors/traits';
import type { Claim, EntityId } from './rumors/claim';
import type { ReportedClaim } from './enemy/state';
import type { WorldState } from './types';
import type { Rules } from './rules';
import type { Principal } from './network/types';
import { assetFor, isTurnedAgainst } from './network/roster';

/**
 * What a claim sounds like after passing through the reporter's firmware — its traits get
 * their say before any consumer reads it. Pure. The one encoding of "reports lie": the
 * enemy's evidence capture and the player's informant feed both report THROUGH this.
 *
 * Ego overlay (Plan 8 Task 4): an ego-recruited asset exaggerates chronically for the roster whose
 * principal is listening. The overlay is
 * ONE MECHANIC — the registered `exaggerator` transform composed AFTER the reporter's real traits,
 * never a bespoke doubling and never a traits write (it lives on the roster: `mice === 'ego'`, and
 * is permanent while the record stands). No asset / non-ego reporter → the chain is exactly the
 * real traits (unchanged).
 *
 * Turncoat doctoring (Plan 8 Task 8): a turned asset walks reports down only for the principal it is
 * deceiving —
 * the registered `minimizer` transform composed LAST, on top of everything above (the ego-overlay
 * idiom, inverted). Disclosed composition order: REAL traits → ego overlay (if ego) → doctoring (if
 * turned). One mechanic — each layer is a registered `TraitDef.transform` on the chain, never a
 * bespoke reduction.
 *
 * Audience is explicit, so lawful dual membership cannot make one principal's flip contaminate the
 * other principal's channel.
 */
export function reportThrough(
  world: WorldState,
  reporterId: EntityId,
  claim: Claim,
  rules: Rules,
  audience: Principal,
  policy: { traits: 'apply'; turncoat: 'auto' | 'apply' | 'skip' } = {
    traits: 'apply', turncoat: 'auto',
  },
): ReportedClaim {
  const reporter = world.npcs[reporterId]!;
  const traits = reporter.traits.flatMap((id) => (rules.traits[id] ? [rules.traits[id]!] : []));
  const exaggerator = rules.traits['exaggerator'];
  const minimizer = rules.traits['minimizer'];
  const isEgoAsset = assetFor(world, audience, reporterId)?.mice === 'ego';
  const chain = [
    ...traits,
    ...(isEgoAsset && exaggerator ? [exaggerator] : []),
    ...((policy.turncoat === 'apply'
      || (policy.turncoat === 'auto' && isTurnedAgainst(world, audience, reporterId)))
      && minimizer ? [minimizer] : []),
  ];
  const filtered = { ...claim, ...applyTraits(chain, claim, traitContextOf(reporter, world)) };
  const { subject, predicate, object, count, severity, place, attribution } = filtered;
  return { subject, predicate, object, count, severity, place, attribution };
}
