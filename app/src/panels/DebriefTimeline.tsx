import type { DebriefView } from '../townview';
import { DebriefClaim, nameFrom, RetainedDetails, When } from './DebriefReading';
import { Term } from './Term';

export function DebriefTimeline({ view, names }: { view: DebriefView; names: Readonly<Record<string, string>> }) {
  const calendar = view.calendar; const nameOf = nameFrom(names);
  return <section className="panel debrief-surface" aria-label="Sketch timeline">
    <h2><Term id="timeline" /></h2>
    <p>Observation, receipt and the enemy's later conclusions have separate dates. Distinct evidence is shown; there is no numerical countdown to your name.</p>
    <nav className="tag-row" aria-label="Calendar days">{calendar.days.map((day) => <a className="desk-btn" key={day.day} href={`#debrief-day-${day.day}`}>Day {day.day}</a>)}</nav>
    {calendar.days.map((day) => <article className="debrief-card" id={`debrief-day-${day.day}`} key={day.day}>
      <h3>Day {day.day}</h3>
      {day.gapBefore > 0 && <p className="desk-note">{day.gapBefore} intervening day(s) have no retained calendar entry.</p>}
      <p>Through <When tick={day.through} />.</p>
      <p className={day.sketch.identifiedOnDay === day.day ? 'debrief-identification' : undefined}>
        {day.sketch.identified ? <>Your identity was recorded on day {day.sketch.identifiedOnDay}.</> : 'Your identity had not been recorded in the retained conclusions.'}</p>
      <p>{day.sketch.evidenceKeys.length} distinct retained evidence group(s), by kind and subject.</p>
      <ul>{day.sketch.evidenceKeys.map((key, index) => <li key={index}>{key.kind} · {key.subject === null ? 'no named subject' : nameOf(key.subject)}
        {' '}· features {key.featureIds.join(', ')}</li>)}</ul>
      <h4>What the enemy had concluded</h4>
      {day.sketch.known.length === 0 && <p>No conclusion retained for this date.</p>}
      <ul>{day.sketch.known.map((feature, index) => <li key={`${feature.id}:${index}`}>
        <strong>{feature.id}</strong> · {feature.kind} · {feature.detail}
        <RetainedDetails value={feature.evidence} label="Read the evidence references" /></li>)}</ul>
      <RetainedDetails value={day.decisions} label="Read decisions recorded on this day, in their retained order" />
      <h4>Observed and reported timestamps</h4>
      <p>Chronicle records: {day.observedChronicleIndexes.join(', ') || 'none'}.
        {' '}Player-account observations: {day.observationEntryIndexes.join(', ') || 'none'}.
        {' '}Enemy-evidence observations: {day.observedEvidenceIndexes.join(', ') || 'none'}.</p>
      <p className="desk-note">A reported observation time does not establish when anyone learned the account.</p>
      <h4>What arrived</h4>
      <p>New player receipts: {day.newlyReceivedEntryIndexes.join(', ') || 'none'}.
        {' '}New enemy acquisitions: {day.newlyAcquiredEvidenceIndexes.join(', ') || 'none'}.</p>
      <h4>Your received board at this date</h4>
      {day.player.log.length === 0 && <p>No received board entries.</p>}
      <ol>{day.player.log.map((entry, index) => <li key={index}>{entry.kind} at {entry.venue}
        {entry.reported && <DebriefClaim claim={entry.reported} names={names} />}<RetainedDetails value={entry} label="Read this received board entry" /></li>)}</ol>
      <RetainedDetails value={day.player.knowledge} label="Read receipt dates and original entry indexes" />
    </article>)}
    <h3>Undated and unresolved history</h3>
    <p>{calendar.unknownKnowledge.length} player receipt(s) and {calendar.unknownEvidenceIndexes.length} enemy acquisition(s) have unrecorded dates.
      {' '}They are not placed on day zero.</p>
    <RetainedDetails value={calendar.unknownKnowledge} label="Player entries with unknown receipt dates" />
    <RetainedDetails value={calendar.unknownEvidenceIndexes} label="Enemy evidence with unknown acquisition dates" />
    <RetainedDetails value={calendar.unrecordedSketch} label="Features without a retained digest date" />
  </section>;
}
