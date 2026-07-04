export type EntityId = string;
export type VenueId = string;
export type PredicateId = string;
export type ClaimId = string;
export type RumorId = string;

/** Vagueness sentinel: "someone" — a field the story leaves unspecified. */
export const SOMEONE = 'someone' as const;

export interface Claim {
  readonly id: ClaimId;
  /** Lineage root — all mutated versions of one story share a family. */
  readonly family: RumorId;
  /** The version this one was retold from (null = origin/injection). */
  readonly parent: ClaimId | null;
  readonly subject: EntityId | typeof SOMEONE;
  readonly predicate: PredicateId;
  readonly object: EntityId | typeof SOMEONE | null;
  readonly count: number | null;
  readonly severity: 1 | 2 | 3 | 4 | 5;
  readonly place: VenueId | null;
  /** Who the story SAYS it came from — mutable, and the key to tracing. */
  readonly attribution: EntityId | typeof SOMEONE;
}

export const CLAIM_FIELDS = [
  'subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution',
] as const;
export type ClaimField = (typeof CLAIM_FIELDS)[number];

export interface FieldChange { field: ClaimField; from: unknown; to: unknown }

/** Exact structural diff over the 7 claim fields (id/family/parent are lineage, not content). */
export function diffClaims(a: Claim, b: Claim): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of CLAIM_FIELDS) {
    if (a[field] !== b[field]) changes.push({ field, from: a[field], to: b[field] });
  }
  return changes;
}

/** Mint a claim with an id from the world's counter — ids must be replay-stable. */
export function mintClaim(
  world: { claimCounter: number },
  fields: Omit<Claim, 'id'>,
): Claim {
  const id: ClaimId = `c${world.claimCounter++}`;
  // id LAST: callers may spread an existing claim into `fields`; the minted id must win.
  return { ...fields, id };
}
