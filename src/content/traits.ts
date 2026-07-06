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

  minimizer: {
    id: 'minimizer',
    retellGate: 'none',
    appliesTo: (c) => c.count !== null || c.severity > 1,
    transform: (c) => {
      const d: ClaimDelta = {};
      if (c.count !== null) d.count = Math.max(1, Math.floor(c.count / 2));
      d.severity = clampSeverity(c.severity - 1);
      return d;
    },
    // Halved a count, or walked severity down by exactly one — the deflation signature.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'count' && typeof before.count === 'number' && c.to === Math.max(1, Math.floor(before.count / 2))) ||
      changes.some((c) => c.field === 'severity' && typeof c.to === 'number' && typeof c.from === 'number' && c.to === c.from - 1),
  },

  dramatist: {
    id: 'dramatist',
    retellGate: 'none',
    appliesTo: (c) => c.severity <= 3 && PREDICATES[c.predicate]?.valence === 'damaging',
    transform: () => ({ severity: 5 }),
    // Slammed severity to the ceiling from 3 or below — a jump of 2+ no one-step trait makes.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'severity' && c.to === 5 && typeof c.from === 'number' && c.from <= 3),
  },

  'name-dropper': {
    id: 'name-dropper',
    retellGate: 'none',
    appliesTo: (c, ctx) => c.attribution !== SOMEONE && ctx.rivals.length > 0,
    transform: (c, ctx) => {
      const name = grudgePick(c, ctx);
      return name && name !== c.attribution ? { attribution: name } : {};
    },
    // Swapped one NAMED source for another — the attributor only ever fills 'someone'.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'attribution' && c.from !== SOMEONE && c.to !== SOMEONE && c.from !== c.to),
  },

  vaguener: {
    id: 'vaguener',
    retellGate: 'none',
    appliesTo: (c) => c.attribution !== SOMEONE,
    transform: () => ({ attribution: SOMEONE }),
    // Dissolved a named source into 'someone' — the fog that kills traces.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'attribution' && c.from !== SOMEONE && c.to === SOMEONE),
  },

  numberer: {
    id: 'numberer',
    retellGate: 'none',
    appliesTo: (c) => c.count === null,
    transform: () => ({ count: 3 }),
    // Invented a count of exactly three where the story had none ("there were three of them").
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'count' && before.count === null && c.to === 3),
  },

  peacemaker: {
    id: 'peacemaker',
    retellGate: 'none',
    appliesTo: (c) => PREDICATES[c.predicate]?.valence === 'damaging' && c.severity > 2,
    transform: (c) => ({ severity: clampSeverity(c.severity - 2) }),
    // Walked a damaging story down by exactly two — twice the minimizer's single step.
    fingerprint: (before, changes) =>
      PREDICATES[before.predicate]?.valence === 'damaging' &&
      changes.some((c) => c.field === 'severity' && typeof c.to === 'number' && typeof c.from === 'number' && c.to === c.from - 2),
  },

  objectifier: {
    id: 'objectifier',
    retellGate: 'none',
    appliesTo: (c, ctx) => (c.object === null || c.object === SOMEONE) && ctx.rivals.length > 0,
    transform: (c, ctx) => {
      const name = grudgePick(c, ctx);
      return name ? { object: name } : {};
    },
    // Dragged a named accomplice into the story's empty object slot ("…with JONET, no doubt").
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'object' && (before.object === null || before.object === SOMEONE) && c.to !== SOMEONE && c.to !== null),
  },

  relocator: {
    id: 'relocator',
    retellGate: 'none',
    appliesTo: (c) => c.place !== null,
    transform: () => ({ place: null }),
    // Unmoored the story from its place ("somewhere or other") — the fog's second face.
    fingerprint: (before, changes) =>
      changes.some((c) => c.field === 'place' && before.place !== null && c.to === null),
  },
};
