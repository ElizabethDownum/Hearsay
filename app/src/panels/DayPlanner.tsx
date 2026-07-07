import { useState } from 'react';
import { TERMS } from '../../../src/content/terms';
import type { PlayerView } from '../townview';
import type { ActionIntent } from '../loop/session';
import { Term } from './Term';

/**
 * The planner — the spymaster's desk where verbs are composed. Props-only and pinned to exactly
 * { view, paused, onVerb }: everything it offers is derived from the epistemic PlayerView plus the
 * TERMS registry (predicate labels), never world/engine state. Verbs are DISABLED while running
 * (pause-to-plan, the low-APM law); submitting shows the beat the verb queued for. `onVerb` hands
 * the intent to the composition root, which submits it through the session log.
 *
 * `SOMEONE` mirrors the sim's vague-source sentinel (src/sim/rumors/claim, value 'someone'); the
 * value can't be imported across the panels fence, so it is restated here as the stable public
 * token it is — a vague subject/source the player can name.
 */
const SOMEONE = 'someone';
const PREDICATES = Object.keys(TERMS)
  .filter((k) => k.startsWith('predicate-'))
  .map((k) => ({ id: k.slice('predicate-'.length), termId: k }))
  .sort((a, b) => a.id.localeCompare(b.id));

export function DayPlanner({
  view, paused, onVerb,
}: { view: PlayerView; paused: boolean; onVerb(intent: ActionIntent): void }) {
  const off = !paused; // pause-to-plan: every verb control is inert while the sim runs
  const venues = [...view.map.venues].sort((a, b) => a.id.localeCompare(b.id));
  const people = [...view.map.directory].map((p) => p.id).sort();
  const canGo = (v: { id: string; access: string }) => v.access === 'public' || v.id === 'safehouse';
  return (
    <section className="panel">
      <h2><Term id="day-planner" /></h2>
      {off && <p className="desk-note">The sim is running — pause (Space) to plan. Verbs queue for their next legal beat.</p>}

      <h3><Term id="access" /> · travel</h3>
      <div>
        {venues.map((v) => canGo(v)
          ? <button key={v.id} className="desk-btn" disabled={off} onClick={() => onVerb({ kind: 'goTo', venue: v.id })}>{v.id}</button>
          : <span key={v.id} className="desk-note" title="no standing — Plan 8">{v.id} — no standing (Plan 8) </span>)}
      </div>

      <TellComposer view={view} off={off} onVerb={onVerb} people={people} venues={venues.map((v) => v.id)} />

      <h3><Term id="inquiry" /> · ask a circle-mate</h3>
      <AskComposer members={view.avatar.circleMembers} people={people} off={off} onVerb={onVerb} />

      <h3><Term id="informant" /> · postings</h3>
      {view.informants.length === 0 ? <p className="desk-note">No informants recruited.</p> : view.informants.map((inf) => (
        <div key={inf.id} className="tag-row">
          <span>{inf.id}</span>
          <select className="desk-btn" disabled={off} value={inf.assignedVenue ?? ''}
            onChange={(e) => onVerb({ kind: 'assignInformant', informant: inf.id, venue: e.target.value || null })}>
            <option value="">— unassigned —</option>
            {venues.filter(canGo).map((v) => <option key={v.id} value={v.id}>{v.id}</option>)}
          </select>
        </div>
      ))}
    </section>
  );
}

function TellComposer({
  view, off, onVerb, people, venues,
}: { view: PlayerView; off: boolean; onVerb(i: ActionIntent): void; people: string[]; venues: string[] }) {
  const members = view.avatar.circleMembers;
  const [to, setTo] = useState('');
  const [s, setS] = useState({ subject: SOMEONE, predicate: PREDICATES[0]!.id, object: '', count: '', severity: '3', place: '', attribution: SOMEONE });
  const set = (k: keyof typeof s) => (e: { target: { value: string } }) => setS({ ...s, [k]: e.target.value });
  const target = to || members[0] || '';
  const submit = () => onVerb({
    kind: 'tell', to: target,
    spec: {
      subject: s.subject, predicate: s.predicate, object: s.object || null,
      count: s.count === '' ? null : Number(s.count),
      severity: Number(s.severity) as 1 | 2 | 3 | 4 | 5,
      place: s.place || null, attribution: s.attribution,
    },
  });
  const withSomeone = [SOMEONE, ...people];
  return (
    <>
      <h3><Term id="circle" /> · tell</h3>
      {members.length === 0
        ? <p className="desk-note">No circle-mates in earshot this beat — pause on a beat where your avatar shares a venue.</p>
        : (
          <div className="tag-row">
            <label><Term id="subject" /> <select className="desk-btn" disabled={off} value={s.subject} onChange={set('subject')}>{withSomeone.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><Term id="predicate" /> <select className="desk-btn" disabled={off} value={s.predicate} onChange={set('predicate')}>{PREDICATES.map((p) => <option key={p.id} value={p.id}>{TERMS[p.termId]!.label}</option>)}</select></label>
            <label><Term id="object" /> <select className="desk-btn" disabled={off} value={s.object} onChange={set('object')}><option value="">—</option>{withSomeone.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><Term id="count" /> <input className="desk-btn" style={{ width: 44 }} type="number" disabled={off} value={s.count} onChange={set('count')} /></label>
            <label><Term id="severity" /> <select className="desk-btn" disabled={off} value={s.severity} onChange={set('severity')}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label><Term id="place" /> <select className="desk-btn" disabled={off} value={s.place} onChange={set('place')}><option value="">—</option>{venues.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
            <label><Term id="attribution" /> <select className="desk-btn" disabled={off} value={s.attribution} onChange={set('attribution')}>{withSomeone.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label>to <select className="desk-btn" disabled={off} value={target} onChange={(e) => setTo(e.target.value)}>{members.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
            <button className="desk-btn" disabled={off} onClick={submit}>tell</button>
          </div>
        )}
    </>
  );
}

function AskComposer({
  members, people, off, onVerb,
}: { members: string[]; people: string[]; off: boolean; onVerb(i: ActionIntent): void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const target = to || members[0] || '';
  const subj = subject || people[0] || '';
  if (members.length === 0) return <p className="desk-note">No circle-mates in earshot this beat.</p>;
  return (
    <div className="tag-row">
      <label>ask <select className="desk-btn" disabled={off} value={target} onChange={(e) => setTo(e.target.value)}>{members.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>about <Term id="subject" /> <select className="desk-btn" disabled={off} value={subj} onChange={(e) => setSubject(e.target.value)}>{people.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <button className="desk-btn" disabled={off} onClick={() => onVerb({ kind: 'ask', to: target, about: { subject: subj } })}>ask</button>
    </div>
  );
}
