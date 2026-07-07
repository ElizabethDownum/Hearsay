import type { WebView, WebSpoke } from '../../../src/intel/web';
import { Term } from './Term';

/**
 * The provenance web (amendment #5): a subject at the hub, the carriers who brought word about it
 * on the ring, family counts on each spoke, and — for the succession objective — gilt checkmarks
 * for the principals you've touched with damaging word ("how close you're getting"). Props-only:
 * `webView` (with objective `principalsTouched` computed from Rules' damaging predicates in the
 * composition root) is a pure fold; this only draws it. Every spoke wears its via badge.
 */
export function WebViewPanel({ web, onSelectNpc }: { web: WebView; onSelectNpc(id: string): void }) {
  const s = web.subject;
  const principals = s.kind === 'objective' ? [s.usurper, ...s.council] : [];
  const touched = new Set(web.principalsTouched);
  // EVERY touched principal wears the gilt checkmark — the usurper FIRST among them (the primary
  // objective; "how close you're getting" starts with him), then each council member.
  const mark = (id: string) => (touched.has(id)
    ? <span className="badge badge-lock" title="damaging word reached this principal"> ✓</span>
    : null);
  return (
    <section className="panel">
      <h2><Term id="web-view" /></h2>
      {s.kind === 'objective'
        ? (
          <p>
            <Term id="usurper" /> <b>{s.usurper}</b>{mark(s.usurper)} · <Term id="council" />:{' '}
            {s.council.map((c) => <span key={c}>{c}{mark(c)} </span>)}
          </p>
        )
        : <p><Term id="subject" />: <b>{s.id}</b></p>}
      <Hub web={web} onSelectNpc={onSelectNpc} />
      <p className="desk-note">
        {web.families.length} <Term id="family" />(s) · {web.spokes.length} carrier(s)
        {s.kind === 'objective' ? ` · ${web.principalsTouched.length}/${principals.length} principals touched` : ''}
      </p>
    </section>
  );
}

function Hub({ web, onSelectNpc }: { web: WebView; onSelectNpc(id: string): void }) {
  const spokes = web.spokes;
  const cx = 200, cy = 150, r = 110;
  const pt = (i: number) => {
    const a = (Math.PI * 2 * i) / Math.max(spokes.length, 1) - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const label = web.subject.kind === 'objective' ? web.subject.usurper : web.subject.id;
  return (
    <svg viewBox="0 0 400 300" width="100%" role="img" aria-label="provenance web">
      {spokes.map((sp, i) => {
        const p = pt(i);
        return (
          <line key={`l${sp.carrier}`} x1={cx} y1={cy} x2={p.x} y2={p.y}
            style={{ stroke: 'var(--sepia)' }} strokeWidth={Math.min(1 + sp.families.length, 5)} />
        );
      })}
      <circle cx={cx} cy={cy} r={26} style={{ fill: 'var(--paper)', stroke: 'var(--ink)' }} strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" style={{ fill: 'var(--ink)', font: '12px var(--font-ui)' }}>{label}</text>
      {spokes.map((sp, i) => <Carrier key={sp.carrier} sp={sp} p={pt(i)} onSelectNpc={onSelectNpc} />)}
    </svg>
  );
}

function Carrier({ sp, p, onSelectNpc }: { sp: WebSpoke; p: { x: number; y: number }; onSelectNpc(id: string): void }) {
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onSelectNpc(sp.carrier)} tabIndex={0}
      role="button" aria-label={`web spoke ${sp.carrier}, ${sp.families.length} stories via ${sp.via}`}>
      <circle cx={p.x} cy={p.y} r={16} style={{ fill: 'var(--paper)', stroke: 'var(--verdigris)' }} strokeWidth={1.5} />
      <text x={p.x} y={p.y + 3} textAnchor="middle" style={{ fill: 'var(--ink)', font: '10px var(--font-ui)' }}>{sp.families.length}</text>
      <text x={p.x} y={p.y + 30} textAnchor="middle" style={{ fill: 'var(--sepia)', font: '10px var(--font-ui)' }}>{sp.carrier} · {sp.via}</text>
    </g>
  );
}
