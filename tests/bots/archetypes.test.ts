import { patientWhisperer, blitzCrier, cannyWhisperer, bestConnected, bestConnectedAvoiding } from '../../src/bots/archetypes';
import { runBotCampaign, runBotCampaignOn } from '../../src/bots/runner';
import { runCampaign, runLogOn, type Action } from '../../src/sim/campaign';
import { buildWorld } from '../../src/sim/world';
import { TESTFORD } from '../../src/content/fixtures/testford';
import { miniTown } from '../sim/helpers/minitown';
import { STANDARD_RULES } from '../../src/content/rules';
import { hashWorld } from '../../src/sim/hash';
import { TICKS_PER_DAY } from '../../src/core/time';
import { scheduleSetup } from '../../src/sim/phases';

describe('bots', () => {
  it('bestConnected: edge count desc, lexicographic tie-break', () => {
    const world = buildWorld(TESTFORD, 'bot-0');
    expect(bestConnected(world).slice(0, 3)).toEqual(['anselm', 'mara', 'osric']);
  });

  it('the canny whisperer never hands hop zero to a gatekeeper', () => {
    // miniTown: ada tops the graph (3 edges) but is a skeptic — retellGate
    // 'requires-corroboration', the hub where uncorroborated whispers die. bez/cyn/dov
    // each hold one edge and gate nothing (lexicographic tie-break orders them).
    const world = buildWorld(miniTown(), 'canny-0');
    expect(bestConnected(world)[0]).toBe('ada');

    const avoiding = bestConnectedAvoiding(world, STANDARD_RULES);
    expect(avoiding[0]).toBe('bez');                        // best NON-gatekeeper mind
    expect(avoiding.at(-1)).toBe('ada');                    // the skeptic sinks to the back...
    expect([...avoiding].sort()).toEqual([...bestConnected(world)].sort()); // ...never dropped

    const day0 = cannyWhisperer.decide(world, STANDARD_RULES, 0);
    expect(day0).toHaveLength(1);
    expect(day0[0]).toMatchObject({ kind: 'inject', target: 'bez' });
    expect(cannyWhisperer.decide(world, STANDARD_RULES, 1)).toEqual([]); // day 0 only, then silence
  });

  it('patientWhisperer speaks once on day 0; blitzCrier seeds three stories', () => {
    const patient = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-1', patientWhisperer, 2);
    expect(patient.save.log).toHaveLength(1);
    expect(patient.save.log[0]).toMatchObject({ kind: 'inject', target: 'anselm' });
    const blitz = runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-1', blitzCrier, 2);
    expect(blitz.save.log).toHaveLength(3);
    expect(blitz.save.log.map((a) => (a.kind === 'inject' ? a.target : null))).toEqual(['anselm', 'mara', 'osric']);
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

  it('bot live drive and replay share the phase transaction when setup is due', () => {
    const build = () => {
      const world = buildWorld(miniTown(), 'bot-phases');
      scheduleSetup(world, {
        id: 'bot-fuse', due: 1, kind: 'schedule-override', actor: 'ada', ref: 'test',
        override: { fromDay: 0, toDay: 1, from: 0, to: 1440, venue: 'backroom', source: 'vignette' },
      });
      return world;
    };
    const spec = { subject: 'someone' as const, predicate: 'stole', object: null,
      count: null, severity: 3 as const, place: null, attribution: 'someone' as const };
    const bot = { name: 'phase-bot', decide: (_world: unknown, _rules: unknown, day: number): Action[] =>
      day === 0 ? [{ tick: 1, kind: 'inject', target: 'ada', spec }] : [] };

    const live = runBotCampaignOn(build(), STANDARD_RULES, bot, 1);
    const replay = runLogOn(build(), STANDARD_RULES, live.save.log, TICKS_PER_DAY);
    expect(hashWorld(live.world)).toBe(hashWorld(replay));
  });

  it('a bot returning an action outside its day is rejected loudly', () => {
    const rogue = { name: 'rogue', decide: () => [{
      tick: 5 * TICKS_PER_DAY, kind: 'inject' as const, target: 'mara',
      spec: { subject: 'someone' as const, predicate: 'stole', object: null,
        count: null, severity: 3 as const, place: null, attribution: 'someone' as const },
    }] };
    expect(() => runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-4', rogue, 2)).toThrow(/day/);
  });

  it('a bot returning out-of-order actions within a day is rejected loudly', () => {
    const spec = { subject: 'someone' as const, predicate: 'stole', object: null,
      count: null, severity: 3 as const, place: null, attribution: 'someone' as const };
    const scrambled = { name: 'scrambled', decide: (_w: unknown, _r: unknown, day: number) =>
      day !== 0 ? [] : [
        { tick: 720, kind: 'inject' as const, target: 'mara', spec },
        { tick: 480, kind: 'inject' as const, target: 'osric', spec },
      ] };
    expect(() => runBotCampaign(TESTFORD, STANDARD_RULES, 'bot-5', scrambled, 1)).toThrow(/order/);
  });
});
