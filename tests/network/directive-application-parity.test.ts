import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from '../../src/content/rules';
import { buildWorld, enrollPlayer } from '../../src/sim/world';
import { applyAction, runLogOn, type Action } from '../../src/sim/campaign';
import { networkView } from '../../src/sim/fieldwork';
import { hashWorld } from '../../src/sim/hash';
import { miniTown } from '../sim/helpers/minitown';
import type { DirectiveBrief, DirectiveTarget, PlayerDirectiveApplication } from '../../src/sim/directives/types';
import type { WorldState } from '../../src/sim/types';

/**
 * R43 (Astra I9, M1, M2): a composed directive and its preset must be the same act. The presets
 * (`courier`, `assignInformant`) are thin wrappers over common issuance; anything only a preset does
 * is a way to get the priced or recorded service differently by changing the authoring surface.
 */
const RULES = STANDARD_RULES;
const CLAIM = { subject: 'bez', predicate: 'stole', object: null, count: 2, severity: 3 as const, place: null, attribution: 'bez' };

/** ada (the player's asset, trusts the player) and bez on the square all day with the avatar.
 *  `extraAssets` also enrols bez, so a relay route can name them (R43-1). */
function world(seed: string, coin: number, extraAssets: string[] = []): WorldState {
  const fixture = miniTown();
  fixture.npcs = fixture.npcs.filter((npc) => npc.id === 'ada' || npc.id === 'bez');
  for (const npc of fixture.npcs) {
    npc.traits = ['literalist'];
    npc.edges = npc.edges.filter((edge) => edge.to === 'ada' || edge.to === 'bez');
  }
  const w = buildWorld(fixture, seed, RULES);
  enrollPlayer(w, { home: 'square' });
  for (const id of ['ada', ...extraAssets]) {
    w.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [] });
    w.intel.informants.push({ id, assignedVenue: null });
  }
  w.npcs.ada!.edges.push({ to: 'you', kind: 'friend', trust: 0.8 });
  w.coin = coin;
  return w;
}

const composed = (brief: DirectiveBrief, application?: PlayerDirectiveApplication,
  handoff = { outboundVia: [] as string[], reportVia: [] as string[] }): Action => ({
  kind: 'directive', tick: 0, recipient: 'ada', handoff, brief,
  ...(application ? { application } : {}),
} as Action);
const courier = { kind: 'courier', target: 'bez' } as const;
const toBez = (): DirectiveBrief => spread({ kind: 'person', id: 'bez' });

const spread = (audience: Exclude<DirectiveTarget, { kind: 'story' }>): DirectiveBrief => ({
  mission: { kind: 'shape', operation: 'spread', payload: { family: null, parent: null, claim: { ...CLAIM } },
    audience, redirectTo: null },
  priority: 'routine', authority: 'relationship', discretion: 'quiet', specificity: 'detailed',
  guidance: [], active: { from: 15, until: 4320 }, report: 'outcome', reportBy: 4320, purpose: null,
});

describe('a composed courier directive pays the courier price (R43, Astra I9)', () => {
  it('refuses with an empty treasury exactly as the preset does, with zero residue', () => {
    const w = world('r43-courier-broke', 0);
    const before = hashWorld(w);
    expect(() => applyAction(w, composed(spread({ kind: 'person', id: 'bez' }), { kind: 'courier', target: 'bez' }), RULES))
      .toThrow(/3 needed, 0 held/);
    expect(hashWorld(w)).toBe(before);
    const preset = world('r43-courier-broke', 0);
    const presetBefore = hashWorld(preset);
    expect(() => applyAction(preset, { kind: 'courier', tick: 0, asset: 'ada', spec: CLAIM, target: 'bez', viaDrop: null }, RULES))
      .toThrow(/3 needed, 0 held/);
    expect(hashWorld(preset)).toBe(presetBefore);                              // R43-1 (review m-2)
  });

  // R43-1 (R43 review m-2): the remaining shapes of the priced act.
  it('a relayed composed courier is charged once, at issue', () => {
    const w = world('r43-courier-relayed', 10, ['bez']);
    applyAction(w, composed(toBez(), courier, { outboundVia: ['bez'], reportVia: [] }), RULES);
    expect(w.coin).toBe(10 - RULES.economy.courierRun);
    expect(w.network.directiveState!.records).toHaveLength(1);
  });

  it('a composed courier handed to the engine without rules is refused with zero residue', () => {
    const w = world('r43-courier-ruleless', 10);
    const before = hashWorld(w);
    expect(() => applyAction(w, composed(toBez(), courier))).toThrow(/requires rules/);
    expect(hashWorld(w)).toBe(before);
    expect(w.coin).toBe(10);
  });

  it('debits exactly once, on either authoring path', () => {
    const w = world('r43-courier-paid', 10);
    applyAction(w, composed(spread({ kind: 'person', id: 'bez' }), { kind: 'courier', target: 'bez' }), RULES);
    expect(w.coin).toBe(10 - RULES.economy.courierRun);
    const preset = world('r43-courier-preset', 10);
    applyAction(preset, { kind: 'courier', tick: 0, asset: 'ada', spec: CLAIM, target: 'bez', viaDrop: null }, RULES);
    expect(preset.coin).toBe(10 - RULES.economy.courierRun);
  });

  it('a standard (non-courier) shape directive stays free', () => {
    const w = world('r43-standard', 10);
    applyAction(w, composed(spread({ kind: 'person', id: 'bez' })), RULES);
    expect(w.coin).toBe(10);
  });
});

// R43-1 (R43 review I-2): the preset refused, at issue and at no cost, to let an ideology asset
// carry a damaging claim about its own faction; a composed courier carried the same smear for 3 coin.
describe('an ideology asset refuses its own faction\'s smear on either authoring path (R43-1)', () => {
  const ideologue = (seed: string): WorldState => {
    const w = world(seed, 10);
    w.network.assets[0]!.mice = 'ideology';
    expect(w.npcs.ada!.faction).toBe(w.npcs.bez!.faction);                   // the smear is of ada's own
    expect(RULES.predicates[CLAIM.predicate]!.valence).toBe('damaging');
    return w;
  };

  it('the preset refuses with zero residue', () => {
    const w = ideologue('r43-ideology-preset');
    const before = hashWorld(w);
    expect(() => applyAction(w, { kind: 'courier', tick: 0, asset: 'ada', spec: CLAIM, target: 'bez', viaDrop: null }, RULES))
      .toThrow(/ideology/);
    expect(hashWorld(w)).toBe(before);
  });

  it('a composed courier refuses the same way, uncharged, with zero residue', () => {
    const w = ideologue('r43-ideology-composed');
    const before = hashWorld(w);
    expect(() => applyAction(w, composed(toBez(), courier), RULES)).toThrow(/ideology/);
    expect(hashWorld(w)).toBe(before);
    expect(w.coin).toBe(10);
  });

  it('the refusal is the asset\'s ideology, not the claim: another motive carries it', () => {
    const w = ideologue('r43-ideology-control');
    w.network.assets[0]!.mice = 'money';
    applyAction(w, composed(toBez(), courier), RULES);
    expect(w.coin).toBe(10 - RULES.economy.courierRun);
  });

  it('a standard shape directive is not a courier: ideology is judged at receipt, not issue', () => {
    const w = ideologue('r43-ideology-standard');
    applyAction(w, composed(toBez()), RULES);                                  // no application: free, issued
    expect(w.network.directiveState!.records).toHaveLength(1);
  });
});

describe('a composed posting records the player-authored post (R43, Astra M1)', () => {
  it('the network board shows the requested venue for a composed posting, as for the preset', () => {
    const brief: DirectiveBrief = {
      mission: { kind: 'learn', target: { kind: 'venue', id: 'backroom' } },
      priority: 'routine', authority: 'relationship', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 15, until: 4320 }, report: 'outcome', reportBy: 4320, purpose: null,
    };
    const w = world('r43-posting', 0);
    applyAction(w, composed(brief, { kind: 'posting', venue: 'backroom' }), RULES);
    expect(w.intel.requestedPosts).toEqual([{ informant: 'ada', venue: 'backroom', authoredAt: 0 }]);
    expect(networkView(w).assets.find((asset) => asset.id === 'ada')!.requestedVenue).toBe('backroom');

    const preset = world('r43-posting-preset', 0);
    applyAction(preset, { kind: 'assignInformant', tick: 0, informant: 'ada', venue: 'backroom' }, RULES);
    expect(preset.intel.requestedPosts).toEqual([{ informant: 'ada', venue: 'backroom', authoredAt: 0 }]);
  });

  it('a refused composed posting records nothing', () => {
    const brief: DirectiveBrief = {
      mission: { kind: 'learn', target: { kind: 'venue', id: 'square' } }, // does not match the posting
      priority: 'routine', authority: 'relationship', discretion: 'quiet', specificity: 'detailed',
      guidance: [], active: { from: 15, until: 4320 }, report: 'outcome', reportBy: 4320, purpose: null,
    };
    const w = world('r43-posting-refused', 0);
    const before = hashWorld(w);
    expect(() => applyAction(w, composed(brief, { kind: 'posting', venue: 'backroom' }), RULES)).toThrow();
    expect(w.intel.requestedPosts ?? []).toEqual([]);
    expect(hashWorld(w)).toBe(before);
  });
});

describe('literal venue-audience shaping happens in the named venue (R43, Astra M2)', () => {
  it('a literal asset never at the named venue does not complete by telling someone elsewhere', () => {
    const w = world('r43-venue-literal', 0);
    runLogOn(w, RULES, [composed({ ...spread({ kind: 'venue', id: 'backroom' }), active: { from: 15, until: 120 }, reportBy: 120 })], 121);
    const record = w.network.directiveState!.records[0]!;
    expect(record.decision!.initiative).toBe('literal');
    const tellings = w.chronicle.flatMap((row) => (row.kind === 'telling' && row.speaker === 'ada' ? [row] : []));
    expect(tellings.filter((row) => row.venue !== 'backroom')).toEqual([]);
    expect(record.execution!.state).not.toBe('completed');
  });

  // R43-1 (R43 review m-1): the adaptive branch, which the M2 tests left unexercised.
  it('an adaptive asset works the room it is in instead, and completes there', () => {
    const w = world('r43-venue-adaptive', 0);
    runLogOn(w, RULES, [composed({ ...spread({ kind: 'venue', id: 'backroom' }),
      specificity: 'guided', purpose: 'the room will do', active: { from: 15, until: 120 }, reportBy: 120 })], 121);
    const record = w.network.directiveState!.records[0]!;
    expect(record.decision!.initiative).toBe('adaptive');
    expect(record.execution!.state).toBe('completed');
    const telling = w.chronicle.find((row) => row.kind === 'telling' && row.speaker === 'ada');
    expect(telling).toMatchObject({ venue: 'square' });                         // never at the backroom
  });

  it('a literal asset at the named venue still completes there', () => {
    const w = world('r43-venue-here', 0);
    runLogOn(w, RULES, [composed({ ...spread({ kind: 'venue', id: 'square' }), active: { from: 15, until: 120 }, reportBy: 120 })], 121);
    const record = w.network.directiveState!.records[0]!;
    expect(record.decision!.initiative).toBe('literal');
    expect(record.execution!.state).toBe('completed');
    const telling = w.chronicle.find((row) => row.kind === 'telling' && row.speaker === 'ada');
    expect(telling).toMatchObject({ venue: 'square' });
  });
});
