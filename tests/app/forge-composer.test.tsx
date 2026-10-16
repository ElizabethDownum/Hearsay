import { describe, expect, it, vi } from 'vitest';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { DayPlanner, type DayPlannerProps } from '../../app/src/panels/DayPlanner';
import type { NonLocalActionIntent } from '../../app/src/loop/session';
import { newSession } from '../../app/src/loop/session';
import { STANDARD_RULES } from '../../src/content/rules';
import { TERMS } from '../../src/content/terms';
import { playerView, networkView } from '../../src/sim/fieldwork';
import { boardView } from '../../src/intel/board';

// Plan 10 Task 1A. A server render shows the forge button but cannot press it, so the submitted
// intent (the verb's kind and the spec the claim fields build) would go unpinned. This file calls
// the composer as a plain function under a pass-through `useState` (the debrief-ui idiom), walks
// its element tree to the real button and invokes its real `onClick`.
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
  const props: DayPlannerProps = {
    paused: true, coin: 200, economy: STANDARD_RULES.economy, localPending: false, offer: null,
    view: playerView(world), net: networkView(world), board: boardView(world.intel.log, 1, STANDARD_RULES),
    onVerb: (intent) => submitted.push(intent), onRequestLocal: () => {}, onCancelLocal: () => {}, onLocal: () => {},
  };
  return { submitted, props };
}

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
