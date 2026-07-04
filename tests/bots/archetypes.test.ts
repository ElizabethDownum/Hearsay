import { patientWhisperer, blitzCrier, bestConnected } from '../../src/bots/archetypes';
import { runBotCampaign } from '../../src/bots/runner';
import { runCampaign } from '../../src/sim/campaign';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { STANDARD_RULES } from '../../src/content/rules';
import { hashWorld } from '../../src/sim/hash';
import { TICKS_PER_DAY } from '../../src/core/time';

describe('bots', () => {
  it('bestConnected: edge count desc, lexicographic tie-break', () => {
    const world = buildWorld(TESTFORD, 'bot-0');
    expect(bestConnected(world).slice(0, 3)).toEqual(['anselm', 'mara', 'osric']);
  });

  it('patientWhisperer speaks once on day 0; blitzCrier seeds three stories', () => {
    const patient = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-1', patientWhisperer, 2);
    expect(patient.save.log).toHaveLength(1);
    expect(patient.save.log[0]).toMatchObject({ kind: 'inject', target: 'anselm' });
    const blitz = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-1', blitzCrier, 2);
    expect(blitz.save.log).toHaveLength(3);
    expect(blitz.save.log.map((a) => a.target)).toEqual(['anselm', 'mara', 'osric']);
  });

  it('same seed + same bot = identical save and identical world', () => {
    const a = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-2', blitzCrier, 3);
    const b = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-2', blitzCrier, 3);
    expect(JSON.stringify(a.save)).toBe(JSON.stringify(b.save));
    expect(hashWorld(a.world)).toBe(hashWorld(b.world));
  });

  it('LIVE RUN == REPLAY: the emitted save regrows the same world', () => {
    const live = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-3', patientWhisperer, 3);
    const replayed = runCampaign(TESTFORD, STANDARD_RULES, live.save, 3 * TICKS_PER_DAY);
    expect(hashWorld(replayed)).toBe(hashWorld(live.world));
  });

  it('a bot returning an action outside its day is rejected loudly', () => {
    const rogue = { name: 'rogue', decide: () => [{
      tick: 5 * TICKS_PER_DAY, kind: 'inject' as const, target: 'mara',
      spec: { subject: 'someone' as const, predicate: 'stole', object: null,
        count: null, severity: 3 as const, place: null, attribution: 'someone' as const },
    }] };
    expect(() => runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-4', rogue, 2)).toThrow(/day/);
  });
});
