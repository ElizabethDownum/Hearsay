import { applyTraits, type TraitContext } from '../../src/sim/rumors/traits';
import { TRAITS } from '../../src/content/traits';
import { SOMEONE, diffClaims, type Claim, type FieldChange, CLAIM_FIELDS } from '../../src/sim/rumors/claim';
import type { ReportedClaim } from '../../src/sim/enemy/state';

const ctx = (over: Partial<TraitContext> = {}): TraitContext => ({
  ownerId: 'osric',
  faction: 'guild',
  rivals: ['wat', 'jonet'],
  factionOf: (e) => (e === 'wat' ? 'crown' : 'guild'),
  ...over,
});

const probe: Claim = {
  id: 'c0', family: 'r1', parent: null,
  subject: SOMEONE, predicate: 'met-secretly-with', object: 'hew',
  count: 3, severity: 2, place: 'docks', attribution: SOMEONE,
};

describe('individual traits', () => {
  it('exaggerator doubles count and bumps severity, capped at 5', () => {
    const d = TRAITS['exaggerator']!.transform(probe, ctx());
    expect(d).toEqual({ count: 6, severity: 3 });
    const maxed = { ...probe, severity: 5 as const, count: null };
    expect(TRAITS['exaggerator']!.transform(maxed, ctx())).toEqual({ severity: 5 });
  });

  it('attributor fills vague subject/attribution deterministically from rivals', () => {
    const d1 = TRAITS['attributor']!.transform(probe, ctx());
    const d2 = TRAITS['attributor']!.transform(probe, ctx());
    expect(d1).toEqual(d2);                       // stable per (family, owner)
    expect(ctx().rivals).toContain(d1.subject);   // fills from own grudges
    expect(ctx().rivals).toContain(d1.attribution);
    const named = { ...probe, subject: 'mara', attribution: 'mara' };
    expect(TRAITS['attributor']!.appliesTo(named, ctx())).toBe(false); // nothing vague
  });

  it('moralizer rewrites predicate into the sin register', () => {
    expect(TRAITS['moralizer']!.transform(probe, ctx())).toEqual({ predicate: 'is-having-an-affair-with' });
    const nosin = { ...probe, predicate: 'stole' };
    expect(TRAITS['moralizer']!.appliesTo(nosin, ctx())).toBe(false);
  });

  it('partisan shifts severity by faction: +1 vs rivals, -1 for own', () => {
    const vsRival = { ...probe, subject: 'wat' };       // crown, owner is guild
    expect(TRAITS['partisan']!.transform(vsRival, ctx())).toEqual({ severity: 3 });
    const vsOwn = { ...probe, subject: 'hew' };          // guild
    expect(TRAITS['partisan']!.transform(vsOwn, ctx())).toEqual({ severity: 1 });
    const notRelevant = { ...probe, subject: 'wat', predicate: 'blessed-the-harvest' };
    expect(TRAITS['partisan']!.appliesTo(notRelevant, ctx())).toBe(false);
  });

  it('skeptic and literalist transform nothing but differ in retell gate', () => {
    expect(TRAITS['skeptic']!.appliesTo(probe, ctx())).toBe(false);
    expect(TRAITS['literalist']!.appliesTo(probe, ctx())).toBe(false);
    expect(TRAITS['skeptic']!.retellGate).toBe('requires-corroboration');
    expect(TRAITS['literalist']!.retellGate).toBe('none');
  });
});

describe('new traits (Plan 6) — transform-exact / abstain / fingerprint vs nearest neighbor', () => {
  // Apply a trait's own transform, returning the mutated claim; fp() round-trips a
  // captured before→after through a (possibly other) trait's fingerprint.
  const apply = (c: Claim, id: string): Claim => ({ ...c, ...TRAITS[id]!.transform(c, ctx()) }) as Claim;
  const fp = (id: string, before: Claim, after: Claim): boolean =>
    TRAITS[id]!.fingerprint(before, diffClaims(before, after));

  it('minimizer halves count and drops severity by one; fingerprint splits from peacemaker', () => {
    const row = { ...probe, predicate: 'stole', count: 4, severity: 4 as const };
    expect(TRAITS['minimizer']!.transform(row, ctx())).toEqual({ count: 2, severity: 3 });
    expect(TRAITS['minimizer']!.appliesTo({ ...probe, count: null, severity: 1 }, ctx())).toBe(false);
    expect(fp('minimizer', row, apply(row, 'minimizer'))).toBe(true);   // −1 / halved is its own
    expect(fp('minimizer', row, apply(row, 'peacemaker'))).toBe(false); // peacemaker's −2 is not
  });

  it('dramatist slams severity to 5 from ≤3 damaging; unreachable by exaggerator', () => {
    const row = { ...probe, predicate: 'stole', severity: 2 as const };
    expect(TRAITS['dramatist']!.transform(row, ctx())).toEqual({ severity: 5 });
    expect(TRAITS['dramatist']!.appliesTo({ ...probe, predicate: 'blessed-the-harvest', severity: 2 }, ctx())).toBe(false);
    expect(fp('dramatist', row, apply(row, 'dramatist'))).toBe(true);
    expect(fp('dramatist', row, apply(row, 'exaggerator'))).toBe(false); // +1 never reaches the ceiling jump
  });

  it('name-dropper swaps one named source for a rival; fingerprint splits from vaguener', () => {
    const row = { ...probe, attribution: 'mara' };
    const d = TRAITS['name-dropper']!.transform(row, ctx());
    expect(ctx().rivals).toContain(d.attribution);   // filled from own grudges
    expect(d.attribution).not.toBe('mara');
    expect(TRAITS['name-dropper']!.appliesTo({ ...probe, attribution: SOMEONE }, ctx())).toBe(false);
    expect(fp('name-dropper', row, apply(row, 'name-dropper'))).toBe(true);
    expect(fp('name-dropper', row, apply(row, 'vaguener'))).toBe(false); // named→someone is not named→named
  });

  it('vaguener dissolves a named source into someone; fingerprint splits from name-dropper', () => {
    const row = { ...probe, attribution: 'mara' };
    expect(TRAITS['vaguener']!.transform(row, ctx())).toEqual({ attribution: SOMEONE });
    expect(TRAITS['vaguener']!.appliesTo({ ...probe, attribution: SOMEONE }, ctx())).toBe(false);
    expect(fp('vaguener', row, apply(row, 'vaguener'))).toBe(true);
    expect(fp('vaguener', row, apply(row, 'name-dropper'))).toBe(false); // named→named is not named→someone
  });

  it('numberer invents a count of three where there was none; disjoint from exaggerator', () => {
    const row = { ...probe, count: null };
    expect(TRAITS['numberer']!.transform(row, ctx())).toEqual({ count: 3 });
    expect(TRAITS['numberer']!.appliesTo({ ...probe, count: 3 }, ctx())).toBe(false);
    expect(fp('numberer', row, apply(row, 'numberer'))).toBe(true);
    expect(fp('numberer', row, apply(row, 'exaggerator'))).toBe(false); // exaggerator leaves a null count null
  });

  it('peacemaker walks a damaging story down by two; fingerprint splits from minimizer', () => {
    const row = { ...probe, predicate: 'stole', severity: 4 as const };
    expect(TRAITS['peacemaker']!.transform(row, ctx())).toEqual({ severity: 2 });
    expect(TRAITS['peacemaker']!.appliesTo({ ...probe, predicate: 'blessed-the-harvest', severity: 4 }, ctx())).toBe(false);
    expect(fp('peacemaker', row, apply(row, 'peacemaker'))).toBe(true);
    expect(fp('peacemaker', row, apply(row, 'minimizer'))).toBe(false); // minimizer's −1 is not the −2 step
  });

  it('objectifier drags a rival into an empty object slot; the only object-writer', () => {
    const row = { ...probe, object: null, subject: SOMEONE };
    const d = TRAITS['objectifier']!.transform(row, ctx());
    expect(ctx().rivals).toContain(d.object);
    expect(TRAITS['objectifier']!.appliesTo({ ...probe, object: 'hew' }, ctx())).toBe(false);
    expect(fp('objectifier', row, apply(row, 'objectifier'))).toBe(true);
    expect(fp('objectifier', row, apply(row, 'attributor'))).toBe(false); // attributor never touches object
  });

  it('relocator unmoors the story from its place; the only place-writer', () => {
    expect(TRAITS['relocator']!.transform(probe, ctx())).toEqual({ place: null });
    expect(TRAITS['relocator']!.appliesTo({ ...probe, place: null }, ctx())).toBe(false);
    expect(fp('relocator', probe, apply(probe, 'relocator'))).toBe(true);
    expect(fp('relocator', probe, apply(probe, 'exaggerator'))).toBe(false); // exaggerator never touches place
  });
});

describe('composition', () => {
  it('applies in owner order, each trait seeing the previous output', () => {
    const d = applyTraits([TRAITS['moralizer']!, TRAITS['exaggerator']!], probe, ctx());
    // moralizer first: met-secretly-with -> affair; exaggerator then bumps the mutated claim
    expect(d).toEqual({ predicate: 'is-having-an-affair-with', count: 6, severity: 3 });
  });
});

describe('codex fingerprints — the dev-time glossary the Evidence Board deduces against', () => {
  const reportedOf = (c: Claim): ReportedClaim => {
    const { subject, predicate, object, count, severity, place, attribution } = c;
    return { subject, predicate, object, count, severity, place, attribution };
  };
  const diff = (before: ReportedClaim, after: ReportedClaim): FieldChange[] =>
    CLAIM_FIELDS.filter((f) => before[f] !== after[f]).map((f) => ({ field: f, from: before[f], to: after[f] }));

  it('every standard trait exposes a fingerprint predicate', () => {
    for (const id of Object.keys(TRAITS)) {
      expect(typeof TRAITS[id]!.fingerprint, id).toBe('function');
    }
  });

  it("each field-changing trait's own canonical transform output satisfies its own fingerprint", () => {
    // One canonical claim per field-changing trait; its own transform must leave the very
    // signature its fingerprint hunts for. (skeptic/literalist transform nothing — excluded.)
    const canonical: Record<string, Claim> = {
      exaggerator: probe,                    // count 3 → 6, severity 2 → 3
      attributor: probe,                     // vague subject/attribution → a named rival
      moralizer: probe,                      // met-secretly-with → the sin register
      partisan: { ...probe, subject: 'wat' },// crown subject, guild owner → severity +1
    };
    for (const [id, claim] of Object.entries(canonical)) {
      const trait = TRAITS[id]!;
      const before = reportedOf(claim);
      const after = reportedOf({ ...claim, ...trait.transform(claim, ctx()) });
      const changes = diff(before, after);
      expect(changes.length, `${id} should change a field`).toBeGreaterThan(0);
      expect(trait.fingerprint(before, changes), `${id} fingerprint`).toBe(true);
    }
  });

  it('skeptic and literalist fingerprints never fire — no field evidence to read', () => {
    const changes: FieldChange[] = [
      { field: 'count', from: 2, to: 4 },
      { field: 'predicate', from: 'met-secretly-with', to: 'is-having-an-affair-with' },
    ];
    expect(TRAITS['skeptic']!.fingerprint(reportedOf(probe), changes)).toBe(false);
    expect(TRAITS['literalist']!.fingerprint(reportedOf(probe), changes)).toBe(false);
  });
});

describe('ontology law: fingerprint uniqueness (property test)', () => {
  // The law compares full field-change VECTORS (from→to), not merely which fields move.
  // By design, signature ZONES overlap — exaggerator (+count/+sev) and minimizer (−count/−sev)
  // touch the same {count,severity} fields and are told apart only by value; that ambiguity is
  // the deduction game. Pre-Plan-6 this guard compared field-NAME sets and so falsely conflated
  // those zone-mates once minimizer joined the registry. Re-encoded to the value-vector the
  // ontology law actually uses; the authoritative 5-row battery lives in
  // tests/content/traits-ontology.test.ts (this stays as the in-suite guard).
  it('no two field-changing traits share a change VECTOR on the probe set', () => {
    const probes: Claim[] = [
      probe,
      { ...probe, subject: 'wat', predicate: 'stole', count: null },
      { ...probe, predicate: 'owes-money-to', object: 'jonet', severity: 4 },
    ];
    const signature = (traitId: string): string => {
      const t = TRAITS[traitId]!;
      return probes
        .map((p) => {
          if (!t.appliesTo(p, ctx())) return '-';
          const after = { ...p, ...t.transform(p, ctx()) } as Claim;
          return diffClaims(p, after).map((c) => `${c.field}:${String(c.from)}→${String(c.to)}`).sort().join('|') || '-';
        })
        .join(' ; ');
    };
    const changing = Object.keys(TRAITS).filter((id) => signature(id).split(' ; ').some((s) => s !== '-'));
    const sigs = changing.map(signature);
    expect(new Set(sigs).size).toBe(changing.length);
  });
});
