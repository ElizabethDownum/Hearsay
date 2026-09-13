import { describe, expect, it } from 'vitest';
import { renderClaim, type ClaimText } from '../../src/content/render';
import { PREDICATES } from '../../src/content/predicates';

const BASE: ClaimText = {
  subject: 'actor-id', predicate: 'poisoned', object: 'object-id', count: 0,
  severity: 4, place: 'place-id', attribution: 'source-id',
};
const names: Record<string, string> = {
  'actor-id': 'Adelaide', 'object-id': 'Benedict', 'place-id': 'the old quay',
  'source-id': 'Cecily',
};
const nameOf = (id: string): string => {
  if (id === 'someone') throw new Error('the vague sentinel must not enter a name lookup');
  return names[id] ?? id;
};

describe('period claim prose follows the finite registry and received fields', () => {
  for (const predicate of Object.keys(PREDICATES)) {
    it('renders ' + predicate + ' with all named fields and a meaningful zero count', () => {
      const text = renderClaim({ ...BASE, predicate }, nameOf);
      for (const label of Object.values(names)) expect(text).toContain(label);
      for (const id of Object.keys(names)) expect(text).not.toContain(id);
      if (predicate.includes('-')) expect(text).not.toContain(predicate);
      expect(text).not.toContain('unfamiliar tale');
      expect(text).toContain('count given is 0');
      expect(text).toMatch(/\.$/);
      expect(text).not.toMatch(/undefined|null|NaN/);
    });
  }

  it('does not manufacture the optional place, object or count', () => {
    const text = renderClaim({ ...BASE, predicate: 'is-bankrupt', object: null, count: null, place: null }, nameOf);
    expect(text).toContain('Adelaide has fallen into bankruptcy');
    expect(text).not.toContain('Benedict');
    expect(text).not.toContain('place named');
    expect(text).not.toContain('count given');
    expect(text).toContain('Cecily swears it');
  });

  it('keeps unnamed people and an unnamed source visibly vague', () => {
    const text = renderClaim({ ...BASE, subject: 'someone', object: 'someone', attribution: 'someone' }, nameOf);
    expect(text).toContain('someone poisoned someone');
    expect(text).toContain('source is unnamed');
    expect(text).not.toContain('swears it');
  });

  it('inflects all five severities without changing the allegation or source', () => {
    const texts = ([1, 2, 3, 4, 5] as const).map((severity) => renderClaim({ ...BASE, severity }, nameOf));
    expect(new Set(texts).size).toBe(5);
    for (const text of texts) {
      expect(text).toContain('Adelaide poisoned Benedict');
      expect(text).toContain('Cecily swears it');
    }
  });

  it('uses each supplied name lookup, including a changed spoken source', () => {
    const revised = renderClaim({ ...BASE, attribution: 'object-id' }, nameOf);
    expect(revised).toContain('Benedict swears it');
    expect(revised).not.toContain('Cecily');
  });

  it('renders contradictory supplied place and count explicitly without repairing the claim', () => {
    const text = renderClaim({ ...BASE, predicate: 'met-at-the-docks-by-night', place: 'source-id', count: 2 }, nameOf);
    expect(text).toContain('at the docks by night');
    expect(text).toContain('place named is Cecily');
    expect(text).toContain('count given is 2');
  });

  it('does not mutate a frozen claim or require fabricated identity fields', () => {
    const claim = Object.freeze({ ...BASE });
    const before = JSON.stringify(claim);
    expect(renderClaim(claim, nameOf)).toBe(renderClaim(claim, nameOf));
    expect(JSON.stringify(claim)).toBe(before);
    expect(Object.keys(claim)).not.toContain('family');
  });

  for (const predicate of ['unregistered-tale', 'constructor', '__proto__']) {
    it('handles an unregistered predicate safely: ' + predicate, () => {
      const text = renderClaim({ ...BASE, predicate }, nameOf);
      expect(text).toContain('unfamiliar tale');
      for (const label of Object.values(names)) expect(text).toContain(label);
      expect(text).not.toContain(predicate);
    });
  }
});

import type { Claim } from '../../src/sim/rumors/claim';
import { TRAITS } from '../../src/content/traits';
import { applyTraits } from '../../src/sim/rumors/traits';

// The predicate itself owns these clauses. An extra person does not replace their meaning.
const FIXED_CLAUSES = {
  'stole': 'stole',
  'is-bankrupt': 'has fallen into bankruptcy',
  'forged-the-lineage': 'forged a lineage',
  'plans-to-seize-the-throne': 'means to seize the throne',
  'bribed-the-council': 'bribed the council',
  'embezzles-guild-funds': 'is taking guild funds for private use',
  'consorts-with-smugglers': 'keeps company with smugglers',
  'cheats-at-cards': 'cheats at cards',
  'fathered-a-bastard': 'fathered a child out of wedlock',
  'broke-a-betrothal': 'broke a betrothal',
  'shuttered-the-shop': 'shut the shop',
  'blessed-the-harvest': 'blessed the harvest',
  'rescued-the-drowning-child': 'saved a drowning child from the water',
  'gave-alms-to-the-poor': 'gave alms to the poor',
  'won-the-regatta': 'won the regatta',
  'is-favored-at-court': 'enjoys favor at court',
  'nursed-the-sick-through-fever': 'nursed the sick through fever',
} as const;

describe('predicate meaning survives an extra supplied person', () => {
  for (const [predicate, clause] of Object.entries(FIXED_CLAUSES)) {
    it('preserves ' + predicate + ' for null, named and unnamed objects', () => {
      expect(PREDICATES[predicate]).toBeDefined();
      for (const object of [null, 'object-id', 'someone']) {
        const text = renderClaim({ ...BASE, predicate, object }, nameOf);
        const qualifier = object === null ? ''
          : `; ${object === 'someone' ? 'someone' : 'Benedict'} is named in the account`;
        // The semantic clause is invariant: an object delta cannot rewrite the predicate.
        expect(text.startsWith(`They loudly say that Adelaide ${clause}${qualifier}; the place named is`)).toBe(true);
        expect(text).toContain('the count given is 0');
        expect(text).toContain('Cecily swears it.');
      }
    });
  }

  for (const predicate of ['bribed-the-council', 'rescued-the-drowning-child', 'gave-alms-to-the-poor'] as const) {
    it('preserves ' + predicate + ' through the actual objectifier transform', () => {
      const before: Claim = { ...BASE, id: 'c-prose', family: 'f-prose', parent: null, predicate, object: null };
      const delta = applyTraits([TRAITS['objectifier']!], before,
        { ownerId: 'source-id', faction: 'guild', rivals: ['object-id'], factionOf: () => null });
      expect(delta).toEqual({ object: 'object-id' });
      const after = { ...before, ...delta };
      expect(after.predicate).toBe(before.predicate);
      const clause = `Adelaide ${FIXED_CLAUSES[predicate]}`;
      expect(renderClaim(before, nameOf)).toContain(clause);
      expect(renderClaim(after, nameOf)).toContain(clause + '; Benedict is named in the account');
    });
  }
});

const SECOND_PERSON_CLAUSES = {
  'is-having-an-affair-with': 'you are carrying on an affair',
  'is-bankrupt': 'you have fallen into bankruptcy',
  'owes-money-to': 'you owe money to',
  'plans-to-seize-the-throne': 'you mean to seize the throne',
  'embezzles-guild-funds': 'you are taking guild funds for private use',
  'consorts-with-smugglers': 'you keep company with smugglers',
  'cheats-at-cards': 'you cheat at cards',
  'is-favored-at-court': 'you enjoy favor at court',
  'is-the-true-heir-of': 'you are the rightful heir of',
} as const;

describe('the explicitly supplied you label has matching English agreement', () => {
  for (const [predicate, clause] of Object.entries(SECOND_PERSON_CLAUSES)) {
    it('uses second-person agreement for ' + predicate, () => {
      const text = renderClaim({ ...BASE, predicate }, (id) => id === BASE.subject ? 'you' : nameOf(id));
      expect(text).toContain('They loudly say that ' + clause);
      expect(text).toContain('Cecily swears it.');
    });
  }

  it('agrees in the unfamiliar-tale fallback without inventing a predicate', () => {
    const text = renderClaim({ ...BASE, predicate: 'unregistered-tale' },
      (id) => id === BASE.subject ? 'you' : nameOf(id));
    expect(text).toContain('you figure in an unfamiliar tale');
    expect(text).toContain('Benedict is named in the account');
  });

  it('agrees when you is the neutrally named extra person', () => {
    const text = renderClaim({ ...BASE, predicate: 'is-bankrupt' },
      (id) => id === BASE.object ? 'you' : nameOf(id));
    expect(text).toContain('Adelaide has fallen into bankruptcy; you are named in the account');
  });

  it('agrees and capitalizes the explicitly named you attribution', () => {
    const text = renderClaim(BASE, (id) => id === BASE.attribution ? 'you' : nameOf(id));
    expect(text).toContain('Adelaide poisoned Benedict');
    expect(text.endsWith('. You swear it.')).toBe(true);
  });
});
