import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '../../app/src/loop/session';
import type { EveningReport as Report } from '../../src/intel/report';
import { eveningReport } from '../../src/intel/report';
import { learnedAtByEntry } from '../../src/sim/debrief/knowledge';
import { blankIntel } from '../../src/sim/fieldwork';
import { dayOf } from '../../src/core/time';

/**
 * R47-1 (R47 review M3): the composition root itself, not a regex over its source. The report panel
 * is replaced by a prop-capturing stub, the session factory by a wrapper that seeds a day-0
 * observation an informant hands over on day 1, and the panel state is started on `report`, so the
 * test reads exactly the report `App` composes from exactly the world `App` owns.
 */
const probe = vi.hoisted(() => ({ report: null as Report | null, session: null as Session | null }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useState: (init: unknown) => actual.useState(init === 'planner' ? 'report' : init) };
});
vi.mock('../../app/src/panels/EveningReport', () => ({
  EveningReport: (props: { report: Report }) => { probe.report = props.report; return null; },
}));
vi.mock('../../app/src/loop/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/src/loop/session')>();
  return { ...actual, newSession: (seed: string) => {
    const session = actual.newSession(seed);
    const w = session.world;
    w.intel.log.push({ ...blankIntel(), tick: 0, venue: 'square', via: 'ada', kind: 'asking', overheard: false,
      speaker: 'bez', addressedTo: 'ada', authority: true, about: { subject: 'ada' } });
    w.chronicle.push({ kind: 'network-speech', tick: 1500, venue: 'backroom', speaker: 'ada', addressedTo: w.playerId!,
      messageId: 'm0', cause: null, heardBy: [{ id: w.playerId!, addressed: true }], spoken: {
        kind: 'field-report', onwardTo: null, items: [{ factRefs: [], observation: {
          kind: 'asking', observedAt: 0, venue: 'square', speaker: 'bez', addressedTo: 'ada',
          overheard: false, authority: true, about: { subject: 'ada' } } }] } } as never);
    probe.session = session;
    return session;
  } };
});
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: () => undefined }) }));
vi.stubGlobal('document', { getElementById: () => ({}) });

describe('App hands the evening report the lawful acquisition clock (R47-1)', () => {
  it('the rendered report is the fold over the log, the current day and learnedAtByEntry(world)', async () => {
    const { App } = await import('../../app/src/main');
    renderToStaticMarkup(createElement(App));
    const world = probe.session!.world;
    const last = world.intel.log.length - 1;
    expect(learnedAtByEntry(world)[last]).toBe(1500);                 // the seeded receipt is dated by the debrief clock
    expect(probe.report!.day).toBe(dayOf(world.tick));                // today, the day the panel is open on
    expect(probe.report).toEqual(eveningReport(world.intel.log, probe.report!.day, learnedAtByEntry(world)));
    expect(probe.report).not.toEqual(eveningReport(world.intel.log, probe.report!.day));   // the clock changes the answer
  });
});
