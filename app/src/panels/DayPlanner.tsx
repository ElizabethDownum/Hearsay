import { useState } from 'react';
import { TERMS } from '../../../src/content/terms';
import type { PlayerView, NetworkView, EconomyDef } from '../townview';
import type { ActionIntent } from '../loop/session';
import { Term } from './Term';

/**
 * The planner — the spymaster's desk where every verb is composed. Props-only: everything it offers
 * is derived from the epistemic PlayerView + networkView (`net`) + the treasury (`coin`) + the one
 * price table (`economy`) + the TERMS registry, folded in the composition root. Verbs are DISABLED
 * while running (pause-to-plan, the low-APM law); each composer greys itself EXACTLY as its apply
 * validator would refuse — but only on PLAYER-KNOWN seams (affordability, circle membership, your
 * standing, your roster), never on hidden state (an NPC's beliefs, enemy-net membership, a raw trust
 * edge). Where a hidden gate can still refuse, the engine is the real gate and its throw surfaces as
 * a toast; the composer never invents a message that would leak ground truth (see the recruit note).
 *
 * One speech-act per beat (T10 review carry, note 9): tell / ask / sell are mutually exclusive within
 * a conversation beat. TWO gates enforce it, because a mode toggle alone was defeatable (submit tell
 * → toggle → submit sell queued BOTH — review I-1): (1) a single mode toggle governs which speech
 * submit is live at rest; (2) `speechLatched` — derived at the composition root from the SESSION
 * queue (so it survives this panel remounting) — greys ALL THREE speech submits once a speech act is
 * queued for the beat, clearing only when the beat advances. The session queue itself refuses a
 * second speech verb, so the render is the visible half of a real gate, not decoration. This is the
 * sanctioned v1 gate (same shape as P7's UI-only access gate); no cross-verb physics guard is added.
 *
 * `SOMEONE` mirrors the sim's vague-source sentinel (src/sim/rumors/claim, value 'someone'); it can't
 * be imported across the panels fence, so it is restated here as the stable public token it is.
 */
const SOMEONE = 'someone';
const MICE = ['money', 'ideology', 'coercion', 'ego'] as const;
type MiceHandle = (typeof MICE)[number];
const PREDICATES = Object.keys(TERMS)
  .filter((k) => k.startsWith('predicate-'))
  .map((k) => ({ id: k.slice('predicate-'.length), termId: k }))
  .sort((a, b) => a.id.localeCompare(b.id));

type SpeechMode = 'tell' | 'ask' | 'sell';

export function DayPlanner({
  view, paused, clusterFamilies, net, coin, economy, onVerb, speechLatched = false,
}: {
  view: PlayerView; paused: boolean; clusterFamilies: string[];
  net: NetworkView; coin: number; economy: EconomyDef; onVerb(intent: ActionIntent): void;
  /** A speech act (tell/ask/sell) is already queued for this beat — grey ALL speech submits until it
   *  advances. Derived from the session queue at the composition root, so it survives a panel remount. */
  speechLatched?: boolean;
}) {
  const off = !paused; // pause-to-plan: every verb control is inert while the sim runs
  const [speech, setSpeech] = useState<SpeechMode>('tell');
  const venues = [...view.map.venues].sort((a, b) => a.id.localeCompare(b.id));
  const people = [...view.map.directory].map((p) => p.id).sort();
  const roster = new Set(net.assets.map((a) => a.id));

  // Station-aware access law (mirrors venueOpensFor): public + safehouse always; the salon opens to a
  // noble, the back rooms to a lowlife; pre-station (null) everything opens (P7 behavior).
  const canGo = (v: { id: string; access: string }): boolean =>
    v.access === 'public' || v.id === 'safehouse'
    || view.station === null
    || (view.station === 'noble' && v.id === 'salon')
    || (view.station === 'lowlife' && v.id.startsWith('back-room-'));

  return (
    <section className="panel">
      <h2><Term id="day-planner" /></h2>
      {off && <p className="desk-note">The sim is running — pause (Space) to plan. Verbs queue for their next legal beat.</p>}

      <h3><Term id="access" /> · <Term id="verb-travel" /> · <Term id="standing" />: {view.station ?? 'any'}</h3>
      <div>
        {venues.map((v) => canGo(v)
          ? <button key={v.id} className="desk-btn" disabled={off} onClick={() => onVerb({ kind: 'goTo', venue: v.id })}>{v.id}</button>
          : <span key={v.id} className="desk-note" title="your standing does not open this door">{v.id} — no <Term id="standing" /> </span>)}
      </div>

      <h3><Term id="circle" /> · speech act <span className="desk-note">(one per beat)</span></h3>
      <div className="tag-row" role="radiogroup" aria-label="speech act — one per beat">
        {(['tell', 'ask', 'sell'] as SpeechMode[]).map((m) => (
          <button key={m} className="desk-btn" aria-pressed={speech === m} disabled={off}
            onClick={() => setSpeech(m)}>{TERMS[m === 'tell' ? 'verb-tell' : m === 'ask' ? 'verb-ask' : 'verb-sell']!.label}</button>
        ))}
      </div>
      <TellComposer view={view} off={off} active={speech === 'tell'} latched={speechLatched} onVerb={onVerb} people={people} venues={venues.map((v) => v.id)} />
      <AskComposer members={view.avatar.circleMembers} people={people} families={clusterFamilies} off={off} active={speech === 'ask'} latched={speechLatched} onVerb={onVerb} />
      <SellComposer members={view.avatar.circleMembers} families={clusterFamilies} off={off} active={speech === 'sell'} latched={speechLatched} onVerb={onVerb} />

      <RecruitComposer
        candidates={view.avatar.circleMembers.filter((id) => !roster.has(id))}
        families={clusterFamilies} coin={coin} economy={economy} off={off} onVerb={onVerb} />
      <CourierComposer
        assets={net.assets.map((a) => a.id)} circle={view.avatar.circleMembers} people={people}
        drops={net.drops.map((d) => d.id)} coin={coin} economy={economy} off={off} onVerb={onVerb} />
      <DropComposer venues={venues.filter((v) => v.access === 'public').map((v) => v.id)} coin={coin} economy={economy} off={off} onVerb={onVerb} />
      <MeetComposer assets={net.assets.map((a) => a.id)} off={off} onVerb={onVerb} />
      <HostComposer
        station={view.station} assets={net.assets} avatarVenue={view.avatar.venue}
        salon={venues.find((v) => v.id === 'salon')?.id ?? null}
        backRoom={venues.find((v) => v.id.startsWith('back-room-'))?.id ?? null}
        coin={coin} economy={economy} off={off} onVerb={onVerb} />
      <DebriefComposer
        assets={net.assets.map((a) => a.id)} atSafehouse={view.avatar.venue === 'safehouse'}
        circle={view.avatar.circleMembers} off={off} onVerb={onVerb} />

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

// ── The three speech verbs (mutually exclusive per beat via `active`) ─────────────────────────────

function TellComposer({
  view, off, active, latched, onVerb, people, venues,
}: { view: PlayerView; off: boolean; active: boolean; latched: boolean; onVerb(i: ActionIntent): void; people: string[]; venues: string[] }) {
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
  if (members.length === 0) {
    return <p className="desk-note">No circle-mates in earshot this beat — pause on a beat where your avatar shares a venue.</p>;
  }
  return (
    <div className="tag-row">
      <label><Term id="subject" /> <select className="desk-btn" disabled={off} value={s.subject} onChange={set('subject')}>{withSomeone.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label><Term id="predicate" /> <select className="desk-btn" disabled={off} value={s.predicate} onChange={set('predicate')}>{PREDICATES.map((p) => <option key={p.id} value={p.id}>{TERMS[p.termId]!.label}</option>)}</select></label>
      <label><Term id="object" /> <select className="desk-btn" disabled={off} value={s.object} onChange={set('object')}><option value="">—</option>{withSomeone.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label><Term id="count" /> <input className="desk-btn" style={{ width: 44 }} type="number" disabled={off} value={s.count} onChange={set('count')} /></label>
      <label><Term id="severity" /> <select className="desk-btn" disabled={off} value={s.severity} onChange={set('severity')}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      <label><Term id="place" /> <select className="desk-btn" disabled={off} value={s.place} onChange={set('place')}><option value="">—</option>{venues.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
      <label><Term id="attribution" /> <select className="desk-btn" disabled={off} value={s.attribution} onChange={set('attribution')}>{withSomeone.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label>to <select className="desk-btn" disabled={off} value={target} onChange={(e) => setTo(e.target.value)}>{members.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <button className="desk-btn" aria-label="submit tell" disabled={off || !active || latched} onClick={submit}>tell</button>
    </div>
  );
}

/** The brief's pinned pair — "ask composer (family from board clusters | subject)". */
function AskComposer({
  members, people, families, off, active, latched, onVerb,
}: { members: string[]; people: string[]; families: string[]; off: boolean; active: boolean; latched: boolean; onVerb(i: ActionIntent): void }) {
  const [mode, setMode] = useState<'family' | 'subject'>(families.length > 0 ? 'family' : 'subject');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [family, setFamily] = useState('');
  const target = to || members[0] || '';
  const subj = subject || people[0] || '';
  const fam = family || families[0] || '';
  if (members.length === 0) return <p className="desk-note">No circle-mates in earshot this beat.</p>;
  const useFamily = mode === 'family' && fam !== '';
  return (
    <div className="tag-row">
      <label>ask <select className="desk-btn" disabled={off} value={target} onChange={(e) => setTo(e.target.value)}>{members.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label>about <select className="desk-btn" disabled={off} value={mode} onChange={(e) => setMode(e.target.value as 'family' | 'subject')} aria-label="ask about a story or a person">
        {families.length > 0 && <option value="family">{TERMS['family']!.label}</option>}
        <option value="subject">{TERMS['subject']!.label}</option>
      </select></label>
      {useFamily
        ? <select className="desk-btn" disabled={off} value={fam} aria-label="which story" onChange={(e) => setFamily(e.target.value)}>{families.map((f) => <option key={f} value={f}>{f}</option>)}</select>
        : <select className="desk-btn" disabled={off} value={subj} aria-label="which person" onChange={(e) => setSubject(e.target.value)}>{people.map((p) => <option key={p} value={p}>{p}</option>)}</select>}
      <button className="desk-btn" aria-label="submit ask" disabled={off || !active || latched} onClick={() => onVerb({ kind: 'ask', to: target, about: useFamily ? { family: fam } : { subject: subj } })}>ask</button>
    </div>
  );
}

/** Sell a story you HOLD (a board cluster family) to a circle-mate — the brokerage. Priced by the
 *  family's severity in the engine; the composer only needs the family + buyer (both player-known). */
function SellComposer({
  members, families, off, active, latched, onVerb,
}: { members: string[]; families: string[]; off: boolean; active: boolean; latched: boolean; onVerb(i: ActionIntent): void }) {
  const [to, setTo] = useState('');
  const [family, setFamily] = useState('');
  const target = to || members[0] || '';
  const fam = family || families[0] || '';
  return (
    <div className="tag-row">
      <span className="desk-note"><Term id="brokerage" />:</span>
      {members.length === 0
        ? <span className="desk-note">no buyer in your circle this beat.</span>
        : families.length === 0
          ? <span className="desk-note">you hold no <Term id="family" /> to sell yet.</span>
          : (
            <>
              <label>sell <select className="desk-btn" disabled={off} value={fam} aria-label="which story to sell" onChange={(e) => setFamily(e.target.value)}>{families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
              <label>to <select className="desk-btn" disabled={off} value={target} onChange={(e) => setTo(e.target.value)}>{members.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
              <button className="desk-btn" aria-label="submit sell" disabled={off || !active || latched} onClick={() => onVerb({ kind: 'sell', family: fam, buyer: target })}>sell</button>
            </>
          )}
    </div>
  );
}

// ── The network verbs (gated on player-known seams; the engine is the real gate on hidden state) ──

function RecruitComposer({
  candidates, families, coin, economy, off, onVerb,
}: { candidates: string[]; families: string[]; coin: number; economy: EconomyDef; off: boolean; onVerb(i: ActionIntent): void }) {
  const [target, setTarget] = useState('');
  const [mice, setMice] = useState<MiceHandle>('money');
  const [lev, setLev] = useState('');
  const t = target || candidates[0] || '';
  const leverage = lev || families[0] || '';
  const cost = economy.recruitCost[mice];
  const affordable = coin >= cost;
  return (
    <>
      <h3><Term id="verb-recruit" /></h3>
      {candidates.length === 0
        ? <p className="desk-note">No one in your circle this beat you can bring on.</p>
        : (
          <div className="tag-row">
            <label>recruit <select className="desk-btn" disabled={off} value={t} onChange={(e) => setTarget(e.target.value)}>{candidates.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
            <label>via <select className="desk-btn" disabled={off} value={mice} onChange={(e) => setMice(e.target.value as MiceHandle)}>{MICE.map((m) => <option key={m} value={m}>{TERMS[`mice-${m}`]!.label}</option>)}</select></label>
            {mice === 'coercion' && (
              <label><Term id="family" /> <select className="desk-btn" disabled={off} value={leverage} aria-label="leverage family" onChange={(e) => setLev(e.target.value)}>{families.length === 0 ? <option value="">— none held —</option> : families.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
            )}
            <span className="desk-note">{cost} coin</span>
            <button className="desk-btn" aria-label="submit recruit" disabled={off || !affordable}
              onClick={() => onVerb({ kind: 'recruit', target: t, mice, leverageFamily: mice === 'coercion' ? (leverage || null) : null })}>recruit</button>
            {!affordable && <span className="desk-note">the <Term id="treasury" /> cannot cover this ({cost} needed)</span>}
          </div>
        )}
    </>
  );
}

function CourierComposer({
  assets, circle, people, drops, coin, economy, off, onVerb,
}: { assets: string[]; circle: string[]; people: string[]; drops: string[]; coin: number; economy: EconomyDef; off: boolean; onVerb(i: ActionIntent): void }) {
  const [asset, setAsset] = useState('');
  const [target, setTarget] = useState('');
  const [via, setVia] = useState(''); // '' = face handoff
  const [s, setS] = useState({ subject: SOMEONE, predicate: PREDICATES[0]!.id, severity: '3' });
  const a = asset || assets[0] || '';
  const t = target || people[0] || '';
  const viaDrop = via || null;
  const cost = economy.courierRun;
  const affordable = coin >= cost;
  const faceNeedsCircle = viaDrop === null && a !== '' && !circle.includes(a);
  const blocked = !affordable || faceNeedsCircle;
  if (assets.length === 0) return <><h3><Term id="verb-courier" /></h3><p className="desk-note">No assets to carry a run — <Term id="verb-recruit" /> someone first.</p></>;
  return (
    <>
      <h3><Term id="verb-courier" /></h3>
      <div className="tag-row">
        <label>asset <select className="desk-btn" disabled={off} value={a} onChange={(e) => setAsset(e.target.value)}>{assets.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label><Term id="subject" /> <select className="desk-btn" disabled={off} value={s.subject} onChange={(e) => setS({ ...s, subject: e.target.value })}>{[SOMEONE, ...people].map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <label><Term id="predicate" /> <select className="desk-btn" disabled={off} value={s.predicate} onChange={(e) => setS({ ...s, predicate: e.target.value })}>{PREDICATES.map((p) => <option key={p.id} value={p.id}>{TERMS[p.termId]!.label}</option>)}</select></label>
        <label><Term id="severity" /> <select className="desk-btn" disabled={off} value={s.severity} onChange={(e) => setS({ ...s, severity: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>to <select className="desk-btn" disabled={off} value={t} onChange={(e) => setTarget(e.target.value)}>{people.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <label>via <select className="desk-btn" disabled={off} value={via} aria-label="handoff via" onChange={(e) => setVia(e.target.value)}><option value="">— face handoff —</option>{drops.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <span className="desk-note">{cost} coin</span>
        <button className="desk-btn" aria-label="submit courier" disabled={off || blocked}
          onClick={() => onVerb({ kind: 'courier', asset: a, target: t, viaDrop, spec: { subject: s.subject, predicate: s.predicate, object: null, count: null, severity: Number(s.severity) as 1 | 2 | 3 | 4 | 5, place: null, attribution: SOMEONE } })}>courier</button>
        {!affordable && <span className="desk-note">the <Term id="treasury" /> cannot cover this ({cost} needed)</span>}
        {faceNeedsCircle && <span className="desk-note">a face handoff needs the <Term id="courier" /> in your <Term id="circle" /> — or use a <Term id="dead-drop" /></span>}
      </div>
    </>
  );
}

function DropComposer({
  venues, coin, economy, off, onVerb,
}: { venues: string[]; coin: number; economy: EconomyDef; off: boolean; onVerb(i: ActionIntent): void }) {
  const [id, setId] = useState('');
  const [venue, setVenue] = useState('');
  const v = venue || venues[0] || '';
  const cost = economy.deadDropSetup;
  const affordable = coin >= cost;
  return (
    <>
      <h3><Term id="verb-set-drop" /></h3>
      {venues.length === 0
        ? <p className="desk-note">No public venue to hide a <Term id="dead-drop" /> in.</p>
        : (
          <div className="tag-row">
            <label>id <input className="desk-btn" style={{ width: 88 }} disabled={off} value={id} aria-label="dead drop id" onChange={(e) => setId(e.target.value)} /></label>
            <label>at <select className="desk-btn" disabled={off} value={v} onChange={(e) => setVenue(e.target.value)}>{venues.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <span className="desk-note">{cost} coin</span>
            <button className="desk-btn" aria-label="submit drop" disabled={off || !affordable || id === ''}
              onClick={() => onVerb({ kind: 'setDrop', id, venue: v })}>set drop</button>
            {!affordable && <span className="desk-note">the <Term id="treasury" /> cannot cover this ({cost} needed)</span>}
          </div>
        )}
    </>
  );
}

function MeetComposer({
  assets, off, onVerb,
}: { assets: string[]; off: boolean; onVerb(i: ActionIntent): void }) {
  const [asset, setAsset] = useState('');
  const a = asset || assets[0] || '';
  return (
    <>
      <h3><Term id="verb-meet" /></h3>
      {assets.length === 0
        ? <p className="desk-note">No assets to pull to the safehouse.</p>
        : (
          <div className="tag-row">
            <label>meet <select className="desk-btn" disabled={off} value={a} onChange={(e) => setAsset(e.target.value)}>{assets.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <button className="desk-btn" aria-label="submit meet" disabled={off} onClick={() => onVerb({ kind: 'meet', asset: a })}>meet</button>
            <span className="desk-note">free — the walk is the price</span>
          </div>
        )}
    </>
  );
}

function HostComposer({
  station, assets, avatarVenue, salon, backRoom, coin, economy, off, onVerb,
}: {
  station: 'noble' | 'lowlife' | null;
  assets: { id: string; dispositionBar: number }[];
  avatarVenue: string | null; salon: string | null; backRoom: string | null;
  coin: number; economy: EconomyDef; off: boolean; onVerb(i: ActionIntent): void;
}) {
  const [invitees, setInvitees] = useState<string[]>([]);
  const room = station === 'noble' ? salon : station === 'lowlife' ? backRoom : null;
  const cost = station === 'noble' ? economy.salonEvent : economy.backRoomEvent;
  const affordable = coin >= cost;
  const toggle = (id: string) => setInvitees((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);
  const CAP = 6;
  const blocked = station === null || room === null || invitees.length === 0 || invitees.length > CAP || !affordable;
  return (
    <>
      <h3><Term id="hosting" /></h3>
      {station === null || room === null
        ? <p className="desk-note">No <Term id="standing" /> to host an event.</p>
        : (
          <div className="tag-row">
            <span className="desk-note">host at <b>{room}</b> · {cost} coin · you attend by going there{avatarVenue === room ? ' (you are here)' : ''}</span>
            {assets.map((x) => {
              // The ≥0.5 acceptance gate is a hidden trust read; the strike-derived bar is the honest
              // player-known proxy — an asset the bar shows below half is greyed (the engine still gates).
              const willCome = x.dispositionBar >= 0.5;
              return (
                <label key={x.id} className="desk-note" title={willCome ? '' : 'too low to accept an invitation'}>
                  <input type="checkbox" disabled={off || !willCome} checked={invitees.includes(x.id)} onChange={() => toggle(x.id)} /> {x.id}
                </label>
              );
            })}
            <button className="desk-btn" aria-label="submit host" disabled={off || blocked}
              onClick={() => onVerb({ kind: 'host', venue: room, invitees })}>host</button>
            {!affordable && <span className="desk-note">the <Term id="treasury" /> cannot cover this ({cost} needed)</span>}
          </div>
        )}
    </>
  );
}

function DebriefComposer({
  assets, atSafehouse, circle, off, onVerb,
}: { assets: string[]; atSafehouse: boolean; circle: string[]; off: boolean; onVerb(i: ActionIntent): void }) {
  const [asset, setAsset] = useState('');
  const a = asset || assets[0] || '';
  const present = atSafehouse && a !== '' && circle.includes(a);
  return (
    <>
      <h3><Term id="verb-debrief" /></h3>
      {assets.length === 0
        ? <p className="desk-note">No assets to debrief.</p>
        : (
          <div className="tag-row">
            <label>debrief <select className="desk-btn" disabled={off} value={a} onChange={(e) => setAsset(e.target.value)}>{assets.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <button className="desk-btn" aria-label="submit debrief" disabled={off || !present} onClick={() => onVerb({ kind: 'debrief', asset: a })}>debrief</button>
            {!present && <span className="desk-note"><Term id="debrief" /> happens at the safehouse with the asset present — arrange a <Term id="verb-meet" /></span>}
          </div>
        )}
    </>
  );
}
