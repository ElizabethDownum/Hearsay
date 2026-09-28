import { describe, expect, it, vi } from 'vitest';
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
});
