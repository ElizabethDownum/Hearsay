import type { EveningReport as EveningReportView } from '../../../src/intel/report';
import { Term } from './Term';

/**
 * The evening report (ratified batched cadence): the day's haul in one glance — the stories heard
 * for the first time today, how many reports each channel filed, and every authority sighting
 * (guard askings + watch presence) rendered in vermilion, the enemy-flavoured danger channel.
 * Props-only: `eveningReport` is a pure day-scoped fold over the intel log.
 */
export function EveningReport({ report, onOpenBoard }: { report: EveningReportView; onOpenBoard(): void }) {
  const vias = Object.entries(report.entriesByVia);
  return (
    <section className="panel">
      <h2><Term id="evening-report" /></h2>
      <p>Day {report.day} · {report.newFamilies.length} new <Term id="family" />(s)</p>

      <h3>New stories today</h3>
      {report.newFamilies.length === 0
        ? <p className="desk-note">No new stories reached you today.</p>
        : <ul>{report.newFamilies.map((f) => <li key={f}>{f}</li>)}</ul>}

      <h3>By <Term id="via" /></h3>
      {vias.length === 0 ? <p className="desk-note">Nothing captured today.</p> : (
        <ul>{vias.map(([via, ix]) => (
          <li key={via}><span className="badge badge-via">{via}</span> {ix.length} report(s)</li>
        ))}</ul>
      )}

      <h3><Term id="authority" /> sightings</h3>
      {report.authoritySightings.length === 0
        ? <p className="desk-note">No <Term id="watch" /> or authority asking seen today.</p>
        : <p className="badge badge-danger">{report.authoritySightings.length} sighting(s) today</p>}

      <p><button className="desk-btn" onClick={onOpenBoard}>Open the <Term id="evidence-board" /></button></p>
    </section>
  );
}
