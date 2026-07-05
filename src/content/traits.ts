import { fnv1a32 } from '../core/rng';
import { SOMEONE, type Claim } from '../sim/rumors/claim';
import type { TraitContext, TraitDef, TraitId } from '../sim/rumors/traits';
import { PREDICATES } from './predicates';

/** A field-delta built up by mutation before return; Claim's fields are readonly. */
type ClaimDelta = { -readonly [K in keyof Claim]?: Claim[K] };

const clampSeverity = (n: number): Claim['severity'] =>
  Math.max(1, Math.min(5, n)) as Claim['severity'];

/** Deterministic fill: stable per (story family, owning mind). No rng, no re-rolls. */
const grudgePick = (claim: Claim, ctx: TraitContext): string | null =>
  ctx.rivals.length === 0
    ? null
    : ctx.rivals[fnv1a32(`${claim.family}:${ctx.ownerId}`) % ctx.rivals.length]!;

export const TRAITS: Record<TraitId, TraitDef> = {
  exaggerator: {
    id: 'exaggerator',
    retellGate: 'none',
    appliesTo: (c) => c.count !== null || c.severity < 5,
    transform: (c) => {
      const d: ClaimDelta = {};
      if (c.count !== null) d.count = c.count * 2;
      d.severity = clampSeverity(c.severity + 1); // clamp keeps 5 at 5
      return d;
    },
    // Doubled a count, or bumped severity by exactly one — the inflation signature.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'count' && typeof before.count === 'number' && c.to === before.count * 2) ||
      changes.some((c) => c.field === 'severity' && typeof c.to === 'number' && typeof c.from === 'number' && c.to === c.from + 1),
  },

  attributor: {
    id: 'attributor',
    retellGate: 'none',
    appliesTo: (c, ctx) =>
      (c.subject === SOMEONE || c.attribution === SOMEONE) && ctx.rivals.length > 0,
    transform: (c, ctx) => {
      const name = grudgePick(c, ctx);
      const d: ClaimDelta = {};
      if (name && c.subject === SOMEONE) d.subject = name;
      if (name && c.attribution === SOMEONE) d.attribution = name;
      return d;
    },
    // Pinned a vague 'someone' (subject or attribution) onto a named party.
    fingerprint: (before, changes) =>
      changes.some((c) => (c.field === 'subject' || c.field === 'attribution') && c.from === SOMEONE && c.to !== SOMEONE),
  },

  moralizer: {
    id: 'moralizer',
    retellGate: 'none',
    appliesTo: (c) => PREDICATES[c.predicate]?.sinVersion != null,
    transform: (c) => ({ predicate: PREDICATES[c.predicate]!.sinVersion! }),
    // Rewrote the predicate into exactly the sin register its neutral form maps to.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'predicate' && PREDICATES[before.predicate]?.sinVersion === c.to),
  },

  partisan: {
    id: 'partisan',
    retellGate: 'none',
    appliesTo: (c, ctx) =>
      PREDICATES[c.predicate]?.factionRelevant === true &&
      c.subject !== SOMEONE &&
      ctx.factionOf(c.subject) !== null,
    transform: (c, ctx) => {
      const subjectFaction = ctx.factionOf(c.subject as string);
      return subjectFaction === ctx.faction
        ? { severity: clampSeverity(c.severity - 1) }   // soften own side
        : { severity: clampSeverity(c.severity + 1) };  // sharpen the rival's sins
    },
    // Nudged severity by one on a faction-relevant claim (direction depends on the side).
    fingerprint: (before, changes) =>
      PREDICATES[before.predicate]?.factionRelevant === true &&
      changes.some((c) => c.field === 'severity' && typeof c.to === 'number' && typeof c.from === 'number' && Math.abs(c.to - c.from) === 1),
  },

  skeptic: {
    id: 'skeptic',
    retellGate: 'requires-corroboration',
    appliesTo: () => false,   // transforms nothing — gatekeeper node where rumors die
    transform: () => ({}),
    fingerprint: () => false, // no field evidence — deduced behaviorally, not codex-lockable v1
  },

  literalist: {
    id: 'literalist',
    retellGate: 'none',
    appliesTo: () => false,   // passes unchanged — rare routing infrastructure
    transform: () => ({}),
    fingerprint: () => false, // identity transform leaves no trace to fingerprint
  },
};
