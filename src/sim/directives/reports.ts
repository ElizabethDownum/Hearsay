import type { Tick } from '../../core/time';
import { cloneSerializable } from '../hash';
import { reportThrough } from '../reporting';
import type { Rules } from '../rules';
import type { WorldState } from '../types';
import { allocateNetworkMessage } from './state';
import type {
  DirectiveDecisionProfile, DirectiveExecutionResult, DirectiveRecord,
  DirectiveReportEvidence, DirectiveReportPayload, MessageId,
} from './types';

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
    factRefs: built.factRefs, enemyAction: null,
  }, availableAfter, null, null);
}
