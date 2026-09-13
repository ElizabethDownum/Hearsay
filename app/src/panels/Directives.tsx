import type { NameOf } from '../../../src/content/render';
import { ClaimReading } from './ClaimReading';
import { dayOf, minuteOfDay } from '../../../src/core/time';
import type {
  AdvisoryGuidance, DirectiveLedgerRow, DirectiveLedgerView, DirectiveMission,
  DirectiveReportEvidence, DirectiveReportPayload,
} from '../townview';
import { Term } from './Term';

/**
 * THE directive desk (Plan 11 Task 13) — your own paperwork, and the reports that physically came
 * back. Props-only: its ONLY feed is `directiveView(world)`, the epistemic selector whose source is
 * scanned (tests/directives/view.test.ts) for every hidden name it may not read.
 *
 * What this panel deliberately CANNOT say, because the data simply is not in its props: whether the
 * brief was delivered, what version arrived, what the recipient decided, whether they are executing,
 * deferring, refusing, adapting, aborting, compromised, loyal, or turned. The desk shows the mission
 * and eight handoff levers AS YOU WROTE THEM, a clock computed from your own authored deadline, and
 * each physically returned report with a label on exactly the fields that came back non-null.
 *
 * The clock reads `active` / `due` / `overdue` against the authored deadline ALONE. "Active" is a
 * statement about your calendar, not about the world: a directive that was refused an hour after you
 * handed it over still reads `active` until its deadline, and a completed one still goes `overdue`.
 * The game records context and leaves the "why" to you.
 */
const pad = (n: number) => String(n).padStart(2, '0');
const fmtTick = (t: number) => `day ${dayOf(t)} · ${pad(Math.floor(minuteOfDay(t) / 60))}:${pad(minuteOfDay(t) % 60)}`;

export function Directives({ view, nameOf = (id) => id }: { view: DirectiveLedgerView; nameOf?: NameOf }) {
  return (
    <section className="panel">
      <h2><Term id="directive" /></h2>
      {view.rows.length === 0
        ? (
          <p className="desk-note">
            Nothing on the desk. Hand a <Term id="brief" /> to someone standing in front of you.
          </p>
        )
        : view.rows.map((row) => <DirectiveRow key={row.id} row={row} nameOf={nameOf} />)}
      <p className="desk-note">
        Every line here is your own paperwork or a report that physically reached you. Whether the{' '}
        <Term id="brief" /> arrived, and what was made of it, is not the desk&apos;s to say.
      </p>
    </section>
  );
}

function DirectiveRow({ row, nameOf }: { row: DirectiveLedgerRow; nameOf: NameOf }) {
  const brief = row.authored;
  return (
    <article className="desk-record" aria-label={`directive ${row.id}`}>
      <h3>{row.recipient} <span className="desk-note">· {fmtTick(row.issuedAt)}</span></h3>
      <p className="desk-note">
        clock: <b>{row.clock}</b> — your authored deadline, {fmtTick(brief.reportBy ?? brief.active.until)}
      </p>
      <dl className="desk-fields">
        <dt>route out</dt>
        <dd>{row.handoff.outboundVia.length === 0 ? 'handed over in person' : row.handoff.outboundVia.join(' → ')}</dd>
        <dt>route back</dt>
        <dd>{row.handoff.reportVia.length === 0 ? 'straight to you' : row.handoff.reportVia.join(' → ')}</dd>
        <dt>mission</dt>
        <dd>{missionLine(brief.mission)}</dd>
        <dt><Term id="priority" /></dt>
        <dd>{brief.priority}</dd>
        <dt>authority</dt>
        <dd>{brief.authority}</dd>
        <dt>discretion</dt>
        <dd>{brief.discretion}</dd>
        <dt>specificity</dt>
        <dd>{brief.specificity}</dd>
        <dt>guidance</dt>
        <dd>
          {brief.guidance.length === 0
            ? <span className="desk-note">none</span>
            : <ul>{brief.guidance.map((row2, index) => <li key={index}>{guidanceLine(row2)}</li>)}</ul>}
        </dd>
        <dt>window</dt>
        <dd>{fmtTick(brief.active.from)} — {fmtTick(brief.active.until)}</dd>
        <dt><Term id="report-expectation" /></dt>
        <dd>{brief.report}{brief.reportBy === null ? '' : ` by ${fmtTick(brief.reportBy)}`}</dd>
        <dt><Term id="purpose" /></dt>
        <dd>{brief.purpose === null ? <span className="desk-note">withheld</span> : brief.purpose}</dd>
      </dl>
      <Reports rows={row.reports} nameOf={nameOf} />
    </article>
  );
}

function Reports({ rows, nameOf }: { rows: DirectiveLedgerRow['reports']; nameOf: NameOf }) {
  if (rows.length === 0) return <p className="desk-note">Nothing has come back yet.</p>;
  return (
    <ul aria-label="returned reports">
      {rows.map((row, index) => (
        <li key={index}>
          <span className="desk-note">{fmtTick(row.receivedAt)} · via {row.via}</span>
          <ReportFields report={row.report} nameOf={nameOf} />
        </li>
      ))}
    </ul>
  );
}

/** A label appears ONLY where the returned field is non-null: silence is data, a blank row is noise. */
function ReportFields({ report, nameOf }: { report: DirectiveReportPayload; nameOf: NameOf }) {
  return (
    <dl className="desk-fields">
      {report.outcome !== null && <><dt>outcome</dt><dd>{report.outcome}</dd></>}
      {report.reason !== null && <><dt>reason</dt><dd>{report.reason}</dd></>}
      {report.source !== null && <><dt>source</dt><dd>{report.source}</dd></>}
      {report.uncertainty !== null && <><dt>uncertainty</dt><dd>{report.uncertainty}</dd></>}
      {report.evidence !== null && (
        <><dt>evidence</dt><dd><ul>{report.evidence.map((item, index) => (
          <li key={index}><EvidenceLine item={item} nameOf={nameOf} /></li>
        ))}</ul></dd></>
      )}
    </dl>
  );
}

function EvidenceLine({ item, nameOf }: { item: DirectiveReportEvidence; nameOf: NameOf }) {
  return item.kind === 'observation'
    ? item.text
    : <ClaimReading claim={item.reported} nameOf={nameOf} />;
}

function missionLine(mission: DirectiveMission): string {
  switch (mission.kind) {
    case 'learn':
      return `learn · ${mission.target.kind} ${'id' in mission.target ? mission.target.id : mission.target.family}`;
    case 'shape':
      return `shape · ${mission.operation} · audience ${mission.audience.id}`
        + `${mission.redirectTo === null ? '' : ` · toward ${mission.redirectTo}`}`;
    default:
      return `sound out · ${mission.target} · ${mission.topic}`
        + `${mission.handle === null ? '' : ` · ${mission.handle}`}`;
  }
}

function guidanceLine(row: AdvisoryGuidance): string {
  switch (row.kind) {
    case 'expected-presence': return `expected-presence · ${row.person} at ${row.venue} ${fmtTick(row.at)}`;
    case 'avoid-person': return `avoid-person · ${row.person}`;
    case 'avoid-venue': return `avoid-venue · ${row.venue}`;
    case 'not-before': return `not-before · ${fmtTick(row.tick)}`;
    case 'not-after': return `not-after · ${fmtTick(row.tick)}`;
    default: return `note · ${row.text}`;
  }
}
