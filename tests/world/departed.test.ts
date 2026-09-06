import { describe, expect, it } from 'vitest';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { cloneSerializable, stableStringify } from '../../src/sim/hash';
import { generateDeparted, departedProblems, reportedSecret } from '../../src/world/departed';
import { generateTown } from '../../src/world/gen';
import { generateValidTown } from '../../src/world/serve';
import { validateTown } from '../../src/world/validate';
import { worldFromTown } from '../../src/world/attach';
import { SEANCE_CONFIG, seanceTown } from '../sim/helpers/seance-town';

describe('the departed is separate historical data', () => {
  it('selects truth and a real subject edge without removing or mutating living data', () => {
    const town = seanceTown(false);
    const before = stableStringify(town);
    const departed = generateDeparted('fixed', town.fixture, town.secrets, ['Mira']);
    expect(stableStringify(town)).toBe(before);
    expect(departed).toMatchObject({
      name: 'Mira', secretId: 's0', reported: reportedSecret(town.secrets[0]!),
      edge: { from: 'ada', to: 'bez', kind: 'friend' },
    });
    expect(town.fixture.npcs).toHaveLength(4);
    expect(town.secrets[0]!.witnesses).toEqual(['bez']);
    town.departed = departed;
    expect(validateTown(town, SEANCE_CONFIG).ok).toBe(true);
    const world = worldFromTown(town, 'fixed', STANDARD_RULES);
    expect(Object.keys(world.beliefs).sort()).toEqual(['ada', 'bez', 'boss', 'guard']);
    expect(world.beliefs.bez!.s0).toMatchObject({ discretion: true, credence: 0.95 });
    expect(world.beliefs[departed!.id]).toBeUndefined();
    expect(world.claimCounter).toBe(1);
    expect(world.chronicle).toHaveLength(1);
  });
  it('is deterministic under reordered input and picks unused content names', () => {
    const town = seanceTown(false);
    const names = ['ada', ' ADA ', 'square', 'Mira', 'Lena', ''];
    const first = generateDeparted('fixed', town.fixture, town.secrets, names);
    expect(first).toEqual(generateDeparted('fixed',
      { venues: [...town.fixture.venues].reverse(), npcs: [...town.fixture.npcs].reverse() },
      [...town.secrets].reverse(), [...names].reverse()));
    expect(['Lena', 'Mira']).toContain(first!.name);
  });
  it('falls back stably when every content name is used and avoids both namespaces', () => {
    const town = seanceTown(false);
    town.fixture.venues.push(
      { id: 'departed:0', district: 'd0', access: 'public' },
      { id: 'The unnamed witness', district: 'd0', access: 'public' });
    const before = stableStringify(town);
    const departed = generateDeparted('fixed', town.fixture, town.secrets, ['ada', 'square']);
    expect(departed).toMatchObject({ id: 'departed:1', name: 'The unnamed witness 2' });
    expect(stableStringify(town)).toBe(before);
    expect(departedProblems({ ...town, departed })).toEqual([]);
  });
  it('returns null rather than inventing a secret-edge pair; null fails attachment and validation', () => {
    const town = seanceTown(false);
    town.fixture.npcs.find((npc) => npc.id === 'ada')!.edges = [];
    town.departed = generateDeparted('fixed', town.fixture, town.secrets, ['Mira']);
    expect(town.departed).toBeNull();
    expect(validateTown(town, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('departed-sane');
    expect(() => worldFromTown(town, 'fixed')).toThrow(/departed-sane/);
  });
  it.each(['id', 'name', 'secret', 'testimony', 'edge'] as const)(
    'rejects %s corruption while the valid twin passes', (field) => {
      const town = seanceTown();
      expect(validateTown(town, SEANCE_CONFIG).ok).toBe(true);
      const bad = cloneSerializable(town);
      const departed = bad.departed!;
      if (field === 'id') departed.id = 'chapel-d0';
      if (field === 'name') departed.name = 'Ada';
      if (field === 'secret') departed.secretId = 'missing';
      if (field === 'testimony') departed.reported.severity = 1;
      if (field === 'edge') departed.edge.to = 'boss';
      expect(validateTown(bad, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('departed-sane');
      expect(() => worldFromTown(bad, 'bad')).toThrow(/departed-sane/);
    });
  it('keeps living-only witness validation firing and omitted hand-built metadata absent', () => {
    const town = seanceTown(false);
    expect(validateTown(town, SEANCE_CONFIG).ok).toBe(true);
    const world = worldFromTown(town, 'omitted');
    expect(world).not.toHaveProperty('departed');
    expect(world).not.toHaveProperty('seanceUsed');
    town.secrets[0]!.witnesses.push('departed:0');
    expect(validateTown(town, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('secrets-valid');
  });
  it('rejects present undefined metadata instead of admitting a non-JSON absence', () => {
    const town = seanceTown(false);
    town.departed = undefined;
    expect(departedProblems(town)).toEqual(['present departed metadata must not be undefined']);
    expect(validateTown(town, SEANCE_CONFIG).failures.map((failure) => failure.invariant)).toContain('departed-sane');
    expect(() => worldFromTown(town, 'undefined')).toThrow(/departed-sane/);
  });
  it('binds the existing minted claim and owns nested copies across sessions and JSON', () => {
    const town = seanceTown();
    const left = worldFromTown(town, 'one');
    const right = worldFromTown(town, 'two');
    const departed = left.departed!;
    expect(left.claims[departed.claimId]).toMatchObject({ family: departed.secretId, parent: null, ...departed.reported });
    expect(JSON.parse(JSON.stringify(left)).departed).toEqual(departed);
    expect(departed.reported).not.toBe(town.departed!.reported);
    expect(departed.edge).not.toBe(town.departed!.edge);
    town.departed!.reported.severity = 1;
    town.departed!.edge.to = 'boss';
    expect(departed.reported.severity).toBe(4);
    expect(departed.edge.to).toBe('bez');
    departed.reported.severity = 2;
    departed.edge.to = 'guard';
    expect(right.departed!.reported.severity).toBe(4);
    expect(right.departed!.edge.to).toBe('bez');
  });
  it('generated towns always carry the key and valid served witnesses resolve', () => {
    for (const seed of ['departed-a', 'departed-b', 'departed-c', 'departed-d']) {
      expect(Object.hasOwn(generateTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT), 'departed')).toBe(true);
      const a = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
      const b = generateValidTown(seed, STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES);
      expect(a).toEqual(b);
      expect(a.town.departed).not.toBeNull();
      expect(departedProblems(a.town)).toEqual([]);
      expect(a.town.fixture.npcs).toHaveLength(STANDARD_GEN_CONFIG.npcCount);
      const living = new Set(a.town.fixture.npcs.map((npc) => npc.id));
      expect(a.town.secrets.every((secret) => secret.witnesses.every((id) => living.has(id)))).toBe(true);
      expect(worldFromTown(a.town, seed, STANDARD_RULES).departed!.secretId).toBe(a.town.departed!.secretId);
    }
  });
  it('exhausted serve reports departed failure rather than creating a zero-secret witness', () => {
    expect(() => generateValidTown('no-secrets',
      { ...STANDARD_GEN_CONFIG, secretCount: 0, maxAttempts: 2 },
      STANDARD_GEN_CONTENT, STANDARD_RULES)).toThrow(/exhausted 2 attempts[\s\S]*departed-sane/);
  });
});
