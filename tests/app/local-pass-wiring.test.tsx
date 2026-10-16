import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '../../app/src/loop/session';
import type { DayPlannerProps } from '../../app/src/panels/DayPlanner';
import { artifactsOf } from '../../src/sim/artifacts';
import { STANDARD_RULES } from '../../src/content/rules';
import { dayOf } from '../../src/core/time';

/**
 * R41-1 (R41 review I-1): the composition root, not just the panel and the session separately. The
 * planner is replaced by a prop-capturing stub and the session factory by a recording wrapper, so the
 * test drives exactly the callbacks `App` hands the planner against exactly the session `App` owns.
 */
const probe = vi.hoisted(() => ({
  props: null as DayPlannerProps | null, session: null as Session | null,
  prime: null as ((session: Session) => void) | null,
}));
vi.mock('../../app/src/panels/DayPlanner', () => ({
  DayPlanner: (props: DayPlannerProps) => { probe.props = props; return null; },
}));
vi.mock('../../app/src/loop/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/src/loop/session')>();
  return { ...actual, newSession: (seed: string) => {
    const session = actual.newSession(seed);
    probe.prime?.(session);
    probe.session = session;
    return session;
  } };
});
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: () => undefined }) }));
vi.stubGlobal('document', { getElementById: () => ({}) });

async function mount(prime: ((session: Session) => void) | null = null) {
  probe.props = null;
  probe.prime = prime;
  const { App } = await import('../../app/src/main');
  renderToStaticMarkup(createElement(App));
  return { session: probe.session!, props: probe.props! };
}

describe('the pass control is wired to the session App owns (R41-1)', () => {
  it('the planner\'s onCancelLocal drops an offered moment and time resumes', async () => {
    const { session, props } = await mount();
    expect(session.requestLocalInteraction().refused).toBe(false);
    expect(session.advance(1).stopped).toBe('local-offer');
    props.onCancelLocal();
    expect(session.localOffer()).toBeNull();
    expect(session.advance(5)).toEqual({ advanced: 5, stopped: 'complete' });
  });

  it('the planner\'s onRequestLocal requests through the same session', async () => {
    const { session, props } = await mount();
    props.onRequestLocal();
    expect(session.localPending()).toBe(true);
    expect(session.advance(1).stopped).toBe('local-offer');
  });

  it('localPending is the session\'s own state, not a shell-side latch', async () => {
    expect((await mount()).props.localPending).toBe(false);
    expect((await mount((session) => { session.requestLocalInteraction(); })).props.localPending).toBe(true);
    const cancelled = await mount((session) => {
      session.requestLocalInteraction();
      session.cancelLocalInteraction();
    });
    expect(cancelled.props.localPending).toBe(false);
  });

  // R41-2 (R41-1 re-check M1): the OFFERED, not-yet-chosen state is the one R41 was about (the empty
  // day-zero safehouse circle). A pending-ness that only counted requests or choices would disable
  // the pass control exactly there and strand the player again.
  it('an offered moment with nothing chosen is pending, so the pass control is enabled', async () => {
    const offered = await mount((session) => {
      session.requestLocalInteraction();
      session.advance(1);
    });
    expect(offered.session.localOffer()).not.toBeNull();
    expect(offered.session.localOffer()!.circleMembers).toEqual([]);
    expect(offered.props.localPending).toBe(true);
    expect(offered.props.offer).not.toBeNull();
  });

  // R41-2 (R41-1 re-check M2): a server render cannot see state set after it, so a re-introduced
  // shell latch OR-ed onto the session's answer would pass every mounted case above. The composition
  // root is therefore also pinned by its text: the planner's pending-ness is the session's call alone.
  it('the composition root passes the session\'s own answer and keeps no latch of its own', () => {
    const src = readFileSync(new URL('../../app/src/main.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/localPending=\{session\.localPending\(\)\}/);
    expect(src).not.toMatch(/localRequested|localPending=\{[^}]*(\|\||&&)/);
  });
});

// Plan 10 Task 1A: the planner's non-local verbs reach the engine through the session App owns. A
// forge submitted through the planner's own `onVerb` is queued for the current tick, fires on the
// next advance, debits the treasury by the economy's price and leaves one held, unplanted document.
describe("the planner's verbs are wired to the session App owns (Plan 10 Task 1A)", () => {
  it("onVerb({ kind: 'forge' }) forges through the session: one artifact, the price debited", async () => {
    const { session, props } = await mount();
    const before = session.world.coin;
    const spec = { subject: 'someone', predicate: 'stole', object: null, count: 2, severity: 4 as const,
      place: null, attribution: 'someone' };
    props.onVerb({ kind: 'forge', spec });
    expect(session.advance(1).advanced).toBe(1);
    const held = artifactsOf(session.world);
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ spec, author: 'player', heldBy: session.world.playerId, plantedAt: null });
    expect(session.world.coin).toBe(before - STANDARD_RULES.economy.forgery);
  });

  // Plan 10 Task 1B: a paper forged on day 0 is planted at the offered venue on a day-1 beat through
  // the planner's own `onLocal`; the beat plays on the next advance and the paper waits there.
  it('onLocal({ kind: \'plant\' }) plants a dry paper where the moment stands, through the session', async () => {
    const { session, props } = await mount();
    const spec = { subject: 'someone', predicate: 'stole', object: null, count: null, severity: 3 as const,
      place: null, attribution: 'someone' };
    props.onVerb({ kind: 'forge', spec });
    while (session.world.tick < 1440) {
      const result = session.advance(1440 - session.world.tick);
      if (result.stopped === 'terminal') throw new Error('campaign ended before day 1');
    }
    expect(artifactsOf(session.world)).toMatchObject([{ id: 'a0', heldBy: session.world.playerId, plantedAt: null }]);
    props.onRequestLocal();
    expect(session.advance(15).stopped).toBe('local-offer');
    const offer = session.localOffer()!;
    props.onLocal({ kind: 'plant', artifact: 'a0', venue: offer.venue, to: null });
    expect(session.advance(1).advanced).toBe(1);
    expect(artifactsOf(session.world)).toMatchObject([{ id: 'a0', heldBy: null, plantedAt: offer.venue }]);
    expect(session.world.chronicle.some((row) => row.kind === 'artifact' && row.act === 'plant' && row.tick === offer.tick)).toBe(true);
  });

  // Plan 10 Task 1C: a scry submitted through the planner's own `onVerb` buys tomorrow's window at
  // the chosen venue: one operation recorded, the price debited, the purchase in the chronicle.
  it("onVerb({ kind: 'scry' }) buys tomorrow's window through the session: one operation, the price debited", async () => {
    const { session, props } = await mount();
    const before = session.world.coin;
    const venue = Object.keys(session.world.venues).sort()[0]!;
    const day = dayOf(session.world.tick) + 1;
    props.onVerb({ kind: 'scry', venue, day, from: 600, to: 660 });
    expect(session.advance(1).advanced).toBe(1);
    expect(session.world.magic?.scries).toEqual([{ id: 's0', venue, day, from: 600, to: 660 }]);
    expect(session.world.coin).toBe(before - STANDARD_RULES.economy.scrying);
    expect(session.world.chronicle.some((row) => row.kind === 'scry' && row.operation === 's0' && row.venue === venue)).toBe(true);
  });
});
