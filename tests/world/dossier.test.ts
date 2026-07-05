import { generateTown } from '../../src/world/gen';
import { validateTown } from '../../src/world/validate';
import { generateValidTown } from '../../src/world/serve';
import { attachPlayer, worldFromTown } from '../../src/world/attach';
import { STANDARD_GEN_CONFIG, STANDARD_GEN_CONTENT } from '../../src/content/gen/standard';
import { STANDARD_RULES } from '../../src/content/rules';
import { TRAITS } from '../../src/content/traits';
import { hashWorld } from '../../src/sim/hash';
import { runLogOn, type ActionLog } from '../../src/sim/campaign';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';
import type { Dossier, GeneratedTown } from '../../src/world/types';

const CFG = STANDARD_GEN_CONFIG;
const CONTENT = STANDARD_GEN_CONTENT;
const OPTS = { knownTraitIds: Object.keys(TRAITS) };
const genTown = (seed: string): GeneratedTown => generateTown(seed, CFG, CONTENT);

/** First seed in a family whose dossier carries a secret hint (~half do) — keeps hint assertions non-vacuous. */
function hintedTown(prefix: string): GeneratedTown {
  for (let i = 0; i < 40; i++) {
    const t = genTown(`${prefix}-${i}`);
    if (t.dossier!.secretHint) return t;
  }
  throw new Error('hintedTown: no hinted seed found in 40 tries');
}

describe('day-0 dossier — truthful, capped starting intelligence', () => {
  // (a) determinism
  it('same seed ⇒ deep-equal dossier', () => {
    const a = genTown('dossier-det').dossier;
    const b = genTown('dossier-det').dossier;
    expect(a).toBeDefined();
    expect(a).toEqual(b);
  });

  it('different seeds ⇒ different dossiers', () => {
    expect(genTown('dossier-x').dossier).not.toEqual(genTown('dossier-y').dossier);
  });

  // (b) caps + truthfulness, read straight off the fixture
  describe('caps and truthfulness (against the fixture)', () => {
    const town = genTown('dossier-caps');
    const d = town.dossier!;
    const byId = new Map(town.fixture.npcs.map((n) => [n.id, n]));
    const guardIds = new Set(town.guards.map((g) => g.id));

    it('informants: exactly config.dossierInformants, distinct, resolve, never guards', () => {
      expect(d.informants).toHaveLength(CFG.dossierInformants);
      expect(new Set(d.informants).size).toBe(d.informants.length);
      for (const id of d.informants) {
        expect(byId.has(id)).toBe(true);
        expect(byId.get(id)!.occupation).not.toBe('guard');
        expect(guardIds.has(id)).toBe(false);
      }
    });

    it('traitReads: 1..max, distinct npcs, every read is a REAL trait of that npc', () => {
      expect(d.traitReads.length).toBeGreaterThanOrEqual(1);
      expect(d.traitReads.length).toBeLessThanOrEqual(CFG.dossierTraitReadMax);
      const npcs = d.traitReads.map((t) => t.npc);
      expect(new Set(npcs).size).toBe(npcs.length);
      for (const tr of d.traitReads) {
        expect(byId.get(tr.npc)!.traits).toContain(tr.trait);
      }
    });

    it('edgeReads: ≤ max, each a REAL edge triple', () => {
      expect(d.edgeReads.length).toBeLessThanOrEqual(CFG.dossierEdgeReadMax);
      for (const er of d.edgeReads) {
        expect(byId.get(er.from)!.edges.some((e) => e.to === er.to && e.kind === er.kind)).toBe(true);
      }
    });

    it('secretHint (when non-null) points at a real secret’s subject and one of its witnesses', () => {
      const town2 = hintedTown('dossier-hint');
      const hint = town2.dossier!.secretHint!;
      const secret = town2.secrets.find((s) => s.subject === hint.about);
      expect(secret).toBeDefined();
      expect(secret!.witnesses).toContain(hint.witness);
    });
  });

  // (c) validator: green on generated, red on each hand-break
  describe('dossier-capped: green on generated, red on hand-break', () => {
    const built = generateValidTown('dossier-validator', CFG, CONTENT, STANDARD_RULES, OPTS);
    const okTown = built.town;
    const invariantsOf = (t: GeneratedTown): string[] =>
      validateTown(t, CFG, OPTS).failures.map((f) => f.invariant);
    const withDossier = (patch: Partial<Dossier>): GeneratedTown =>
      ({ ...okTown, dossier: { ...okTown.dossier!, ...patch } });

    it('a generated town passes', () => {
      expect(validateTown(okTown, CFG, OPTS).ok).toBe(true);
    });

    it('an extra informant fails dossier-capped', () => {
      const bad = withDossier({ informants: [...okTown.dossier!.informants, okTown.fixture.npcs[0]!.id] });
      expect(invariantsOf(bad)).toContain('dossier-capped');
    });

    it('a fabricated trait read fails dossier-capped', () => {
      const first = okTown.dossier!.traitReads[0]!;
      const bad = withDossier({ traitReads: [{ npc: first.npc, trait: 'phantom-trait' }, ...okTown.dossier!.traitReads.slice(1)] });
      expect(invariantsOf(bad)).toContain('dossier-capped');
    });

    it('a fabricated edge read fails dossier-capped', () => {
      const bad = withDossier({ edgeReads: [{ from: okTown.fixture.npcs[0]!.id, to: okTown.fixture.npcs[1]!.id, kind: 'phantom-kind' }] });
      expect(invariantsOf(bad)).toContain('dossier-capped');
    });

    it('a hint whose witness never witnessed it fails dossier-capped', () => {
      const secret = okTown.secrets[0]!;
      // the subject is never a witness of its own secret — a guaranteed non-witness
      const bad = withDossier({ secretHint: { about: secret.subject, witness: secret.subject } });
      expect(invariantsOf(bad)).toContain('dossier-capped');
    });
  });

  // (d) attachPlayer
  describe('attachPlayer wires the avatar, informants, and dossier log', () => {
    it('enrolls at a private safehouse in the first district, wires informants, seeds the log in order', () => {
      const town = hintedTown('attach-hinted');
      const d = town.dossier!;
      const world = worldFromTown(town, 'attach-seed');
      attachPlayer(world, town);

      // avatar enrolled at the safehouse
      expect(world.playerId).toBe('you');
      expect(world.playerVenue).toBe('safehouse');
      const safehouse = world.venues['safehouse'];
      expect(safehouse).toBeDefined();
      expect(safehouse!.access).toBe('private');
      expect(safehouse!.district).toBe(town.districts[0]!.id);
      expect(world.npcs['you']!.home).toBe('safehouse');

      // informants wired, unassigned
      expect(world.intel.informants.map((i) => i.id)).toEqual(d.informants);
      expect(world.intel.informants.every((i) => i.assignedVenue === null)).toBe(true);

      // dossier rows: exact kinds, in traitReads → edgeReads → hint order, all via dossier / tick 0 / safehouse
      const log = world.intel.log;
      const expectedKinds = [
        ...d.traitReads.map(() => 'trait-read'),
        ...d.edgeReads.map(() => 'edge-read'),
        ...(d.secretHint ? ['hint'] : []),
      ];
      expect(log.map((e) => e.kind)).toEqual(expectedKinds);
      expect(log.every((e) => e.via === 'dossier' && e.tick === 0 && e.venue === 'safehouse' && e.overheard === false)).toBe(true);

      // field mapping is faithful to the dossier
      expect(log.filter((e) => e.kind === 'trait-read').map((e) => ({ npc: e.npc, trait: e.trait }))).toEqual(d.traitReads);
      expect(log.filter((e) => e.kind === 'edge-read').map((e) => ({ from: e.edgeFrom, to: e.edgeTo, kind: e.edgeKind }))).toEqual(d.edgeReads);
      expect(log.filter((e) => e.kind === 'hint').map((e) => ({ about: e.hintAbout, witness: e.hintWitness })))
        .toEqual([{ about: d.secretHint!.about, witness: d.secretHint!.witness }]);
    });

    it('double-attach throws', () => {
      const town = genTown('attach-double');
      const world = worldFromTown(town, 'attach-double-seed');
      attachPlayer(world, town);
      expect(() => attachPlayer(world, town)).toThrow();
    });
  });

  // (e) full campaign replay: build + attach + 4 verbs, 2 days, hash-identical on a fresh world
  it('worldFromTown + attachPlayer + a 4-verb log replays hash-identical on a fresh world', () => {
    const town = generateValidTown('replay-town', CFG, CONTENT, STANDARD_RULES, OPTS).town;
    const build = (): ReturnType<typeof worldFromTown> => {
      const w = worldFromTown(town, 'replay-seed');
      attachPlayer(w, town);
      return w;
    };
    const log: ActionLog = [
      {
        tick: 0, kind: 'inject', target: town.fixture.npcs[0]!.id,
        spec: { subject: town.fixture.npcs[1]!.id, predicate: 'stole', object: null, count: 1, severity: 4, place: null, attribution: SOMEONE },
      },
      { tick: 0, kind: 'goTo', venue: 'tavern-d0' },
      { tick: 0, kind: 'assignInformant', informant: town.dossier!.informants[0]!, venue: 'market-d0' },
      { tick: 0, kind: 'codex', op: 'propose', npc: town.fixture.npcs[2]!.id, trait: 'literalist' },
    ];

    const a = runLogOn(build(), STANDARD_RULES, log, at(2, 0));
    const b = runLogOn(build(), STANDARD_RULES, log, at(2, 0));

    expect(a.intel.log.length).toBeGreaterThan(0);   // the dossier alone seeds the log
    expect(hashWorld(a)).toBe(hashWorld(b));          // full campaign determinism
  });
});
