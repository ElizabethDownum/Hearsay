import { Rng } from '../core/rng';
import { CLAIM_FIELDS, SOMEONE } from '../sim/rumors/claim';
import type { ReportedClaim } from '../sim/enemy/state';
import type { DepartedWitness } from '../sim/magic-types';
import type { TownFixture } from '../sim/types';
import type { GeneratedTown, Secret } from './types';

const order = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const normalized = (value: string): string => value.trim().toLowerCase();

export function reportedSecret(secret: Secret): ReportedClaim {
  return {
    subject: secret.subject, predicate: secret.predicate, object: secret.object,
    count: null, severity: secret.severity, place: secret.place, attribution: SOMEONE,
  };
}
function reserved(fixture: TownFixture): Set<string> {
  return new Set([
    'you', 'safehouse',
    ...fixture.npcs.flatMap((npc) => [normalized(npc.id), normalized(npc.name)]),
    ...fixture.venues.map((venue) => normalized(venue.id)),
  ]);
}
export function generateDeparted(
  seed: string, fixture: TownFixture, secrets: readonly Secret[], names: readonly string[],
): DepartedWitness | null {
  const rng = new Rng(seed, 'gen:departed');
  const npcs = new Map(fixture.npcs.map((npc) => [npc.id, npc]));
  const candidates = [...secrets].sort((a, b) => order(a.id, b.id)).flatMap((secret) => {
    const subject = npcs.get(secret.subject);
    if (!subject) return [];
    const edges = subject.edges.filter((edge) => edge.to !== subject.id && npcs.has(edge.to))
      .map((edge) => ({ from: subject.id, to: edge.to, kind: edge.kind }))
      .sort((a, b) => order(a.to, b.to) || order(a.kind, b.kind));
    return edges.length === 0 ? [] : [{ secret, edges }];
  });
  if (candidates.length === 0) return null;
  const chosen = candidates[rng.int(0, candidates.length)]!;
  const edge = chosen.edges[rng.int(0, chosen.edges.length)]!;
  const blocked = reserved(fixture);
  const namePool = [...new Set(names.map((name) => name.trim()))]
    .filter((name) => name.length > 0 && !blocked.has(normalized(name))).sort(order);
  let name: string;
  if (namePool.length > 0) {
    name = namePool[rng.int(0, namePool.length)]!;
  } else {
    name = 'The unnamed witness';
    let ordinal = 2;
    while (blocked.has(normalized(name))) name = 'The unnamed witness ' + ordinal++;
  }
  let ordinal = 0;
  let id = 'departed:' + ordinal;
  while (blocked.has(normalized(id))) id = 'departed:' + ++ordinal;
  return { id, name, secretId: chosen.secret.id, reported: reportedSecret(chosen.secret), edge: { ...edge } };
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Small report-style validator; no undefined serialization or whole-world validation. */
export function departedProblems(town: GeneratedTown): string[] {
  if (!Object.hasOwn(town, 'departed')) return [];
  if (town.departed === undefined) return ['present departed metadata must not be undefined'];
  if (town.departed === null) return ['no historical witness with a real secret and subject edge'];
  const departed = town.departed;
  if (!record(departed) || typeof departed.id !== 'string' || departed.id.trim() === ''
    || typeof departed.name !== 'string' || departed.name.trim() === ''
    || typeof departed.secretId !== 'string' || !record(departed.reported)
    || !record(departed.edge)) return ['malformed historical witness'];
  const problems: string[] = [];
  const blocked = reserved(town.fixture);
  if (blocked.has(normalized(departed.id))) problems.push('departed id collides with a living or venue identity');
  if (blocked.has(normalized(departed.name))) problems.push('departed name is already in use');
  const matches = town.secrets.filter((secret) => secret.id === departed.secretId);
  if (matches.length !== 1) return [...problems, 'departed secret does not resolve uniquely'];
  const secret = matches[0]!;
  const expected = reportedSecret(secret);
  if (Object.keys(departed.reported).sort().join('|') !== [...CLAIM_FIELDS].sort().join('|')
    || CLAIM_FIELDS.some((field) => departed.reported[field] !== expected[field])) {
    problems.push('departed testimony differs from the real secret');
  }
  const subject = town.fixture.npcs.find((npc) => npc.id === secret.subject);
  if (!subject || departed.edge.from !== secret.subject || departed.edge.to === secret.subject
    || !town.fixture.npcs.some((npc) => npc.id === departed.edge.to)
    || !subject.edges.some((edge) => edge.to === departed.edge.to && edge.kind === departed.edge.kind)) {
    problems.push('departed clue is not a real outgoing subject relationship');
  }
  return problems;
}
