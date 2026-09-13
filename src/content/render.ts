import type { Claim } from '../sim/rumors/claim';
import { SOMEONE } from '../sim/rumors/claim';
import type { RegisteredPredicate } from './predicates';

export type ClaimText = Pick<Claim,
  'subject' | 'predicate' | 'object' | 'count' | 'severity' | 'place' | 'attribution'>;
export type NameOf = (id: string) => string;
type Words = { subject: string; object: string | null };
type Template = (words: Words) => string;

// A tale's severity changes the telling's emphasis, never its confidence or truth.
const EMPHASIS: Record<ClaimText['severity'], string> = {
  1: 'softly', 2: 'quietly', 3: 'plainly', 4: 'loudly', 5: 'vehemently',
};
// The public name selector uses exactly "you" for the avatar. Agreement follows
// that explicit display pronoun only; no entity identity or hidden state is read.
const agree = (person: string, third: string, second: string): string =>
  person === 'you' ? second : third;
const involving = (object: string | null): string =>
  object === null ? '' : `; ${object} ${agree(object, 'is', 'are')} named in the account`;

/** Total at compile time against the actual predicate registry, not a second list of IDs. */
const TEMPLATES: Record<RegisteredPredicate, Template> = {
  'met-secretly-with': ({ subject, object }) => `${subject} met ${object ?? 'an unnamed companion'} in secret`,
  'is-having-an-affair-with': ({ subject, object }) =>
    `${subject} ${agree(subject, 'is', 'are')} carrying on an affair${object === null ? '' : ` with ${object}`}`,
  'stole': ({ subject, object }) => `${subject} stole${involving(object)}`,
  'is-bankrupt': ({ subject, object }) => `${subject} ${agree(subject, 'has', 'have')} fallen into bankruptcy${involving(object)}`,
  'owes-money-to': ({ subject, object }) => `${subject} ${agree(subject, 'owes', 'owe')} money to ${object ?? 'an unnamed creditor'}`,
  'poisoned': ({ subject, object }) => `${subject} poisoned ${object ?? 'someone'}`,
  'forged-the-lineage': ({ subject, object }) =>
    `${subject} forged a lineage${involving(object)}`,
  'plans-to-seize-the-throne': ({ subject, object }) =>
    `${subject} ${agree(subject, 'means', 'mean')} to seize the throne${involving(object)}`,
  'bribed-the-council': ({ subject, object }) => `${subject} bribed the council${involving(object)}`,
  'embezzles-guild-funds': ({ subject, object }) =>
    `${subject} ${agree(subject, 'is', 'are')} taking guild funds for private use${involving(object)}`,
  'consorts-with-smugglers': ({ subject, object }) =>
    `${subject} ${agree(subject, 'keeps', 'keep')} company with smugglers${involving(object)}`,
  'cheats-at-cards': ({ subject, object }) =>
    `${subject} ${agree(subject, 'cheats', 'cheat')} at cards${involving(object)}`,
  'fathered-a-bastard': ({ subject, object }) =>
    `${subject} fathered a child out of wedlock${involving(object)}`,
  'broke-a-betrothal': ({ subject, object }) =>
    `${subject} broke a betrothal${involving(object)}`,
  'publicly-quarreled-with': ({ subject, object }) =>
    `${subject} quarreled openly with ${object ?? 'someone'}`,
  'shuttered-the-shop': ({ subject, object }) => `${subject} shut the shop${involving(object)}`,
  'blessed-the-harvest': ({ subject, object }) => `${subject} blessed the harvest${involving(object)}`,
  'rescued-the-drowning-child': ({ subject, object }) =>
    `${subject} saved a drowning child from the water${involving(object)}`,
  'gave-alms-to-the-poor': ({ subject, object }) => `${subject} gave alms to the poor${involving(object)}`,
  'won-the-regatta': ({ subject, object }) =>
    `${subject} won the regatta${involving(object)}`,
  'is-favored-at-court': ({ subject, object }) => `${subject} ${agree(subject, 'enjoys', 'enjoy')} favor at court${involving(object)}`,
  'nursed-the-sick-through-fever': ({ subject, object }) =>
    `${subject} nursed the sick through fever${involving(object)}`,
  'is-the-true-heir-of': ({ subject, object }) =>
    `${subject} ${agree(subject, 'is', 'are')} the rightful heir of ${object ?? 'an unnamed line'}`,
  'met-at-the-docks-by-night': ({ subject, object }) =>
    `${subject} met ${object ?? 'an unnamed companion'} at the docks by night`,
};

/** Prose from the seven received fields only. No claim identity, truth lookup, or world access. */
export function renderClaim(claim: ClaimText, nameOf: NameOf): string {
  const name = (id: string): string => id === SOMEONE ? 'someone' : nameOf(id);
  const words = {
    subject: name(claim.subject),
    object: claim.object === null ? null : name(claim.object),
  };
  const known = Object.prototype.hasOwnProperty.call(TEMPLATES, claim.predicate);
  const clause = known
    ? TEMPLATES[claim.predicate as RegisteredPredicate](words)
    : `${words.subject} ${agree(words.subject, 'figures', 'figure')} in an unfamiliar tale${involving(words.object)}`;
  const qualifiers = [
    ...(claim.place === null ? [] : [`the place named is ${name(claim.place)}`]),
    ...(claim.count === null ? [] : [`the count given is ${claim.count}`]),
  ];
  const sourceName = name(claim.attribution);
  const source = claim.attribution === SOMEONE ? 'The source is unnamed.'
    : sourceName === 'you' ? 'You swear it.' : `${sourceName} swears it.`;
  return `They ${EMPHASIS[claim.severity]} say that ${clause}`
    + qualifiers.map((part) => `; ${part}`).join('') + `. ${source}`;
}
