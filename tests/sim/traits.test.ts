import { applyTraits, type TraitContext } from '../../src/sim/rumors/traits';
import { TRAITS } from '../../src/content/traits';
import { SOMEONE, type Claim, type FieldChange, CLAIM_FIELDS } from '../../src/sim/rumors/claim';
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
  it('no two field-changing traits share a change signature on the probe set', () => {
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
          const d = t.transform(p, ctx());
          return CLAIM_FIELDS.filter((f) => f in d).sort().join(',');
        })
        .join('|');
    };
    const changing = Object.keys(TRAITS).filter((id) => signature(id).replaceAll('-', '').replaceAll('|', '') !== '');
    const sigs = changing.map(signature);
    expect(new Set(sigs).size).toBe(changing.length);
  });
});
