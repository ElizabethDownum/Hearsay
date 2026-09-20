/**
 * Plan 9 / Task 8 — THE TERMINAL CANARY LESSON.
 *
 * One real campaign, driven only by logged player verbs through the ordinary tick loop
 * (`runLogOn` -> `prepareTick`/`finishTick`), that reaches a real terminal status and then
 * teaches its lesson through the INSTALLED debrief model (`debriefView`) and the INSTALLED
 * debrief UI (`DebriefThreads` / `DebriefEnding`, rendered with `renderToStaticMarkup`).
 *
 * The lesson: two informants stand in the same room and hear the same sentence; one of them
 * has been turned, and the copy that reaches the player is not the copy she heard. The
 * divergence is produced ONLY by shipped physics:
 *
 *   identification  the enemy's own digest names sten - heuristic 4 `origin-vague`
 *                   (`src/sim/enemy/digest.ts`): otto hears a damaging, juicy story about
 *                   himself, `reactToSelfRumor` opens an inquiry, otto asks sten in the
 *                   afternoon square, sten's `vaguener` trait dissolves the source into
 *                   `someone`, and the town guard gale - an enemy observer - carries the
 *                   answer to the spymaster, who writes the sketch feature on his night pass.
 *   erosion         four lawful compelled debriefs (`applyDebrief`) at the posted safehouse
 *                   beats: -0.1 disposition and +1 strike each, 0.75 -> 0.35, under
 *                   `FLIP_DISPOSITION` (0.4, strict).
 *   latch           `runTurncoatPass` in the nightly phase (`resolveEnvironment`), the night
 *                   after the digest wrote the sketch feature.
 *   doctoring       `projectReportedObservation` (`src/sim/directives/field-reports.ts`):
 *                   `candorFor(turned = true, scrutiny < 0.35, traits)` -> `'doctored'`, which
 *                   admits the `minimizer` trait and runs the turncoat rewrite of the copy.
 *
 * DECLARED INPUTS (route-preparation addendum option 2 - a deterministic NON-OUTCOME starting
 * context; every observation, receipt, report version, flip and terminal status below is
 * produced by the mechanics):
 *   - the five-NPC town fixture, its schedules, traits and trust edges, declared in `TOWN`;
 *   - the avatar attached through the shipped `worldFromTown` + `attachPlayer` path;
 *   - a `canary-lesson` scenario whose win condition is never approached (the two stories are
 *     about `otto` and `gale`, never about the usurper), so the campaign runs out its clock;
 *   - the fixed seed and the action log.
 * Nothing is injected: no belief, observation, receipt, sketch feature, `turned` flag, report
 * version or terminal state is written by this test. The existing helper-only probe
 * `tests/network/canary-turncoat.e2e.test.ts` is untouched; this is the terminal lesson.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { at } from '../../src/core/time';
import { resolveSlot, UI_GLYPHS } from '../../app/src/assets';
import { DebriefEnding } from '../../app/src/panels/DebriefEnding';
import { DebriefThreads, type DebriefArt } from '../../app/src/panels/DebriefThreads';
import { STANDARD_RULES as RULES } from '../../src/content/rules';
import { type Action, runLogOn } from '../../src/sim/campaign';
import { debriefView } from '../../src/sim/debrief/index';
import { claimNames } from '../../src/sim/fieldwork';
import { hashWorld } from '../../src/sim/hash';
import { FLIP_DISPOSITION } from '../../src/sim/network/turncoats';
import { assetFor, dispositionOf, isTurnedAgainst } from '../../src/sim/network/roster';
import { SOMEONE } from '../../src/sim/rumors/claim';
import { attachPlayer, worldFromTown } from '../../src/world/attach';
import type { GeneratedTown } from '../../src/world/types';
import type { Npc, TownFixture, WorldState } from '../../src/sim/types';

const SEED = 'task8-canary-lesson-001';

const npc = (
  id: string, home: string, occupation: string, schedule: Npc['schedule'],
  traits: string[] = ['literalist'], edges: Npc['edges'] = [],
): Npc => ({ id, name: id, home, occupation, faction: 'none', traits, rivals: [], schedule, edges });

const allDay = (venue: string) => [{ days: 'all' as const, from: 0, to: 1439, venue }];

const FIXTURE: TownFixture = {
  venues: [
    { id: 'square', district: 'd0', access: 'public' },
    { id: 'market', district: 'd0', access: 'public' },
    { id: 'home-mira', district: 'd0', access: 'private' },
  ],
  npcs: [
    // The loyal channel. A plain teller: no trait rewrites her copy.
    npc('mira', 'home-mira', 'grocer', allDay('square')),
    // The canary. `vaguener` is why the enemy can see her at all: it dissolves a named source
    // into `someone`, which is exactly the shape heuristic 4 reads as a planted story's smell.
    npc('sten', 'square', 'grocer', allDay('square'), ['vaguener'],
      [{ to: 'otto', kind: 'friend', trust: 0.5 }]),
    // The subject of the bait: at the market while the square is guard-free, then the square.
    npc('otto', 'market', 'grocer', [
      { days: 'all' as const, from: 0, to: 765, venue: 'market' },
      { days: 'all' as const, from: 765, to: 1439, venue: 'square' },
    ], ['literalist'], [{ to: 'sten', kind: 'friend', trust: 0.9 }]),
    // The enemy's ears on the street: market in the morning, square from 13:00.
    npc('gale', 'market', 'guard', [
      { days: 'all' as const, from: 0, to: 780, venue: 'market' },
      { days: 'all' as const, from: 780, to: 1439, venue: 'square' },
    ]),
    npc('boss', 'market', 'clerk', allDay('market')),
  ],
};

const TOWN: GeneratedTown = {
  fixture: FIXTURE,
  districts: [{
    id: 'd0', venueIds: FIXTURE.venues.map((venue) => venue.id),
    npcIds: FIXTURE.npcs.map((person) => person.id),
  }],
  keystones: [],
  guards: [{ id: 'gale', vigilance: 1 }],
  secrets: [],
  dossier: { informants: ['mira', 'sten'], traitReads: [], edgeReads: [], secretHint: null },
  stationDeal: 'noble',
  enemyNet: { spymaster: 'boss', assets: [] },
};

/** The declared non-outcome starting context: the shipped staging path plus a running scenario. */
function stage(): WorldState {
  const world = worldFromTown(TOWN, SEED, RULES);
  attachPlayer(world, TOWN, 'noble');
  world.scenario = {
    defId: 'canary-lesson', days: 7, win: { kind: 'council-turns', quorum: 2 },
    cast: { usurper: 'boss', council: ['mira', 'otto'] }, status: 'running', resolution: null,
  };
  return world;
}

/** Damaging AND juicy (`stole`, juiciness 0.8 >= 0.6) - the only shape the digest suspects. */
const BAIT = {
  subject: 'otto', predicate: 'stole', object: null, count: 2,
  severity: 3 as const, place: null, attribution: SOMEONE,
};
/** The canary sentence: the numbers the minimizer will halve and step down. */
const CANARY = {
  subject: 'gale', predicate: 'poisoned', object: null, count: 8,
  severity: 5 as const, place: null, attribution: SOMEONE,
};

/** Day 0 - the guard-free square; both informants posted to the safehouse. */
const OPENING: Action[] = [
  { tick: 0, kind: 'goTo', venue: 'square' },
  { tick: at(0, 8), kind: 'tell', to: 'sten', spec: BAIT },
  { tick: at(0, 8, 15), kind: 'assignInformant', informant: 'mira', venue: 'safehouse' },
  { tick: at(0, 8, 30), kind: 'assignInformant', informant: 'sten', venue: 'safehouse' },
];
/** The bait that opens otto's self-inquiry, spoken at the last beat before the guard arrives. */
const BAIT_TO_OTTO: Action[] = [{ tick: at(0, 12, 45), kind: 'tell', to: 'otto', spec: BAIT }];
/** The player retires to the safehouse the posting makes his meeting room. */
const WITHDRAW: Action[] = [{ tick: at(0, 12, 50), kind: 'goTo', venue: 'safehouse' }];
/**
 * Day 1 - four lawful compelled debriefs at the posted safehouse beats (0.75 -> 0.35).
 * The posting override is written DURING the first due tick 2400, after that tick's frame
 * freeze, so the first usable conversation beat is 2415 = day 1 * 16:15.
 */
const EROSION: Action[] = [
  { tick: at(1, 16, 15), kind: 'debrief', asset: 'sten' },
  { tick: at(1, 16, 30), kind: 'debrief', asset: 'sten' },
  { tick: at(1, 16, 45), kind: 'debrief', asset: 'sten' },
  { tick: at(1, 17), kind: 'debrief', asset: 'sten' },
];
/**
 * Day 5 - the canary itself, at a posted safehouse beat with both channels in the room.
 * Day 5 and not day 2: the four `authority-pressure` scrutiny traces of day 1 decay over four
 * days, and while they are still warm `candorFor` returns `'guarded'`/`'omissive'`, which drops
 * items rather than rewriting them. The doctored copy needs a calm canary.
 */
const CANARY_BEAT: Action[] = [{ tick: at(5, 16), kind: 'tell', to: 'mira', spec: CANARY }];

const LOG: Action[] = [...OPENING, ...BAIT_TO_OTTO, ...WITHDRAW, ...EROSION, ...CANARY_BEAT];
/** The control: identical play with the four compelled debriefs withheld - nothing else changes. */
const CONTROL_LOG: Action[] = [...OPENING, ...BAIT_TO_OTTO, ...WITHDRAW, ...CANARY_BEAT];

/** A whole day past the scenario's last night, to show the loop halts on its own. */
const UNTIL = at(8, 0);
const run = (log: Action[] = LOG): WorldState => runLogOn(stage(), RULES, log, UNTIL);

const ART: DebriefArt = {
  paper: resolveSlot('texture.paper.debrief'),
  icons: {
    letter: { resolved: resolveSlot('icon.ui.letter'), fallback: UI_GLYPHS.letter! },
    'forgery-quill': {
      resolved: resolveSlot('icon.ui.forgery-quill'), fallback: UI_GLYPHS['forgery-quill']!,
    },
    scrying: { resolved: resolveSlot('icon.ui.scrying'), fallback: UI_GLYPHS.scrying! },
    seance: { resolved: resolveSlot('icon.ui.seance'), fallback: UI_GLYPHS.seance! },
  },
};

interface Copy {
  /** The mind the report is rooted in: the observer, read off the private root fingerprint. */
  root: string;
  speaker: string;
  tick: number;
  overheard: boolean;
  observedAt: number;
  claimId: string;
  count: number | null;
  severity: number;
}
/** Every canary copy the player was actually told, keyed by the mind it is rooted in. */
function canaryCopies(world: WorldState): Copy[] {
  const rows: Copy[] = [];
  for (const record of world.chronicle) {
    if (record.kind !== 'network-speech' || record.addressedTo !== world.playerId) continue;
    if (record.spoken.kind !== 'field-report' || record.reportRoots === undefined) continue;
    record.spoken.items.forEach((entry, index) => {
      const seen = entry.observation;
      if (seen.kind !== 'utterance' || seen.reported.predicate !== CANARY.predicate) return;
      rows.push({
        root: JSON.parse(record.reportRoots![index]!)[1] as string,
        speaker: record.speaker, tick: record.tick, overheard: seen.overheard,
        observedAt: seen.observedAt, claimId: seen.claimId,
        count: seen.reported.count, severity: seen.reported.severity,
      });
    });
  }
  return rows;
}

/** The two first-hand copies of the canary beat: each informant's own account of what she heard. */
const firstHand = (world: WorldState): Copy[] =>
  canaryCopies(world).filter((copy) => copy.root === copy.speaker && copy.observedAt === at(5, 16));

let memo: WorldState | null = null;
const lesson = (): WorldState => (memo ??= run());

describe('the terminal canary lesson: one sentence, two channels, one doctored copy', () => {
  it('the enemy names the canary from its own digest, and four lawful debriefs turn her', () => {
    const world = lesson();

    // The identification is the enemy's, through a lawful vehicle: otto's self-inquiry, sten's
    // vague answer under the guard's eye, and the spymaster's own nightly digest.
    const answer = world.chronicle.find((record) => record.kind === 'telling'
      && record.speaker === 'sten' && record.mode === 'answer');
    expect(answer).toBeDefined();
    const origin = world.enemy.sketch.find((feature) => feature.kind === 'origin-vague');
    expect(origin?.subject).toBe('sten');
    expect(origin!.day).toBeLessThanOrEqual(1);
    expect(world.enemy.sketch.some((feature) => feature.subject === 'mira')).toBe(false);

    // The erosion is four lawful compelled debriefs and nothing else: 0.75 - 4 * 0.1.
    expect(assetFor(world, 'player', 'sten')!.strikes).toBe(4);
    expect(dispositionOf(world, 'sten')).toBeCloseTo(0.35, 10);
    expect(dispositionOf(world, 'sten')).toBeLessThan(FLIP_DISPOSITION);

    // The latch is `runTurncoatPass`, and it takes only the asset the enemy could name.
    expect(isTurnedAgainst(world, 'player', 'sten')).toBe(true);
    expect(isTurnedAgainst(world, 'player', 'mira')).toBe(false);
    expect(dispositionOf(world, 'mira')).toBeGreaterThan(FLIP_DISPOSITION);
  });

  it('the clock ends the campaign on its own and the loop halts there', () => {
    const world = lesson();
    expect(world.scenario!.status).toBe('lost-clock');
    expect(world.scenario!.resolution).toMatchObject({ kind: 'lost-clock', day: 6 });
    expect(world.chronicle.some((record) => record.kind === 'institution'
      && record.action === 'coronation')).toBe(true);
    // The log asked for day 8; the campaign stopped itself at the end of its seventh day.
    expect(world.tick).toBe(at(7, 0));
    expect(world.tick).toBeLessThan(UNTIL);
    // The debrief model is terminal-only, so its existence is itself the halt.
    expect(debriefView(world)).not.toBeNull();
  });

  it('one sentence, two channels: the loyal copy survives and the turned copy is doctored', () => {
    const world = lesson();
    const copies = firstHand(world);
    expect(copies.map((copy) => copy.root).sort()).toEqual(['mira', 'sten']);
    const loyal = copies.find((copy) => copy.root === 'mira')!;
    const turned = copies.find((copy) => copy.root === 'sten')!;

    // Both stood in the same room at the same beat and are reporting the same utterance of the
    // same claim: mira was addressed, sten overheard it. Nothing about the event differs.
    expect(turned.claimId).toBe(loyal.claimId);
    expect(loyal.observedAt).toBe(at(5, 16));
    expect(turned.observedAt).toBe(at(5, 16));
    expect(loyal.overheard).toBe(false);
    expect(turned.overheard).toBe(true);
    expect(turned.tick).toBe(loyal.tick);

    // The loyal channel hands over what was actually said; the world's claim agrees with her.
    expect({ count: loyal.count, severity: loyal.severity }).toEqual({ count: 8, severity: 5 });
    expect(world.claims[loyal.claimId]!.count).toBe(8);
    expect(world.claims[loyal.claimId]!.severity).toBe(5);
    // The turned channel hands over the minimizer's version of that same sentence.
    expect({ count: turned.count, severity: turned.severity }).toEqual({ count: 4, severity: 4 });

    // The player is never told which mouth was doctored: no spoken copy carries the flag.
    for (const record of world.chronicle) {
      if (record.kind !== 'network-speech' || record.addressedTo !== world.playerId) continue;
      expect(JSON.stringify(record.spoken)).not.toContain('turned');
    }
  });

  it('the installed model and UI show the divergence and name the responsible mind', () => {
    const world = lesson();
    const view = debriefView(world)!;
    const claimId = firstHand(world)[0]!.claimId;

    // The debrief keys each report item by its ROOT: the mind that made the observation, and the
    // observation as that mind actually took it in. Both roots hold the true 8/5 sentence.
    const rootOf = (mind: string): string => {
      const row = view.operations.reportItems.find((item) => item.rootFingerprint
        .startsWith(`["root","${mind}",`) && item.rootFingerprint.includes(`"id":"${claimId}"`)
        && item.rootFingerprint.includes('"addressedTo":"mira"'));
      expect(row, `no report-item root for ${mind}`).toBeDefined();
      return row!.rootFingerprint;
    };
    const loyalRoot = rootOf('mira');
    const turnedRoot = rootOf('sten');
    for (const root of [loyalRoot, turnedRoot]) {
      expect(root).toContain('"count":8');
      expect(root).toContain('"severity":5');
    }
    expect(loyalRoot).toContain('"overheard":false');
    expect(turnedRoot).toContain('"overheard":true');

    const names = claimNames(world);
    const threads = renderToStaticMarkup(<DebriefThreads view={view} names={names} art={ART} />);
    const escape = (raw: string): string => raw.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    /** The rendered report-item card for one root, headed by that root's fingerprint. */
    const card = (root: string): string => {
      const start = threads.indexOf(`<h4>${escape(root)}</h4>`);
      expect(start, 'the root fingerprint is not rendered').toBeGreaterThanOrEqual(0);
      const next = threads.indexOf('<h4>', start + 4);
      return threads.slice(start, next < 0 ? threads.length : next);
    };
    /** One rendered delivery within a card: the stage this speaker spoke at the canary beat. */
    const delivery = (root: string, speaker: string, clock: string): string => {
      const body = card(root);
      const start = body.indexOf(`day 5 · ${clock} · ${speaker} → you`);
      expect(start, `no rendered ${clock} delivery by ${speaker}`).toBeGreaterThanOrEqual(0);
      return body.slice(start, body.indexOf('</li>', start));
    };

    // The responsible mind is on the card, and the card's own heading preserves what she heard.
    expect(card(turnedRoot)).toContain(escape('["root","sten"'));
    expect(card(turnedRoot)).toContain(escape('"count":8'));
    // The copy the player actually received from her reads as the minimized version.
    const doctored = delivery(turnedRoot, 'sten', '16:15');
    expect(doctored).toContain('This item was spoken.');
    expect(doctored).toContain('gale poisoned someone; the count given is 4');
    expect(doctored).toContain('<td>4</td>');
    expect(doctored).not.toContain('the count given is 8');
    // The loyal channel's own delivery of the same sentence reads at full strength.
    const faithful = delivery(loyalRoot, 'mira', '16:15');
    expect(faithful).toContain('gale poisoned someone; the count given is 8');
    expect(faithful).toContain('<td>8</td>');
    expect(faithful).toContain('<td>5</td>');
    // And the sting: mira's later relay of what SHE heard from sten carries the doctored
    // numbers onward. A faithful mouth repeating a doctored copy is still a doctored copy.
    expect(delivery(turnedRoot, 'mira', '16:30'))
      .toContain('gale poisoned someone; the count given is 4');

    // The ending card renders the real terminal status, and calls it consistent because the
    // retained history holds the matching `coronation` institution row.
    expect(view.ending).toMatchObject({ status: 'lost-clock', resolutionState: 'consistent' });
    const ending = renderToStaticMarkup(<DebriefEnding view={view} names={names} art={ART} />);
    expect(ending).toContain('ending-clock');
    expect(ending).toContain('Coronation');
    expect(ending).toContain('The clock ran out; the crown landed.');
  });

  it('control: identified but never squeezed, the same canary reports faithfully', () => {
    const world = run(CONTROL_LOG);
    // The enemy still names her - being seen is not what breaks a source.
    expect(world.enemy.sketch.some((feature) => feature.kind === 'origin-vague'
      && feature.subject === 'sten')).toBe(true);
    // But with the four compelled debriefs withheld, her disposition never leaves its floor.
    expect(assetFor(world, 'player', 'sten')!.strikes).toBe(0);
    expect(dispositionOf(world, 'sten')).toBeCloseTo(0.75, 10);
    expect(dispositionOf(world, 'sten')).toBeGreaterThan(FLIP_DISPOSITION);
    expect(isTurnedAgainst(world, 'player', 'sten')).toBe(false);
    // So the same campaign, the same beat and the same sentence come back intact from both.
    const copies = firstHand(world);
    expect(copies.map((copy) => copy.root).sort()).toEqual(['mira', 'sten']);
    for (const copy of copies) {
      expect({ count: copy.count, severity: copy.severity }).toEqual({ count: 8, severity: 5 });
    }
    expect(world.scenario!.status).toBe('lost-clock');
  });

  it('the same seed and the same log rebuild the same terminal world', () => {
    const live = hashWorld(lesson());
    expect(hashWorld(run())).toBe(live);
    // Replaying past the halt changes nothing: the terminal world is a fixed point.
    expect(hashWorld(runLogOn(stage(), RULES, LOG, at(20, 0)))).toBe(live);
  });
});
