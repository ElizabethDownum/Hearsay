import { describe, expect, it } from 'vitest';
import { watchfordWorld } from '../sim/helpers/watchford-world';
import { enrollPlayer } from '../../src/sim/world';
import { STANDARD_RULES } from '../../src/content/rules';
import { runTurncoatPass } from '../../src/sim/network/turncoats';
import { assetFor, dispositionOf, setDispositionEdge, slideDisposition } from '../../src/sim/network/roster';
import { captureIntel, networkView } from '../../src/sim/fieldwork';
import { queueUnqueuedFieldReports } from '../../src/sim/directives/field-reports';
import { realizeNetworkForward } from '../../src/sim/directives/transport';
import { informantLedger } from '../../src/intel/ledger';
import { at } from '../../src/core/time';
import { SOMEONE, type Claim, type EntityId } from '../../src/sim/rumors/claim';
import type { SketchFeature } from '../../src/sim/enemy/state';
import type { TickEvents } from '../../src/sim/perception';
import type { WorldState } from '../../src/sim/types';

// ─────────────────────────────────────────────────────────────────────────────
// Plan 8 Task 12 — the canary-vs-turncoat e2e (the amendment-#4 audit loop, player-side only).
//
// "Flip an asset by staging (identification + strikes), run a canary through both a loyal and the
//  turned channel → the divergence is VISIBLE in ledger cross-checks and the turned channel dropped
//  the watch sighting — the audit loop closes end-to-end, player-side only."
//
// The player never sees a `turned` flag (a pillar law). He catches the turncoat by CROSS-CHECKING his
// own channels: the same event, reported two ways, is the fingerprint. This test drives that end to
// end — flip by the real mechanism, then diff the two channels via the informant ledger.
// ─────────────────────────────────────────────────────────────────────────────

const RULES = STANDARD_RULES;

/** A GENUINE identification: a carrier-profile feature whose SUBJECT is `id` — exactly the predicate
 *  the flip reads ("their id appears as any sketch feature subject"). */
function identifyFeature(id: EntityId): SketchFeature {
  return {
    id: `sf-${id}`, kind: 'carrier-profile', day: 0, family: null, subject: id, district: 'w0',
    detail: `hop-zero candidate: ${id}`, evidence: [{ tick: 0, observer: id, claimId: null }],
  };
}

/**
 * Two player channels on a Watchford world — mira (LOYAL) and sten (to be TURNED). sten is flipped BY
 * THE MECHANISM: three missed-wage strikes erode his trust 0.5 → 0.35 (under the 0.4 flip line), the
 * enemy IDENTIFIES him (a carrier-profile naming him), and the nightly turncoat pass LATCHES `turned`.
 * `turned` is never set by hand — the whole point is that the flip is real and the flag stays hidden.
 */
function stageTwoChannels(seed: string): WorldState {
  const world = watchfordWorld(seed);
  enrollPlayer(world, { home: 'square-w0' }); // the avatar plays no part in the canary feed below
  for (const id of ['mira', 'sten']) {
    world.intel.informants.push({ id, assignedVenue: 'square-w0' });
    world.network.assets.push({ id, mice: null, wagePaidThroughDay: 0, strikes: 0, facts: [{ tick: 0, kind: 'recruited-by', ref: 'player' }] });
  }
  setDispositionEdge(world, 'mira', 0.75); // the loyal channel — well clear of the flip line
  setDispositionEdge(world, 'sten', 0.5);

  const sten = assetFor(world, 'player', 'sten')!;
  for (let i = 0; i < 3; i++) { sten.strikes += 1; slideDisposition(world, 'sten', -0.05); } // 3 strikes: 0.5 → 0.35
  world.enemy.sketch.push(identifyFeature('sten'));           // the enemy named him
  world.tick = at(1, 8);                                      // a plain (non-rest) tick — no weekly emissions
  runTurncoatPass(world, RULES);                              // the pass LATCHES turned — never set by hand
  return world;
}

describe('canary vs turncoat e2e — the audit loop closes by diffing your own channels', () => {
  it('flip is real (strikes + identification), and a canary diverges in the ledger + drops the watch sighting', () => {
    const world = stageTwoChannels('canary-1');

    // The flip happened BY MECHANISM, and only to the identified, eroded asset.
    expect(dispositionOf(world, 'sten')).toBeCloseTo(0.35, 10); // strikes eroded him under the line
    expect(assetFor(world, 'player', 'sten')!.turned).toBe(true);        // …and the nightly pass latched it
    expect(assetFor(world, 'player', 'mira')!.turned).toBeFalsy();       // mira: never identified → loyal

    // The CANARY: ONE event both channels witness — a juicy story (count 8, sev 5), a guard sighting
    // (gale co-located → a watch sighting), and an authority asking to each. Same input, two channels.
    const T = at(1, 9);
    const STORY: Claim = {
      id: 'c-canary', family: 'f-canary', parent: null, subject: 'quill', predicate: 'stole',
      object: null, count: 8, severity: 5, place: null, attribution: SOMEONE,
    };
    const feed: TickEvents = {
      tick: T,
      positions: { mira: 'square-w0', sten: 'square-w0', gale: 'square-w0' }, // gale (guard) → watch sighting
      utterances: [{ tick: T, venue: 'square-w0', circleMembers: ['otto', 'mira', 'sten'], speaker: 'otto', addressedTo: 'mira', claim: STORY, mode: 'telling' }],
      askings: [
        { tick: T, venue: 'square-w0', circleMembers: ['gale', 'mira', 'sten'], speaker: 'gale', addressedTo: 'mira', about: { family: 'f-canary' }, authority: true },
        { tick: T, venue: 'square-w0', circleMembers: ['gale', 'mira', 'sten'], speaker: 'gale', addressedTo: 'sten', about: { family: 'f-canary' }, authority: true },
      ],
    };
    captureIntel(world, feed, RULES);
    expect(world.intel.log).toHaveLength(0); // remote observation alone is not player knowledge
    queueUnqueuedFieldReports(world);
    for (const message of [...world.network.directiveState!.messages]) {
      const speech = realizeNetworkForward(world, message.id, {
        venue: 'square-w0', members: [message.origin, 'you'],
      }, message.availableAfter, RULES)!;
      captureIntel(world, {
        tick: speech.tick, positions: {}, utterances: [], askings: [], networkSpeeches: [speech],
      }, RULES);
    }

    const loyal = world.intel.log.filter((e) => e.via === 'mira');
    const turned = world.intel.log.filter((e) => e.via === 'sten');

    // (1) BOTH channels carried the story — the corroboration the audit rests on.
    const loyalStory = loyal.find((e) => e.kind === 'utterance' && e.family === 'f-canary')!;
    const turnedStory = turned.find((e) => e.kind === 'utterance' && e.family === 'f-canary')!;
    expect(loyalStory).toBeTruthy();
    expect(turnedStory).toBeTruthy();

    // (2) The ledger CROSS-CHECK sees the corroboration (informantLedger.corroboratedElsewhere) — the
    //     passive amendment-#4 detector: sten's channel carried f-canary, and so did another channel.
    const stenLedger = informantLedger(world.intel.log, 'sten');
    const corr = stenLedger.corroboratedElsewhere.find((c) => c.family === 'f-canary');
    expect(corr, 'f-canary corroborated by another channel').toBeTruthy();
    expect(corr!.otherVias).toContain('mira');

    // (3) …and the CONTENT diverges: the turned channel MINIMIZED the same story (count halved,
    //     severity −1). This divergence — visible ONLY by diffing the two channels — IS the fingerprint.
    expect(loyalStory.reported!.count).toBe(8);
    expect(loyalStory.reported!.severity).toBe(5);
    expect(turnedStory.reported!.count).toBe(4);    // minimizer: floor(8/2)
    expect(turnedStory.reported!.severity).toBe(4); // minimizer: 5 − 1
    expect(turnedStory.reported!.count).not.toBe(loyalStory.reported!.count); // same family, different numbers

    // (4) The turned channel DROPPED the watch sighting: mira logged gale's presence, sten did not.
    expect(loyal.some((e) => e.kind === 'presence' && e.actor === 'gale')).toBe(true);
    expect(turned.some((e) => e.kind === 'presence')).toBe(false);

    // (5) …and OMITTED the authority asking (also enemy-relevant): loyal logged it, the turncoat didn't.
    expect(loyal.some((e) => e.kind === 'asking' && e.authority)).toBe(true);
    expect(turned.some((e) => e.kind === 'asking' && e.authority)).toBe(false);

    // (6) PLAYER-SIDE ONLY: nothing exposes the flip. networkView carries no `turned` field, and
    //     toggling the hidden flag changes NOTHING the player can see — the audit closed on the diff
    //     above, never a flag.
    const net = networkView(world);
    expect(net.assets.map((a) => a.id)).toContain('sten');
    for (const a of net.assets) expect(Object.keys(a)).not.toContain('turned');
    const before = JSON.stringify(networkView(world));
    assetFor(world, 'player', 'sten')!.turned = false; // pretend the flag flipped back — the player's view can't tell
    expect(JSON.stringify(networkView(world))).toBe(before);
  });
});
