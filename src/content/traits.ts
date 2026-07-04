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
    : (ctx.rivals[fnv1a32(`${claim.family}:${ctx.ownerId}`) % ctx.rivals.length] as string);

export const TRAITS: Record<TraitId, TraitDef> = {
  exaggerator: {
    id: 'exaggerator',
    retellGate: 'none',
    appliesTo: (c) => c.count !== null || c.severity < 5,
    transform: (c) => {
      const d: ClaimDelta = {};
      if (c.count !== null) d.count = c.count * 2;
      if (c.severity < 5) d.severity = clampSeverity(c.severity + 1);
      else d.severity = 5;
      return d;
    },
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
  },

  moralizer: {
    id: 'moralizer',
    retellGate: 'none',
    appliesTo: (c) => PREDICATES[c.predicate]?.sinVersion != null,
    transform: (c) => ({ predicate: PREDICATES[c.predicate]!.sinVersion! }),
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
  },

  skeptic: {
    id: 'skeptic',
    retellGate: 'requires-corroboration',
    appliesTo: () => false,   // transforms nothing — gatekeeper node where rumors die
    transform: () => ({}),
  },

  literalist: {
    id: 'literalist',
    retellGate: 'none',
    appliesTo: () => false,   // passes unchanged — rare routing infrastructure
    transform: () => ({}),
  },
};
