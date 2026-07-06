import { meetingGraph, validateTown } from '../../src/world/validate';
import { generateTown } from '../../src/world/gen';
import { generateValidTown } from '../../src/world/serve';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { TRAITS } from '../../src/content/traits';
import type { Npc, Venue } from '../../src/sim/types';
import type { GenConfig, GeneratedTown } from '../../src/world/types';

const venue = (id: string, district = 'd0', access: Venue['access'] = 'public'): Venue => ({ id, district, access });
const npc = (id: string, over: Partial<Npc> = {}): Npc => ({
  id, name: id, home: `home-${id}`, occupation: 'test', faction: 'none',
  traits: ['literalist', 'skeptic'], rivals: [], schedule: [], edges: [], ...over,
});
const town = (npcs: Npc[], extraVenues: Venue[] = [], keystones: string[] = []): GeneratedTown => ({
  fixture: { venues: [...npcs.map((n) => venue(`home-${n.id}`, 'd0', 'private')), ...extraVenues], npcs },
  districts: [],
  keystones,
  guards: [],
  secrets: [],
  dossier: null,
});
const cfg = (over: Partial<GenConfig> = {}): GenConfig => ({
  npcCount: 2, districtCount: 1, keystoneCount: 0, bridgesPerAdjacentPair: 0, guardsPerDistrict: 0,
  secretCount: 0, dossierInformants: 2, dossierTraitReadMax: 6, dossierEdgeReadMax: 8, maxAttempts: 1, ...over,
});
const block = (venueId: string, from = 480, to = 600): Npc['schedule'][number] =>
  ({ days: 'all', from, to, venue: venueId });
const failuresOf = (t: GeneratedTown, c: GenConfig, known?: string[]) =>
  validateTown(t, c, known ? { knownTraitIds: known } : {}).failures.map((f) => f.invariant);

describe('structural invariants (red, one each)', () => {
  it('ids-unique', () => {
    const t = town([npc('a'), npc('b')]);
    t.fixture.venues.push(venue('home-a', 'd0', 'private')); // duplicate venue id
    expect(failuresOf(t, cfg())).toContain('ids-unique');
  });

  it('refs-resolve', () => {
    const bad = npc('a', { schedule: [block('nowhere')], edges: [{ to: 'ghost', kind: 'friend', trust: 0.5 }], rivals: ['ghost'] });
    expect(failuresOf(town([bad, npc('b')]), cfg())).toContain('refs-resolve');
  });

  it('schedule-sane rejects inverted and OVERLAPPING blocks (a shadowed block is a phantom schedule)', () => {
    const shared = venue('v');
    const inverted = npc('a', { schedule: [{ days: 'all', from: 600, to: 480, venue: 'v' }] });
    expect(failuresOf(town([inverted, npc('b')], [shared]), cfg())).toContain('schedule-sane');
    const overlapping = npc('a', { schedule: [block('v', 480, 700), { days: 'weekday', from: 600, to: 800, venue: 'v' }] });
    expect(failuresOf(town([overlapping, npc('b')], [shared]), cfg())).toContain('schedule-sane');
  });

  it('traits-in-range: count bounds, duplicates, unknown ids vs the glossary', () => {
    const one = npc('a', { traits: ['literalist'] });
    expect(failuresOf(town([one, npc('b')]), cfg())).toContain('traits-in-range');
    const dup = npc('a', { traits: ['literalist', 'literalist'] });
    expect(failuresOf(town([dup, npc('b')]), cfg())).toContain('traits-in-range');
    const alien = npc('a', { traits: ['literalist', 'mesmerist'] });
    expect(failuresOf(town([alien, npc('b')]), cfg(), Object.keys(TRAITS))).toContain('traits-in-range');
  });

  it('npc-count and keystones-valid', () => {
    expect(failuresOf(town([npc('a')]), cfg({ npcCount: 2 }))).toContain('npc-count');
    expect(failuresOf(town([npc('a'), npc('b')], [], ['ghost']), cfg({ keystoneCount: 1 }))).toContain('keystones-valid');
    expect(failuresOf(town([npc('a'), npc('b')]), cfg({ keystoneCount: 1 }))).toContain('keystones-valid');
  });
});

describe('guards-staffed invariant', () => {
  const validOpts = { knownTraitIds: Object.keys(TRAITS) };
  const built = generateValidTown('guards-invariant-seed', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES, validOpts);

  it('a valid generated town passes', () => {
    expect(validateTown(built.town, STANDARD_GEN_CONFIG, validOpts).ok).toBe(true);
  });

  it('the same town with guards: [] fails guards-staffed', () => {
    const bad: GeneratedTown = { ...built.town, guards: [] };
    expect(failuresOf(bad, STANDARD_GEN_CONFIG, Object.keys(TRAITS))).toContain('guards-staffed');
  });

  it('a guard entry with vigilance: 0 fails', () => {
    const bad: GeneratedTown = {
      ...built.town,
      guards: built.town.guards.map((g, i) => (i === 0 ? { ...g, vigilance: 0 } : g)),
    };
    expect(failuresOf(bad, STANDARD_GEN_CONFIG, Object.keys(TRAITS))).toContain('guards-staffed');
  });

  it('a guard id not in the fixture fails', () => {
    const bad: GeneratedTown = {
      ...built.town,
      guards: built.town.guards.map((g, i) => (i === 0 ? { id: 'ghost-guard', vigilance: g.vigilance } : g)),
    };
    expect(failuresOf(bad, STANDARD_GEN_CONFIG, Object.keys(TRAITS))).toContain('guards-staffed');
  });
});

describe('secrets-valid invariant', () => {
  const validOpts = { knownTraitIds: Object.keys(TRAITS) };
  const built = generateValidTown('secrets-invariant-seed', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT, STANDARD_RULES, validOpts);

  it('a valid generated town passes (real dirt, real witnesses)', () => {
    expect(validateTown(built.town, STANDARD_GEN_CONFIG, validOpts).ok).toBe(true);
    expect(built.town.secrets).toHaveLength(STANDARD_GEN_CONFIG.secretCount);
  });

  it('the wrong number of secrets fails', () => {
    const bad: GeneratedTown = { ...built.town, secrets: built.town.secrets.slice(0, -1) };
    expect(failuresOf(bad, STANDARD_GEN_CONFIG, Object.keys(TRAITS))).toContain('secrets-valid');
  });

  it('a secret naming an unknown witness fails', () => {
    const bad: GeneratedTown = {
      ...built.town,
      secrets: built.town.secrets.map((s, i) => (i === 0 ? { ...s, witnesses: ['ghost-witness'] } : s)),
    };
    expect(failuresOf(bad, STANDARD_GEN_CONFIG, Object.keys(TRAITS))).toContain('secrets-valid');
  });

  it('a witness who is the secret’s own subject fails (participants never witness themselves)', () => {
    const bad: GeneratedTown = {
      ...built.town,
      secrets: built.town.secrets.map((s, i) => (i === 0 ? { ...s, witnesses: [s.subject] } : s)),
    };
    expect(failuresOf(bad, STANDARD_GEN_CONFIG, Object.keys(TRAITS))).toContain('secrets-valid');
  });
});

describe('graph invariants', () => {
  it('meetingGraph: co-scheduled NPCs meet; households meet at home via the venueAt fallback', () => {
    const shared = venue('v');
    const a = npc('a', { schedule: [block('v')] });
    const b = npc('b', { schedule: [block('v')] });
    const c = npc('c', { home: 'home-a' }); // lives with a, never goes out
    const g = meetingGraph({ venues: [venue('home-a', 'd0', 'private'), venue('home-b', 'd0', 'private'), shared], npcs: [a, b, c] });
    expect(g.get('a')!.has('b')).toBe(true);
    expect(g.get('a')!.has('c')).toBe(true);  // overnight at home-a
    expect(g.get('b')!.has('c')).toBe(false);
  });

  it('connected: two hermits in separate homes never meet', () => {
    expect(failuresOf(town([npc('a'), npc('b')]), cfg())).toContain('connected');
  });

  it('speakable: meeting without trusting anyone you meet = hear-only black hole', () => {
    const shared = venue('v');
    const a = npc('a', { schedule: [block('v')] });                    // no edges at all
    const b = npc('b', { schedule: [block('v')], edges: [{ to: 'a', kind: 'friend', trust: 0.5 }] });
    expect(failuresOf(town([a, b], [shared]), cfg())).toContain('speakable');
  });

  it('keystone-2routes: a keystone behind a single connector fails; a well-connected one passes', () => {
    // A,B,C,D cluster at v1; E touches the cluster only through D at v2.
    const v1 = venue('v1'); const v2 = venue('v2');
    const cluster = ['a', 'b', 'c', 'd'].map((id) => npc(id, {
      schedule: id === 'd' ? [block('v1'), block('v2', 700, 800)] : [block('v1')],
      edges: [{ to: id === 'a' ? 'b' : 'a', kind: 'friend', trust: 0.6 }],
    }));
    const e = npc('e', { schedule: [block('v2', 700, 800)], edges: [{ to: 'd', kind: 'friend', trust: 0.6 }] });
    const c5 = cfg({ npcCount: 5, keystoneCount: 1 });
    expect(failuresOf(town([...cluster, e], [v1, v2], ['e']), c5)).toContain('keystone-2routes');
    expect(failuresOf(town([...cluster, e], [v1, v2], ['a']), c5)).not.toContain('keystone-2routes');
  });
});

describe('scenario-castable invariant', () => {
  it('scenario-castable: fails a town with no cast', () => {
    const town = generateTown('cast-seed-1', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    const broken = structuredClone(town);
    broken.cast = null;
    const report = validateTown(broken, STANDARD_GEN_CONFIG, {});
    expect(report.ok).toBe(false);
    expect(report.failures.some((f) => f.invariant === 'scenario-castable')).toBe(true);
  });

  it('scenario-castable: fails when the usurper sits on the council', () => {
    const town = generateTown('cast-seed-1', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    const broken = structuredClone(town);
    broken.cast = { usurper: broken.keystones[0]!, council: broken.keystones };
    const report = validateTown(broken, STANDARD_GEN_CONFIG, {});
    expect(report.failures.some((f) => f.invariant === 'scenario-castable')).toBe(true);
  });

  it('scenario-castable: fails when the usurper has no secret', () => {
    const town = generateTown('cast-seed-1', STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT);
    const broken = structuredClone(town);
    broken.secrets = broken.secrets.filter((s) => s.subject !== broken.cast!.usurper);
    const report = validateTown(broken, STANDARD_GEN_CONFIG, {});
    expect(report.failures.some((f) => f.invariant === 'scenario-castable')).toBe(true);
  });
});

describe('acceptance: the validator reads Testford correctly', () => {
  // Static-graph hand-checks (see plan): Northside hangs on anselm alone.
  // ESCALATION LICENSE: if either fails, verify the meeting graph by hand before touching
  // the assertion — a failure here means either a validator bug or a misread of Testford.
  const asTown = (keystones: string[]): GeneratedTown =>
    ({ fixture: TESTFORD, districts: [], keystones, guards: [], secrets: [], dossier: null });
  const tfCfg = (k: number): GenConfig =>
    ({ npcCount: 12, districtCount: 2, keystoneCount: k, bridgesPerAdjacentPair: 1, guardsPerDistrict: 0, secretCount: 0,
       dossierInformants: 2, dossierTraitReadMax: 6, dossierEdgeReadMax: 8, maxAttempts: 1 });

  it('Testford with no keystones is a valid town', () => {
    expect(validateTown(asTown([]), tfCfg(0), { knownTraitIds: Object.keys(TRAITS) }).ok).toBe(true);
  });

  it("brigid as keystone FAILS — anselm is Northside's only bridge (the known firebreak)", () => {
    const report = validateTown(asTown(['brigid']), tfCfg(1), { knownTraitIds: Object.keys(TRAITS) });
    expect(report.ok).toBe(false);
    expect(report.failures.some((f) => f.invariant === 'keystone-2routes' && f.detail.includes('anselm'))).toBe(true);
  });

  it('osric as keystone PASSES — the town core is multiply connected', () => {
    expect(validateTown(asTown(['osric']), tfCfg(1), { knownTraitIds: Object.keys(TRAITS) }).ok).toBe(true);
  });
});
