import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { at } from '../../src/core/time';
import { SOMEONE, type Claim } from '../../src/sim/rumors/claim';
import { threadOf, explainBelief } from '../../src/sim/chronicle';
import type { WorldState } from '../../src/sim/types';

const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
};

const world = buildWorld(TESTFORD, 'chron-1');
runUntil(world, at(0, 8), STANDARD_RULES);
const injected = applyInject(world, 'mara', spec);
runUntil(world, at(2, 23), STANDARD_RULES);

describe('the chronicle records the causal chain', () => {
  it('thread starts with the injection and is tick-ordered', () => {
    const thread = threadOf(world, injected.family);
    expect(thread[0]).toMatchObject({ kind: 'inject', target: 'mara', claimId: injected.id });
    for (let i = 1; i < thread.length; i++) {
      expect(thread[i]!.tick).toBeGreaterThanOrEqual(thread[i - 1]!.tick);
    }
    expect(thread.length).toBeGreaterThan(3); // the story actually traveled
  });

  it('FAIR-COP LAW (property): every belief in every mind is explained by a record', () => {
    for (const npcId of Object.keys(world.npcs)) {
      for (const family of Object.keys(world.beliefs[npcId]!)) {
        const entry = explainBelief(world, npcId, family);
        expect(entry, `${npcId} holds ${family} unexplained`).not.toBeNull();
      }
    }
  });

  it('FAIR-COP LAW (lineage): every held claim walks to a recorded root inject for its family', () => {
    // Amended in Plan 4 Task 3 (amendment #3): the old pin asserted every walk lands on
    // THE player injection, assuming the world has a unique root. Self-rumor reactions
    // legitimately mint counter-spin roots (NPC self-injects), so the route-agnostic
    // intent is pinned instead: each family's root is parentless, same-family, and
    // explained by a recorded inject. The player's family still roots at the injection.
    for (const npcId of Object.keys(world.npcs)) {
      for (const family of Object.keys(world.beliefs[npcId]!)) {
        let cur: Claim | undefined = world.beliefs[npcId]![family]!.claim;
        let hops = 0;
        while (cur && cur.parent !== null) {
          cur = world.claims[cur.parent];
          expect(cur, `${npcId}/${family}: broken lineage`).toBeDefined();
          expect(++hops).toBeLessThan(1000);
        }
        expect(cur, `${npcId}/${family}: no root`).toBeDefined();
        expect(cur!.family).toBe(family);
        const rootInject = world.chronicle.find((e) => e.kind === 'inject' && e.claimId === cur!.id);
        expect(rootInject, `${npcId}/${family}: root ${cur!.id} has no inject record`).toBeDefined();
        if (family === injected.family) expect(cur!.id).toBe(injected.id);
      }
    }
  });

  it('explainBelief names the exact delivery: heardFrom spoke it, hearer heard it', () => {
    const entry = explainBelief(world, 'rafe', injected.family)!;
    expect(entry.kind).toBe('telling');
    if (entry.kind === 'telling') {
      expect(entry.speaker).toBe(world.beliefs['rafe']![injected.family]!.heardFrom);
      expect(entry.heardBy.map((h) => h.id)).toContain('rafe');
      expect(entry.claimId).toBe(world.beliefs['rafe']![injected.family]!.claim.id);
    }
  });

  it('chronicle survives serialization (it is plain state)', () => {
    const revived = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(revived.chronicle).toEqual(world.chronicle);
  });
});
