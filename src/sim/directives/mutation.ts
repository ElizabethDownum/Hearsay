import { cloneSerializable } from '../hash';
import type { Npc } from '../types';
import { applyTraits, type TraitContext, type TraitDef, type TraitId } from '../rumors/traits';
import { SOMEONE, type Claim, type EntityId } from '../rumors/claim';
import type { Principal } from '../network/types';
import type { Rules } from '../rules';
import type {
  BriefChange, BriefVersion, DirectiveBrief, DirectiveCandor, DirectiveReportPayload,
  EnemyActionReport, ShapePayload,
} from './types';

export interface BriefProjectionInput {
  version: BriefVersion;
  speaker: {
    id: EntityId; faction: Npc['faction']; rivals: EntityId[];
    knownFactions: Record<EntityId, Npc['faction']>; traits: TraitId[];
  };
  lastFrom: EntityId;
  audience: Principal;
  turnedAgainstAudience: boolean;
  perceivedScrutiny: number;
  mode: 'relay' | 'handler-report' | 'private-interpretation';
}

export interface BriefProjection {
  retell: 'speak' | 'withhold';
  brief: DirectiveBrief;
  claimedIssuer: EntityId | typeof SOMEONE;
  replyRoute: EntityId[] | null;
  changes: BriefChange[];
}

export type ProjectionSpeaker = BriefProjectionInput['speaker'];

const CONSPICUOUS = new Set<TraitId>(['attributor', 'name-dropper', 'numberer', 'dramatist']);

export function expressedTraitIds(traits: readonly TraitId[], scrutiny: number): TraitId[] {
  if (scrutiny >= 0.70) return [];
  if (scrutiny >= 0.35) return traits.filter((id) => !CONSPICUOUS.has(id));
  return [...traits];
}

function contextFor(speaker: ProjectionSpeaker): TraitContext {
  return {
    ownerId: speaker.id, faction: speaker.faction, rivals: speaker.rivals,
    factionOf: (id) => speaker.knownFactions[id] ?? null,
  };
}

function chainFor(input: BriefProjectionInput, rules: Rules): TraitDef[] {
  const chain = expressedTraitIds(input.speaker.traits, input.perceivedScrutiny)
    .flatMap((id) => rules.traits[id] ? [rules.traits[id]!] : []);
  if (input.turnedAgainstAudience && input.perceivedScrutiny < 0.35 && rules.traits.minimizer) {
    chain.push(rules.traits.minimizer);
  }
  return chain;
}

function primarySubject(brief: DirectiveBrief): EntityId | typeof SOMEONE {
  const mission = brief.mission;
  if (mission.kind === 'learn') return mission.target.kind === 'person' ? mission.target.id : SOMEONE;
  if (mission.kind === 'shape') return mission.audience.kind === 'person' ? mission.audience.id : SOMEONE;
  return mission.target;
}

function venueGuidanceIndex(brief: DirectiveBrief): number {
  return brief.guidance.findIndex((row) =>
    row.kind === 'expected-presence' || row.kind === 'avoid-venue');
}

function envelopeClaim(version: BriefVersion): Claim {
  const placeIndex = venueGuidanceIndex(version.brief);
  const place = placeIndex < 0 ? null : (() => {
    const row = version.brief.guidance[placeIndex]!;
    return row.kind === 'expected-presence' || row.kind === 'avoid-venue' ? row.venue : null;
  })();
  const specificityCount = { 'outcome-only': null, guided: 1, detailed: 3 } as const;
  const prioritySeverity = { routine: 2, important: 3, urgent: 5 } as const;
  return {
    id: version.id, family: version.directiveId, parent: version.parent,
    subject: primarySubject(version.brief), predicate: `directive:${version.brief.mission.kind}`,
    object: null, count: specificityCount[version.brief.specificity],
    severity: prioritySeverity[version.brief.priority], place,
    attribution: version.claimedIssuer,
  };
}

const owns = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

function applyEnvelopeDelta(brief: DirectiveBrief, claimedIssuer: EntityId | typeof SOMEONE,
  delta: Partial<Claim>): { brief: DirectiveBrief; claimedIssuer: EntityId | typeof SOMEONE } {
  const next = cloneSerializable(brief);
  let issuer = claimedIssuer;
  if (owns(delta, 'severity')) {
    const severity = delta.severity!;
    next.priority = severity <= 2 ? 'routine' : severity <= 4 ? 'important' : 'urgent';
  }
  if (owns(delta, 'count')) {
    const count = delta.count;
    if (count !== undefined) {
      next.specificity = count === null ? 'outcome-only' : count <= 1 ? 'guided' : 'detailed';
    }
  }
  if (owns(delta, 'subject') && delta.subject !== SOMEONE) {
    const subject = delta.subject!;
    if (next.mission.kind === 'learn' && next.mission.target.kind === 'person') {
      next.mission.target.id = subject;
    } else if (next.mission.kind === 'shape' && next.mission.audience.kind === 'person') {
      next.mission.audience.id = subject;
    } else if (next.mission.kind === 'sound-out') next.mission.target = subject;
    const application = next.application;
    if (application?.kind === 'courier' || application?.kind === 'enemy-interrogation') {
      application.target = subject;
    } else if (application?.kind === 'enemy-watch') {
      application.subject = subject;
    }
  }
  if (owns(delta, 'place')) {
    const index = venueGuidanceIndex(next);
    const place = delta.place;
    if (index >= 0) {
      if (place === null) next.guidance.splice(index, 1);
      else if (place !== undefined) {
        const row = next.guidance[index]!;
        if (row.kind === 'expected-presence' || row.kind === 'avoid-venue') row.venue = place;
      }
    }
    const application = next.application;
    if (application?.kind === 'posting' && application.venue !== null && place !== undefined) {
      application.venue = place;
    } else if (place !== null && place !== undefined) {
      if (application?.kind === 'rendezvous'
        || application?.kind === 'enemy-interrogation'
        || application?.kind === 'cancel-watch') application.venue = place;
      else if (application?.kind === 'enemy-watch') application.post.venue = place;
    }
  }
  if (owns(delta, 'attribution') && delta.attribution !== undefined) issuer = delta.attribution;
  return { brief: next, claimedIssuer: issuer };
}

function applyShapeDelta(brief: DirectiveBrief, delta: Partial<Claim>): void {
  if (brief.mission.kind !== 'shape') return;
  const claim = brief.mission.payload.claim;
  for (const field of ['subject', 'predicate', 'object', 'count', 'severity', 'place', 'attribution'] as const) {
    if (owns(delta, field)) Object.assign(claim, { [field]: delta[field] });
  }
}

function walkChanges(from: unknown, to: unknown, path: string, out: BriefChange[]): void {
  if (Object.is(from, to)) return;
  if (Array.isArray(from) || Array.isArray(to)) {
    const left = Array.isArray(from) ? from : [];
    const right = Array.isArray(to) ? to : [];
    for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
      walkChanges(left[i], right[i], path ? `${path}.${i}` : String(i), out);
    }
    return;
  }
  if (from !== null && to !== null && typeof from === 'object' && typeof to === 'object') {
    const keys = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort();
    for (const key of keys) {
      walkChanges((from as Record<string, unknown>)[key], (to as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key, out);
    }
    return;
  }
  out.push({ field: path, from: from === undefined ? null : cloneSerializable(from),
    to: to === undefined ? null : cloneSerializable(to) });
}

function lawfulSources(input: BriefProjectionInput): EntityId[] {
  const sources = new Set<EntityId>();
  if (input.version.claimedIssuer !== SOMEONE && input.version.claimedIssuer !== input.speaker.id) {
    sources.add(input.version.claimedIssuer);
  }
  if (input.lastFrom !== input.speaker.id) sources.add(input.lastFrom);
  return [...sources];
}

export function projectBrief(input: BriefProjectionInput, rules: Rules): BriefProjection {
  const original = { brief: input.version.brief, claimedIssuer: input.version.claimedIssuer,
    replyRoute: input.version.replyRoute };
  const hasSkepticGate = input.speaker.traits.some((id) =>
    rules.traits[id]?.retellGate === 'requires-corroboration');
  if (input.mode !== 'private-interpretation' && hasSkepticGate && lawfulSources(input).length < 2) {
    return { retell: 'withhold', brief: cloneSerializable(input.version.brief),
      claimedIssuer: input.version.claimedIssuer, replyRoute: cloneSerializable(input.version.replyRoute), changes: [] };
  }

  const chain = chainFor(input, rules);
  const ctx = contextFor(input.speaker);
  const envelope = envelopeClaim(input.version);
  const envelopeDelta = applyTraits(chain, envelope, ctx);
  const projected = applyEnvelopeDelta(input.version.brief, input.version.claimedIssuer, envelopeDelta);
  if (projected.brief.mission.kind === 'shape') {
    const payload = projected.brief.mission.payload;
    const shape: Claim = { id: input.version.id, family: payload.family ?? input.version.directiveId,
      parent: payload.parent, ...payload.claim };
    applyShapeDelta(projected.brief, applyTraits(chain, shape, ctx));
  }
  if (input.turnedAgainstAudience && input.perceivedScrutiny >= 0.35
    && input.perceivedScrutiny < 0.70) {
    projected.brief.purpose = null;
    projected.brief.guidance.pop();
  }
  const replyRoute = cloneSerializable(input.version.replyRoute);
  const changes: BriefChange[] = [];
  walkChanges(original, { brief: projected.brief, claimedIssuer: projected.claimedIssuer, replyRoute }, '', changes);
  changes.sort((a, b) => a.field.localeCompare(b.field));
  return { retell: 'speak', brief: projected.brief, claimedIssuer: projected.claimedIssuer,
    replyRoute, changes };
}

export function candorFor(turned: boolean, scrutiny: number, traits: readonly TraitId[]): DirectiveCandor {
  if (scrutiny >= 0.70) return 'guarded';
  if (turned && scrutiny < 0.35) return 'doctored';
  if (turned && scrutiny < 0.70) return 'omissive';
  if (!turned && scrutiny >= 0.50) return 'guarded';
  return traits.includes('vaguener') ? 'omissive' : 'ordinary';
}

export function projectDirectiveReport(input: {
  report: DirectiveReportPayload; enemyAction: EnemyActionReport | null;
  factRefs: { asset: EntityId; factIndex: number }[]; speaker: ProjectionSpeaker;
  turnedAgainstAudience: boolean; perceivedScrutiny: number;
}, rules: Rules): { report: DirectiveReportPayload; enemyAction: EnemyActionReport | null;
  factRefs: { asset: EntityId; factIndex: number }[] } {
  const candor = candorFor(input.turnedAgainstAudience, input.perceivedScrutiny, input.speaker.traits);
  const chain = expressedTraitIds(input.speaker.traits, input.perceivedScrutiny)
    .flatMap((id) => rules.traits[id] ? [rules.traits[id]!] : []);
  if (candor === 'doctored' && rules.traits.minimizer) chain.push(rules.traits.minimizer);
  const uncertaintySeverity = { low: 1, medium: 3, high: 5 } as const;
  const sourceDisclosed = input.report.source !== null;
  const report = cloneSerializable(input.report);
  const assertion: Claim = { id: 'directive-report', family: 'directive-report', parent: null,
    subject: SOMEONE, predicate: 'directive:report', object: null,
    count: report.evidence?.length ?? null,
    severity: report.uncertainty === null ? 3 : uncertaintySeverity[report.uncertainty],
    place: null, attribution: report.source ?? SOMEONE };
  const delta = applyTraits(chain, assertion, contextFor(input.speaker));
  if (owns(delta, 'attribution')) report.source = delta.attribution!;
  if (owns(delta, 'severity')) report.uncertainty = delta.severity! <= 2 ? 'low'
    : delta.severity! <= 4 ? 'medium' : 'high';
  if (owns(delta, 'count') && report.evidence && delta.count !== null
    && delta.count !== undefined && delta.count < report.evidence.length) {
    report.evidence = report.evidence.slice(0, Math.max(0, delta.count));
  }
  return {
    report,
    enemyAction: candor === 'ordinary' || candor === 'guarded'
      ? cloneSerializable(input.enemyAction) : null,
    factRefs: candor === 'ordinary' && sourceDisclosed ? cloneSerializable(input.factRefs) : [],
  };
}

export function projectShapePayloadForMethod(payload: ShapePayload, operation: 'spread' | 'suppress' | 'redirect',
  redirectTo: EntityId | null, speaker: ProjectionSpeaker, rules: Rules, scrutiny = 0): ShapePayload {
  const result = cloneSerializable(payload);
  let claim: Claim = { id: 'method', family: result.family ?? 'method', parent: result.parent,
    ...result.claim };
  if (operation === 'suppress' && rules.traits.minimizer) {
    claim = { ...claim, ...rules.traits.minimizer.transform(claim, contextFor(speaker)) };
  }
  if (operation === 'redirect' && redirectTo !== null) claim = { ...claim, attribution: redirectTo };
  const chain = expressedTraitIds(speaker.traits, scrutiny)
    .flatMap((id) => rules.traits[id] ? [rules.traits[id]!] : []);
  claim = { ...claim, ...applyTraits(chain, claim, contextFor(speaker)) };
  const { subject, predicate, object, count, severity, place, attribution } = claim;
  result.claim = { subject, predicate, object, count, severity, place, attribution };
  return result;
}
