import { describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { DayPlanner, type DayPlannerProps } from '../../app/src/panels/DayPlanner';
import type { LocalActionIntent, LocalOffer, NonLocalActionIntent } from '../../app/src/loop/session';
import { newSession } from '../../app/src/loop/session';
import { STANDARD_RULES } from '../../src/content/rules';
import { TERMS } from '../../src/content/terms';
import { playerView, networkView } from '../../src/sim/fieldwork';
import { boardView } from '../../src/intel/board';

// Plan 10 Task 1A/1B. A server render shows a composer's button but cannot press it, so the
// submitted intent (the verb's kind and the payload it builds) would go unpinned. This file calls
// the planner's composers as plain functions under a pass-through `useState` (the debrief-ui
// idiom), walks their element trees to the real buttons and invokes their real `onClick`.
const hooks = vi.hoisted(() => ({ active: false }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const useState = ((initial: unknown) => {
    if (!hooks.active) return actual.useState(initial);
    const value = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    return [value, () => { /* no re-render outside React */ }];
  }) as typeof actual.useState;
  return { ...actual, useState };
});

type Props = { children?: ReactNode; 'aria-label'?: string; onClick?: () => void };
function elements(node: ReactNode): ReactElement<Props>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<Props>(child) ? [child, ...elements(child.props.children)] : []);
}
const expand = (node: ReactElement<Props>): ReactNode => {
  hooks.active = true;
  try { return (node.type as (p: Props) => ReactNode)(node.props); } finally { hooks.active = false; }
};

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
});
