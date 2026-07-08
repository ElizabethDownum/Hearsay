import { runCampaign, applyAction, type Save, type Action } from '../../src/sim/campaign';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { applyInject } from '../../src/sim/actions';
import { runUntil } from '../../src/sim/step';
import { hashWorld } from '../../src/sim/hash';
import { at } from '../../src/core/time';
import { SOMEONE } from '../../src/sim/rumors/claim';

const spec = {
  subject: SOMEONE, predicate: 'stole', object: null,
  count: 2, severity: 4 as const, place: 'market', attribution: SOMEONE,
};
const save: Save = {
  seed: 'camp-1',
  log: [{ tick: at(0, 8), kind: 'inject', target: 'mara', spec }],
};

describe('runCampaign — Save = seed + action log', () => {
  it('replay equals the hand-driven campaign, hash-identical at day 3', () => {
    // runCampaign now forwards rules (controller rider → startingCoin 20); the hand-driven
    // comparison must build the same way, or the coin field alone diverges the hash.
    const hand = buildWorld(TESTFORD, 'camp-1', STANDARD_RULES);
    runUntil(hand, at(0, 8), STANDARD_RULES);
    applyInject(hand, 'mara', spec);
    runUntil(hand, at(3, 0), STANDARD_RULES);
    const replayed = runCampaign(TESTFORD, STANDARD_RULES, save, at(3, 0));
    expect(hashWorld(replayed)).toBe(hashWorld(hand));
  });

  it('replaying twice is hash-identical (bug-report reproducibility)', () => {
    expect(hashWorld(runCampaign(TESTFORD, STANDARD_RULES, save, at(2, 0))))
      .toBe(hashWorld(runCampaign(TESTFORD, STANDARD_RULES, save, at(2, 0))));
  });

  it('a Save survives JSON round-trip and replays identically', () => {
    const revived = JSON.parse(JSON.stringify(save)) as Save;
    expect(hashWorld(runCampaign(TESTFORD, STANDARD_RULES, revived, at(2, 0))))
      .toBe(hashWorld(runCampaign(TESTFORD, STANDARD_RULES, save, at(2, 0))));
  });

  it('same-tick actions apply in log order (family ids witness it)', () => {
    const twoLog = (first: string, second: string): Save => ({
      seed: 'camp-2',
      log: [
        { tick: at(0, 8), kind: 'inject', target: first, spec },
        { tick: at(0, 8), kind: 'inject', target: second, spec },
      ],
    });
    const ab = runCampaign(TESTFORD, STANDARD_RULES, twoLog('mara', 'osric'), at(0, 9));
    const ba = runCampaign(TESTFORD, STANDARD_RULES, twoLog('osric', 'mara'), at(0, 9));
    expect(Object.keys(ab.beliefs['mara']!)).toContain('f0');   // mara injected first
    expect(Object.keys(ba.beliefs['mara']!)).toContain('f1');   // mara injected second
  });

  it('out-of-order and negative-tick logs are rejected loudly', () => {
    const bad: Save = { seed: 's', log: [
      { tick: at(0, 9), kind: 'inject', target: 'mara', spec },
      { tick: at(0, 8), kind: 'inject', target: 'osric', spec },
    ] };
    expect(() => runCampaign(TESTFORD, STANDARD_RULES, bad, at(1, 0))).toThrow(/index 1/);
    const neg: Save = { seed: 's', log: [{ tick: -1, kind: 'inject', target: 'mara', spec }] };
    expect(() => runCampaign(TESTFORD, STANDARD_RULES, neg, at(1, 0))).toThrow(/negative/);
  });

  it('actions at or past untilTick are not applied; applyAction rejects tick mismatch', () => {
    const later: Save = { seed: 's', log: [{ tick: at(2, 0), kind: 'inject', target: 'mara', spec }] };
    const world = runCampaign(TESTFORD, STANDARD_RULES, later, at(1, 0));
    expect(Object.keys(world.beliefs['mara']!)).toHaveLength(0);
    expect(() => applyAction(world, { tick: 0, kind: 'inject', target: 'mara', spec }))
      .toThrow(/tick/);
  });
});

describe('applyAction rejects unknown kinds (untrusted JSON saves)', () => {
  it('throws loudly instead of silently ignoring', () => {
    const world = buildWorld(TESTFORD, 'unknown-kind');
    const bogus = { tick: 0, kind: 'teleport', target: 'mara' } as unknown as Action;
    expect(() => applyAction(world, bogus)).toThrow(/unknown action kind 'teleport'/);
  });
});
