import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '../../app/src/loop/session';
import type { DayPlannerProps } from '../../app/src/panels/DayPlanner';

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
