import { describe, expect, it } from 'vitest';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { miniTown } from './helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyAction, runLogOn, type ActionLog } from '../../src/sim/campaign';
import { applyTag } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { hashWorld, stableStringify } from '../../src/sim/hash';
import { at } from '../../src/core/time';
import type { WorldState } from '../../src/sim/types';
import { perceivedScrutiny, recordScrutiny } from '../../src/sim/directives/scrutiny';

describe('applyTag — margin notes, validation mirrors applyCard verbatim', () => {
  it('add/update/remove happy path; update patches non-null fields only and bumps updatedTick', () => {
    const world = buildWorld(miniTown(), 'tag-1');
    applyTag(world, 'add', 't1', 'npc:ada', 'watch her', 0);
    expect(world.intel.tags).toHaveLength(1);
    expect(world.intel.tags[0]).toMatchObject({
      id: 't1', target: 'npc:ada', text: 'watch her', createdTick: 0, updatedTick: 0,
    });

    // text-only update: target unchanged, updatedTick bumps.
    applyTag(world, 'update', 't1', null, 'watch her closely', 5);
    expect(world.intel.tags[0]).toMatchObject({
      id: 't1', target: 'npc:ada', text: 'watch her closely', createdTick: 0, updatedTick: 5,
    });

    // target-only update: text unchanged.
    applyTag(world, 'update', 't1', 'entry:e0', null, 6);
    expect(world.intel.tags[0]).toMatchObject({ target: 'entry:e0', text: 'watch her closely', updatedTick: 6 });

    applyTag(world, 'remove', 't1', null, null, 6);
    expect(world.intel.tags).toHaveLength(0);
  });

  it('dup add throws', () => {
    const world = buildWorld(miniTown(), 'tag-2');
    applyTag(world, 'add', 't1', 'npc:ada', 'x', 0);
    expect(() => applyTag(world, 'add', 't1', 'npc:bez', 'y', 0)).toThrow(/duplicate/);
  });

  it('unknown id throws on update', () => {
    const world = buildWorld(miniTown(), 'tag-3');
    expect(() => applyTag(world, 'update', 'ghost', null, 'x', 0)).toThrow(/unknown id/);
  });

  it('unknown id throws on remove', () => {
    const world = buildWorld(miniTown(), 'tag-4');
    expect(() => applyTag(world, 'remove', 'ghost', null, null, 0)).toThrow(/unknown id/);
  });

  it('add requires both target and text', () => {
    const world = buildWorld(miniTown(), 'tag-5');
    expect(() => applyTag(world, 'add', 't1', null, 'x', 0)).toThrow(/target/);
    expect(() => applyTag(world, 'add', 't1', 'npc:ada', null, 0)).toThrow(/text/);
    expect(world.intel.tags).toHaveLength(0); // neither partial add landed
  });

  it('target prefix is a whitelist (npc:|entry:|cluster:|informant:|venue:), enforced on add and update', () => {
    const world = buildWorld(miniTown(), 'tag-6');
    const kinds = ['npc', 'entry', 'cluster', 'informant', 'venue'];
    kinds.forEach((kind, i) => applyTag(world, 'add', `w${i}`, `${kind}:x`, 'ok', 0));
    expect(world.intel.tags).toHaveLength(5);

    expect(() => applyTag(world, 'add', 'bad1', 'bogus:x', 'ok', 0)).toThrow();
    expect(() => applyTag(world, 'add', 'bad2', 'npc', 'ok', 0)).toThrow(); // missing colon
    expect(() => applyTag(world, 'update', 'w0', 'bogus:x', null, 0)).toThrow();
    expect(world.intel.tags).toHaveLength(5); // none of the rejects landed

    // Existence is NOT validated — a hunch may point anywhere, as long as the kind is real.
    applyTag(world, 'add', 'ghosty', 'npc:no-such-npc', 'a hunch', 0);
    expect(world.intel.tags.find((t) => t.id === 'ghosty')).toBeDefined();
  });
});

describe('TagAction — wired through applyAction, the Action union, and replay', () => {
  it('applyAction dispatches "tag" through applyTag', () => {
    const world = buildWorld(miniTown(), 'tag-act-1');
    applyAction(world, { tick: 0, kind: 'tag', op: 'add', id: 't1', target: 'npc:ada', text: 'hi' });
    expect(world.intel.tags).toHaveLength(1);
    expect(() => applyAction(world, { tick: 0, kind: 'tag', op: 'add', id: 't1', target: 'npc:bez', text: 'x' }))
      .toThrow(/duplicate/);
  });

  it('a log of tag actions replays hash-identical on two fresh worlds', () => {
    const log: ActionLog = [
      { tick: 0, kind: 'tag', op: 'add', id: 't1', target: 'npc:ada', text: 'hi' },
      { tick: 0, kind: 'tag', op: 'update', id: 't1', target: null, text: 'hi there' },
      { tick: 0, kind: 'tag', op: 'add', id: 't2', target: 'venue:square', text: 'meet here' },
    ];
    const a = runLogOn(buildWorld(miniTown(), 'tag-replay'), STANDARD_RULES, log, at(0, 1));
    const b = runLogOn(buildWorld(miniTown(), 'tag-replay'), STANDARD_RULES, log, at(0, 1));
    expect(hashWorld(a)).toBe(hashWorld(b));
    expect(a.intel.tags).toHaveLength(2);
  });
});

describe('sim-blind by property (amendment #5b) — tags never steer a simulated decision', () => {
  it('private tag and codex mutations leave perceived scrutiny exactly equal', () => {
    const plain = buildWorld(miniTown(), 'scrutiny-private');
    const privateNotes = buildWorld(miniTown(), 'scrutiny-private');
    recordScrutiny(plain, 'ada', 'bez', 'questioning', 0);
    recordScrutiny(privateNotes, 'ada', 'bez', 'questioning', 0);
    applyTag(privateNotes, 'add', 'suspect', 'npc:ada', 'possible turncoat', 0);
    privateNotes.intel.codex.push({ npc: 'ada', trait: 'vaguener', proposedAt: 0 });
    expect(perceivedScrutiny(privateNotes, 'ada', 'bez', at(1, 0)))
      .toBe(perceivedScrutiny(plain, 'ada', 'bez', at(1, 0)));
  });

  it('20 tags vs. none: identical worlds run 2 days converge everywhere except intel.tags', () => {
    const build = (): WorldState => {
      const world = buildWorld(miniTown(), 'blind-1');
      enrollPlayer(world, { home: 'square' });
      return world;
    };
    const plain = build();
    const tagged = build();
    for (let i = 0; i < 20; i++) {
      applyTag(tagged, 'add', `t${i}`, 'npc:ada', `note number ${i}`, 0);
    }
    expect(tagged.intel.tags).toHaveLength(20); // the perturbation is real

    runUntil(plain, at(2, 0), STANDARD_RULES);
    runUntil(tagged, at(2, 0), STANDARD_RULES);

    // Strip via structuredClone + delete, stableStringify both — everything EXCEPT intel.tags
    // must be byte-identical, proving tags never fed back into any simulated decision.
    const strip = (w: WorldState): unknown => {
      const clone = structuredClone(w);
      const asPartial = clone.intel as unknown as { tags?: unknown };
      delete asPartial.tags;
      return clone;
    };
    expect(stableStringify(strip(tagged))).toBe(stableStringify(strip(plain)));
    // The tags themselves genuinely differ (a real perturbation, not a no-op).
    expect(stableStringify(tagged.intel.tags)).not.toBe(stableStringify(plain.intel.tags));
  });
});
