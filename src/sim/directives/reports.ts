import type { Tick } from '../../core/time';
import { cloneSerializable } from '../hash';
import { reportThrough } from '../reporting';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import { allocateNetworkMessage } from './state';
import type {
  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord,
  DirectiveReportEvidence, DirectiveReportPayload, MessageId, SpokenNetworkPayload,
} from './types';
import { correlationOf } from './types';

export interface BuiltDirectiveReport {
  report: DirectiveReportPayload;
  factRefs: { asset: string; factIndex: number }[];
}

const emptyReport = (report: DirectiveReportPayload): boolean => report.outcome === null
  && report.reason === null && report.evidence === null && report.source === null
  && report.uncertainty === null;

/** Build the reporter's own spoken copy before any later relay adds its own trait/candor layer. */
export function buildDirectiveReport(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  result: DirectiveExecutionResult,
  rules: Rules,
): BuiltDirectiveReport {
  const evidence: DirectiveReportEvidence[] = result.evidence.map(cloneSerializable);
  if (result.reportedClaim !== null) {
    evidence.push({
      kind: 'claim',
      claimId: result.reportedClaim.id,
      reported: reportThrough(
        world,
        record.recipient,
        result.reportedClaim,
        rules,
        record.principal,
        { traits: 'apply', turncoat: profile.candor === 'doctored' ? 'apply' : 'skip' },
      ),
    });
  }

  const report: DirectiveReportPayload = {
    outcome: profile.disclosure.outcome ? result.outcome : null,
    reason: profile.disclosure.reason ? result.reason : null,
    evidence: profile.disclosure.evidence ? evidence : null,
    source: profile.disclosure.source ? result.source : null,
    uncertainty: profile.disclosure.uncertainty ? result.uncertainty : null,
  };

  if (profile.candor === 'guarded') report.source = null;
  if (profile.candor === 'omissive' || profile.candor === 'doctored') {
    report.reason = null;
    if (report.evidence !== null) {
      const claimsOnly = report.evidence.filter((row) => row.kind === 'claim');
      report.evidence = claimsOnly.length === 0 ? null : claimsOnly;
    }
  }

  return {
    report,
    factRefs: profile.candor === 'ordinary' && profile.disclosure.source
      ? cloneSerializable(result.factRefs) : [],
  };
}

/** Queue through only the reply route physically retained in the received version. */
export function queueDirectiveReport(
  world: WorldState,
  record: DirectiveRecord,
  profile: DirectiveDecisionProfile,
  result: DirectiveExecutionResult,
  rules: Rules,
  completedAt: Tick,
): MessageId | null {
  const route = record.received?.version.replyRoute ?? null;
  if (route === null) return null;
  const seen = new Set<string>();
  for (const id of route) {
    if (id === record.recipient) {
      throw new Error(`directive report '${record.id}': received route contains self-hop '${id}'`);
    }
    if (seen.has(id)) throw new Error(`directive report '${record.id}': duplicate route actor '${id}'`);
    seen.add(id);
  }
  const built = buildDirectiveReport(world, record, profile, result, rules);
  if (emptyReport(built.report)) return null;
  const availableAfter = Math.max(completedAt, profile.timing.reportAt ?? completedAt);
  return allocateNetworkMessage(world, record.principal, record.recipient, [...route], {
    kind: 'directive-report', directiveId: record.id, report: built.report,
    factRefs: built.factRefs,
    enemyAction: profile.candor === 'ordinary' || profile.candor === 'guarded'
      ? cloneSerializable(result.enemyAction ?? null) : null,
  }, availableAfter, null, null);
}

/** HQ bookkeeping is driven by correlation, while completion facts come only from heard speech. */
export function settleEnemyOrderReport(
  world: WorldState,
  record: DirectiveRecord,
  spoken: Extract<SpokenNetworkPayload, { kind: 'directive-report' }>,
): void {
  const correlation = correlationOf(record);
  if (record.principal !== 'enemy' || correlation.kind !== 'enemy-order') return;
  const pending = world.enemy.pendingOrders ?? [];
  const reservation = pending.find((row) => row.directiveIds.includes(record.id));
  const remaining = pending.filter((row) => row !== reservation);
  if (remaining.length > 0) world.enemy.pendingOrders = remaining;
  else delete world.enemy.pendingOrders;

  const action = spoken.enemyAction;
  if (action === null) return;
  if (action.kind === 'inquiry-started') {
    const key = correlation.orderKey.replace(/^inquiry:/, '');
    if (!world.enemy.inquiriesIssued.includes(key)) world.enemy.inquiriesIssued.push(key);
    return;
  }
  if (action.kind === 'interrogation-asked') {
    const key = correlation.orderKey.replace(/^interrogation:/, '');
    if (!world.enemy.interrogated.includes(key)) world.enemy.interrogated.push(key);
    let row = world.enemy.actionLedger?.find((candidate) => candidate.orderKey === correlation.orderKey);
    if (!row) {
      const rows = world.enemy.actionLedger ?? (world.enemy.actionLedger = []);
      row = {
        orderKey: correlation.orderKey, kind: 'interrogation', directiveIds: [record.id],
        leadFeatureId: correlation.leadFeatureId, subject: action.subject,
        about: action.about, district: action.district,
        scheduleStartDay: action.scheduleStartDay,
        posts: [{ guard: action.guard, venue: action.venue }],
        workedDays: action.workedDay === null ? [] : [action.workedDay], askedAt: action.occurredAt,
      };
      rows.push(row);
    } else if (!row.directiveIds.includes(record.id)) {
      row.directiveIds.push(record.id);
      row.directiveIds.sort();
    }
    return;
  }
  if (action.kind === 'watch-worked') {
    let row = world.enemy.actionLedger?.find((candidate) => candidate.orderKey === correlation.orderKey);
    if (!row) {
      const rows = world.enemy.actionLedger ?? (world.enemy.actionLedger = []);
      row = {
        orderKey: correlation.orderKey, kind: 'watch', directiveIds: [record.id],
        leadFeatureId: correlation.leadFeatureId, subject: action.subject,
        about: action.about, district: action.district,
        scheduleStartDay: action.scheduleStartDay, posts: [], workedDays: [], askedAt: null,
      };
      rows.push(row);
    } else if (!row.directiveIds.includes(record.id)) {
      row.directiveIds.push(record.id);
      row.directiveIds.sort();
    }
    if (!row.posts.some((post) => post.guard === action.guard && post.venue === action.venue)) {
      row.posts.push({ guard: action.guard, venue: action.venue });
      row.posts.sort((a, b) => a.guard.localeCompare(b.guard) || a.venue.localeCompare(b.venue));
    }
    if (action.workedDay !== null && !row.workedDays.includes(action.workedDay)) {
      row.workedDays.push(action.workedDay);
      row.workedDays.sort((a, b) => a - b);
    }
    if (!world.enemy.watchedDistricts.includes(action.district)) {
      world.enemy.watchedDistricts.push(action.district);
      world.enemy.watchedDistricts.sort();
    }
    return;
  }
  const row = world.enemy.actionLedger?.find((candidate) => candidate.orderKey === correlation.orderKey);
  if (row) {
    row.posts = row.posts.filter((post) => !(post.guard === action.guard && post.venue === action.venue));
    if (row.posts.length === 0 && !world.enemy.actionLedger?.some((candidate) =>
      candidate !== row && candidate.district === row.district && candidate.posts.length > 0)) {
      world.enemy.watchedDistricts = world.enemy.watchedDistricts.filter((district) => district !== row.district);
    }
  }
}
