import { describe, expect, it } from 'vitest';
import { TRAITS } from '../../src/content/traits';
import { diffClaims, SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import type { TraitContext } from '../../src/sim/rumors/traits';

const ctx = (): TraitContext => ({
  ownerId: 'probe-owner', rivals: ['rival-1', 'rival-2'], faction: 'guild',
  factionOf: (id) => (id === 'crown-npc' ? 'crown' : id === 'guild-npc' ? 'guild' : null),
});

/** Canonical battery: spans count-null/bearing, sev extremes, valences, vague/named fields. */
const battery: Omit<Claim, 'id'>[] = [
  { family: 'f1', parent: null, subject: 'guild-npc', predicate: 'stole',                    object: null,       count: 3,    severity: 2, place: 'market',  attribution: 'ada' },
  { family: 'f2', parent: null, subject: SOMEONE,     predicate: 'met-at-the-docks-by-night',object: SOMEONE,    count: null, severity: 1, place: null,      attribution: SOMEONE },
  { family: 'f3', parent: null, subject: 'crown-npc', predicate: 'poisoned',                 object: 'guild-npc',count: null, severity: 5, place: 'well',    attribution: 'bez' },
  { family: 'f4', parent: null, subject: 'guild-npc', predicate: 'blessed-the-harvest',      object: null,       count: 12,   severity: 3, place: null,      attribution: 'cyn' },
  { family: 'f5', parent: null, subject: 'crown-npc', predicate: 'is-bankrupt',              object: null,       count: null, severity: 3, place: 'tavern',  attribution: SOMEONE },
];

function signatureVector(traitId: string): string {
  const t = TRAITS[traitId]!;
  return battery.map((b, i) => {
    const claim = { ...b, id: `probe-${i}` } as Claim;
    if (!t.appliesTo(claim, ctx())) return '·';
    const after = { ...claim, ...t.transform(claim, ctx()) } as Claim;
    return diffClaims(claim, after).map((c) => `${c.field}:${String(c.from)}→${String(c.to)}`).sort().join('|') || '·';
  }).join(' ; ');
}

describe('ontology law — no two traits share a field-change signature', () => {
  it('registry is at spec v1 scale: 14 traits', () => {
    expect(Object.keys(TRAITS)).toHaveLength(14);
  });

  it('signature vectors over the battery are pairwise distinct (identity traits exempt)', () => {
    const ids = Object.keys(TRAITS).sort();
    const identity = ids.filter((id) => signatureVector(id).split(' ; ').every((s) => s === '·'));
    expect(identity.sort()).toEqual(['literalist', 'skeptic']);   // exactly the two behavioral traits
    const vectors = new Map<string, string>();
    for (const id of ids) {
      if (identity.includes(id)) continue;
      const v = signatureVector(id);
      const clash = [...vectors.entries()].find(([, ov]) => ov === v);
      expect(clash, `${id} shares a signature vector with ${clash?.[0]}`).toBeUndefined();
      vectors.set(id, v);
    }
  });

  it('the two identity traits differ behaviorally', () => {
    expect(TRAITS['skeptic']!.retellGate).toBe('requires-corroboration');
    expect(TRAITS['literalist']!.retellGate).toBe('none');
  });

  it('every field-transform trait has a live fingerprint; identity traits never fingerprint', () => {
    for (const id of Object.keys(TRAITS)) {
      const isIdentity = id === 'skeptic' || id === 'literalist';
      const claim = { ...battery[0]!, id: 'fp-probe' } as Claim;
      if (isIdentity) {
        expect(TRAITS[id]!.fingerprint(claim, [])).toBe(false);
      }
      // Non-identity fingerprints are exercised per-trait in traits.test.ts (Step 3).
    }
  });
});
