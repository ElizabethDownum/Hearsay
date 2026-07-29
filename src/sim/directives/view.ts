import type { Tick } from '../../core/time';
import type { EntityId } from '../rumors/claim';
import type { WorldState } from '../types';
import { cloneSerializable } from '../hash';
import type {
  DirectiveBrief, DirectiveHandoff, DirectiveId, DirectiveReportPayload,
} from './types';

/**
 * THE directive desk's epistemic selector (Plan 11 Task 13).
 *
 * The constraints' "epistemic selectors" law in one function: the desk may show what the player
 * AUTHORED, a clock derived purely from authored time, and the reports that PHYSICALLY came back —
 * and nothing else. It may not show the received/mutated brief, delivery or execution state, the
 * decision profile, allegiance, scrutiny, eligibility, compromise, a hidden "why", or the enemy
 * sketch. The game records context and leaves the "why" to the player.
 *
 * That fence is structural, not conventional: this module reads exactly four things off the world —
 * `records[].authored.brief`, `records[].handoff`, `records[].receivedReports`, and `world.tick`.
 * `tests/directives/view.test.ts` scans this source for every forbidden name (and proves each prong
 * fires against an injected violation), and twin-flips receipt/decision/execution/scrutiny/turncoat/
 * enemy-roster/enemy-sketch state to prove the serialized view does not move by one byte.
 *
 * "Active" is a statement about the AUTHORED DEADLINE ONLY — it claims nothing about whether the
 * brief was delivered, read, accepted, or acted on. Received reports never stop or rewrite the
 * clock; a completed directive whose authored deadline has passed still reads `overdue`, because
 * that is what the player's own paperwork says, and the paperwork is all the desk has.
 */
export interface DirectiveLedgerRow {
  id: DirectiveId;
  recipient: EntityId;
  issuedAt: Tick;
  handoff: DirectiveHandoff;
  authored: DirectiveBrief;
  clock: 'active' | 'due' | 'overdue';
  reports: {
    receivedAt: Tick;
    via: EntityId;
    report: DirectiveReportPayload;
  }[];
}

export interface DirectiveLedgerView {
  rows: DirectiveLedgerRow[];
}

export function directiveView(world: WorldState): DirectiveLedgerView {
  // Lazy-state law: an untouched world has no directive substrate and must not grow one by being
  // LOOKED at — the selector reads through the optional field, it never calls the ensure-er.
  const records = world.network.directiveState?.records ?? [];
  const rows: DirectiveLedgerRow[] = [];
  for (const record of records) {
    if (record.principal !== 'player') continue;
    const authored = record.authored.brief;
    const deadline = authored.reportBy ?? authored.active.until;
    const clock = world.tick < deadline ? 'active'
      : world.tick === deadline ? 'due'
        : 'overdue';
    // Deep copies (bounded, per call — never a per-tick world clone): a consumer that scribbles on
    // a returned row can never write back into the record it came from.
    const reports = record.receivedReports
      .map((row) => cloneSerializable(row))
      .sort((a, b) => a.receivedAt - b.receivedAt || String(a.via).localeCompare(String(b.via)));
    rows.push({
      id: record.id,
      recipient: record.recipient,
      issuedAt: record.issuedAt,
      handoff: cloneSerializable(record.handoff),
      authored: cloneSerializable(authored),
      clock,
      reports,
    });
  }
  rows.sort((a, b) => a.issuedAt - b.issuedAt || a.id.localeCompare(b.id));
  return { rows };
}
