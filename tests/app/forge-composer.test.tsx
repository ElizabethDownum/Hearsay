import { describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { DayPlanner, type DayPlannerProps } from '../../app/src/panels/DayPlanner';
import type { LocalActionIntent, LocalOffer, NonLocalActionIntent } from '../../app/src/loop/session';
import { newSession } from '../../app/src/loop/session';
import { at } from '../../src/core/time';
import { STANDARD_RULES } from '../../src/content/rules';
import { TERMS } from '../../src/content/terms';
import { playerView, networkView } from '../../src/sim/fieldwork';
import { boardView } from '../../src/intel/board';

// Plan 10 Task 1A/1B/1C. A server render shows a composer's button but cannot press it, so the
// submitted intent (the verb's kind and the payload it builds) would go unpinned. This file calls
// the planner's composers as plain functions under a substitute `useState` (the debrief-ui idiom),
// walks their element trees to the real controls and invokes their real `onChange` and `onClick`.
// The substitute WORKS (T1A review I1): each `instance` owns its hook slots in call order, a
// setter writes its slot, and the next render of that instance reads what was set, so a test can
// edit a field, re-render, and press — pinning that what stands in the form is what is submitted.
const hooks = vi.hoisted(() => ({ active: false, slots: [] as unknown[], cursor: 0 }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const useState = ((initial: unknown) => {
    if (!hooks.active) return actual.useState(initial);
    const slots = hooks.slots;   // this instance's slots: a setter keeps writing here, whatever renders later
    const slot = hooks.cursor++;
    if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    const set = (next: unknown) => {
      slots[slot] = typeof next === 'function' ? (next as (prev: unknown) => unknown)(slots[slot]) : next;
    };
    return [slots[slot], set];
  }) as typeof actual.useState;
  return { ...actual, useState };
});

type Props = {
  children?: ReactNode; 'aria-label'?: string; value?: unknown;
  onClick?: () => void; onChange?: (event: { target: { value: string } }) => void;
};
function elements(node: ReactNode): ReactElement<Props>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : []);
}
/** One mounted component: call it to render; its hook state persists between calls. */
function instance(node: ReactElement<Props>): () => ReactNode {
  const slots: unknown[] = [];
  return () => {
    hooks.slots = slots; hooks.cursor = 0; hooks.active = true;
    try { return (node.type as (p: Props) => ReactNode)(node.props); } finally { hooks.active = false; }
  };
}
const expand = (node: ReactElement<Props>): ReactNode => instance(node)();
const change = (tree: ReactNode, label: string, value: string): void => {
  const control = labelled(tree, label);
  expect(control, `a control labelled ${label}`).toBeDefined();
  control!.props.onChange!({ target: { value } });
};
const press = (tree: ReactNode, label: string): void => {
  const button = labelled(tree, label);
  expect(button, `a button labelled ${label}`).toBeDefined();
  button!.props.onClick!();
};
const optionValues = (tree: ReactNode, label: string): string[] =>
  elements(labelled(tree, label)!.props.children).filter((node) => node.type === 'option').map((node) => String(node.props.value));

function fixture() {
  const { world } = newSession('forge-composer');
  const submitted: NonLocalActionIntent[] = [];
  const chosen: LocalActionIntent[] = [];
  const props: DayPlannerProps = {
    paused: true, coin: 200, economy: STANDARD_RULES.economy, localPending: false, offer: null,
    view: playerView(world), net: networkView(world), board: boardView(world.intel.log, 1, STANDARD_RULES),
    onVerb: (intent) => submitted.push(intent), onRequestLocal: () => {}, onCancelLocal: () => {},
    onLocal: (intent) => chosen.push(intent),
  };
  return { submitted, chosen, props };
}

const named = (tree: ReactNode, name: string) =>
  elements(tree).find((node) => typeof node.type === 'function' && node.type.name === name);
const labelled = (tree: ReactNode, label: string) =>
  elements(tree).find((node) => node.props['aria-label'] === label);

describe('DayPlanner — the forge button submits a forge verb (Plan 10 Task 1A)', () => {
  it('pressing submit forge sends { kind: forge } with the blank claim the fields start from', () => {
    const { submitted, props } = fixture();
    const composer = elements(DayPlanner(props)).find((node) => typeof node.type === 'function' && node.type.name === 'ForgeComposer');
    expect(composer, 'a ForgeComposer element in the planner tree').toBeDefined();
    const button = elements(expand(composer!)).find((node) => node.props['aria-label'] === 'submit forge');
    expect(button, 'the submit forge button').toBeDefined();
    button!.props.onClick!();
    const firstPredicate = Object.keys(TERMS).filter((key) => key.startsWith('predicate-'))
      .map((key) => key.slice('predicate-'.length)).sort((a, b) => a.localeCompare(b))[0];
    expect(submitted).toEqual([{ kind: 'forge', spec: {
      subject: 'someone', predicate: firstPredicate, object: null, count: null, severity: 3, place: null, attribution: 'someone',
    } }]);
  });

  // T1A review I1: edit every field one at a time through its real handler (each edit must keep
  // the earlier ones), see the form show what was set, press, and get exactly that claim.
  it('editing all seven fields one at a time, then pressing, submits exactly what stands in the form', () => {
    const { submitted, props } = fixture();
    const render = instance(named(DayPlanner(props), 'ForgeComposer')!);
    let tree = render();
    const fields = () => expand(named(tree, 'ClaimFields')!);
    const choice = (label: string, index: number) => optionValues(fields(), label)[index]!;
    const edits: [string, string][] = [
      ['subject', choice('forge subject', 1)], ['predicate', choice('forge predicate', 2)],
      ['object', choice('forge object', 3)], ['count', '2'], ['severity', '5'],
      ['place', choice('forge place', 1)], ['attribution', choice('forge attribution', 4)],
    ];
    for (const [field, value] of edits) {
      change(fields(), `forge ${field}`, value);
      tree = render();
      expect(labelled(fields(), `forge ${field}`)!.props.value, `${field} shows what was set`).toBe(value);
    }
    const want = Object.fromEntries(edits);
    expect(want.subject).not.toBe('someone');
    press(tree, 'submit forge');
    expect(submitted).toEqual([{ kind: 'forge', spec: {
      subject: want.subject, predicate: want.predicate, object: want.object, count: 2, severity: 5,
      place: want.place, attribution: want.attribution,
    } }]);
  });

  // The claim fields are shared with the tell composer, so one edited tell case pins the sharing.
  it('the tell composer submits its edited claim to the chosen addressee', () => {
    const { chosen, props } = fixture();
    const offer: LocalOffer = { tick: 0, venue: props.view.avatar.venue!, circleMembers: ['adela', 'aldous'], token: 't#0' };
    const moment = named(DayPlanner({ ...props, offer, localPending: true }), 'LocalMoment')!;
    const render = instance(named(expand(moment), 'TellComposer')!);
    let tree = render();
    const subject = optionValues(expand(named(tree, 'ClaimFields')!), 'tell subject')[2]!;
    change(expand(named(tree, 'ClaimFields')!), 'tell subject', subject);
    tree = render();
    change(expand(named(tree, 'ClaimFields')!), 'tell count', '3');
    tree = render();
    change(tree, 'tell addressee', 'aldous');
    tree = render();
    press(tree, 'submit tell');
    const firstPredicate = Object.keys(TERMS).filter((key) => key.startsWith('predicate-'))
      .map((key) => key.slice('predicate-'.length)).sort((a, b) => a.localeCompare(b))[0];
    expect(chosen).toEqual([{ kind: 'tell', to: 'aldous', spec: {
      subject, predicate: firstPredicate, object: null, count: 3, severity: 3, place: null, attribution: 'someone',
    } }]);
  });
});

describe('DayPlanner — the paper buttons submit show and plant (Plan 10 Task 1B)', () => {
  it('pressing submit show / submit plant sends the picked paper, the first circle-mate, and "here" for a plant', () => {
    const { chosen, props } = fixture();
    const spec = { subject: 'ada', predicate: 'stole', object: null, count: 2, severity: 4 as const,
      place: null, attribution: 'someone' };
    const offer: LocalOffer = { tick: 1440, venue: props.view.avatar.venue!, circleMembers: ['ada', 'bez'], token: 't#1' };
    // Two papers held, so a button that sent any paper but the PICKED one (the first, by default)
    // is told apart from the right one.
    const view = { ...props.view, tick: 1440, documents: [
      { id: 'a0', spec, forgedTick: 0, usableFromDay: 1 },
      { id: 'a1', spec: { ...spec, severity: 1 as const }, forgedTick: 0, usableFromDay: 1 },
    ] };
    const planner = DayPlanner({ ...props, view, offer, localPending: true });
    const moment = named(planner, 'LocalMoment');
    expect(moment, 'a LocalMoment element in the planner tree').toBeDefined();
    const paper = named(expand(moment!), 'PaperComposer');
    expect(paper, 'a PaperComposer element in the moment').toBeDefined();
    const tree = expand(paper!);
    labelled(tree, 'submit show')!.props.onClick!();
    labelled(tree, 'submit plant')!.props.onClick!();
    expect(chosen).toEqual([
      { kind: 'show', artifact: 'a0', to: 'ada' },
      { kind: 'plant', artifact: 'a0', venue: offer.venue, to: null },
    ]);
  });

  it('picking the second paper, another audience and a circle-mate as target sends those', () => {
    const { chosen, props } = fixture();
    const spec = { subject: 'ada', predicate: 'stole', object: null, count: 2, severity: 4 as const,
      place: null, attribution: 'someone' };
    const offer: LocalOffer = { tick: 1440, venue: props.view.avatar.venue!, circleMembers: ['ada', 'bez'], token: 't#1' };
    const view = { ...props.view, tick: 1440, documents: [
      { id: 'a0', spec, forgedTick: 0, usableFromDay: 1 },
      { id: 'a1', spec: { ...spec, severity: 1 as const }, forgedTick: 0, usableFromDay: 1 },
    ] };
    const moment = named(DayPlanner({ ...props, view, offer, localPending: true }), 'LocalMoment')!;
    const render = instance(named(expand(moment), 'PaperComposer')!);
    let tree = render();
    change(tree, 'paper document', 'a1'); tree = render();
    change(tree, 'show audience', 'bez'); tree = render();
    change(tree, 'plant target', 'ada'); tree = render();
    expect(labelled(tree, 'paper document')!.props.value).toBe('a1');
    press(tree, 'submit show');
    press(tree, 'submit plant');
    expect(chosen).toEqual([
      { kind: 'show', artifact: 'a1', to: 'bez' },
      { kind: 'plant', artifact: 'a1', venue: null, to: 'ada' },
    ]);
  });
});

describe('DayPlanner — the scry button submits a scry verb (Plan 10 Task 1C)', () => {
  it('pressing submit scry sends tomorrow, the first venue, and the first hour of the day', () => {
    const { submitted, props } = fixture();
    const view = { ...props.view, tick: at(2, 9, 30) };
    const composer = named(DayPlanner({ ...props, view }), 'ScryComposer');
    expect(composer, 'a ScryComposer element in the planner tree').toBeDefined();
    labelled(expand(composer!), 'submit scry')!.props.onClick!();
    const venue = props.view.map.venues.map((row) => row.id).sort((a, b) => a.localeCompare(b))[0];
    expect(submitted).toEqual([{ kind: 'scry', venue, day: 3, from: 0, to: 60 }]);
  });

  it('picking another venue, a half hour from 10:00, sends that window; a start the new length cannot hold falls back to 00:00', () => {
    const { submitted, props } = fixture();
    const view = { ...props.view, tick: at(2, 9, 30) };
    const render = instance(named(DayPlanner({ ...props, view }), 'ScryComposer')!);
    let tree = render();
    const venues = optionValues(tree, 'scry venue');
    change(tree, 'scry venue', venues[1]!); tree = render();
    change(tree, 'scry length', '30'); tree = render();
    expect(optionValues(tree, 'scry start')).toHaveLength(95);        // 00:00..23:30 at a half hour
    change(tree, 'scry start', '600'); tree = render();
    expect(labelled(tree, 'scry start')!.props.value).toBe('600');
    press(tree, 'submit scry');
    // The last quarter-hour start is only offered at a quarter-hour length; lengthening the window
    // afterwards drops the start back to the first of the day rather than submitting past midnight.
    change(tree, 'scry length', '15'); tree = render();
    change(tree, 'scry start', '1425'); tree = render();
    change(tree, 'scry length', '60'); tree = render();
    expect(labelled(tree, 'scry start')!.props.value).toBe('0');
    press(tree, 'submit scry');
    expect(submitted).toEqual([
      { kind: 'scry', venue: venues[1], day: 3, from: 600, to: 630 },
      { kind: 'scry', venue: venues[1], day: 3, from: 0, to: 60 },
    ]);
  });
});
