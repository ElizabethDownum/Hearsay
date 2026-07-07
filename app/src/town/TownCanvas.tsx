import { useEffect, useRef, useState } from 'react';
import type { PlayerView } from '../townview';
import { resolveSlot, VENUE_GLYPHS } from '../assets';
import { computeAngleOrder, venueArchetype, type TownLayout } from './layout';

/**
 * The town view — the art-direction doc's "engraved city diagram" (docs/art-direction.md, town-view
 * language). Space is discrete: the diagram IS the venue graph, drawn as a surveyor's plate, never a
 * streets-and-roofs world. It is PROPS-ONLY — the panels-law lint fence extends over app/src/town/**,
 * so this component can never import engine values or read world/enemy state. Everything it draws
 * comes from `view` (the epistemic `PlayerView` — presence appears ONLY at venues you cover),
 * `layout` (deterministic, computed once per seed), `selected`, and the intel-driven `watchSightings`
 * set (the vermilion keyline is folded from the intel log in the composition root, never omniscient).
 *
 * Draw order (bottom → top): paper → district washes → hairline hulls + labels → venue nodes
 * (glyph/icon, diameter by access, vermilion keyline where a watch was seen) → presence dots →
 * avatar ring → informant dots → selection halo.
 *
 * Motion: the brief fixes "no internal state beyond hover", which precludes a stateful tween, so
 * redraws are INSTANT — which is exactly the reduced-motion behaviour the art direction authorises
 * (reduced-motion = none), applied universally. Always legible, never animated.
 */
export interface TownCanvasProps {
  view: PlayerView;
  layout: TownLayout;
  selected: string | null;
  watchSightings: ReadonlySet<string>;
  onSelect(id: string): void;
}

interface Palette {
  paper: string; ink: string; sepia: string; verdigris: string;
  vermilion: string; wash: string;
}

interface Geometry { w: number; h: number; pad: number; scale: number }

// Module-level image cache for confirmed asset packs. Not React state (the "no state beyond hover"
// rule is about component state); a load populates the cache and asks the canvas to repaint. Every
// venue-icon slot is null today (assets/manifest.json), so this stays empty and the glyph is drawn.
type CacheEntry = HTMLImageElement | 'loading' | 'error';
const imageCache = new Map<string, CacheEntry>();
function cachedImage(url: string, onLoad: () => void): HTMLImageElement | null {
  const hit = imageCache.get(url);
  if (hit instanceof HTMLImageElement) return hit;
  if (hit === 'loading' || hit === 'error') return null;
  const img = new Image();
  imageCache.set(url, 'loading');
  img.onload = () => { imageCache.set(url, img); onLoad(); };
  img.onerror = () => { imageCache.set(url, 'error'); };
  img.src = url;
  return null;
}

export function TownCanvas({ view, layout, selected, watchSightings, onSelect }: TownCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<() => void>(() => {});
  const [hover, setHover] = useState<string | null>(null);

  // Redraw on any prop change or hover change — plus whenever the box resizes (DPR-correct).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => paint(canvas, { view, layout, selected, watchSightings, hover }, () => drawRef.current());
    drawRef.current = draw;
    draw();
    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [view, layout, selected, watchSightings, hover]);

  const venueAt = (e: { clientX: number; clientY: number }): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return hitTest(view, layout, geometryOf(rect.width, rect.height), e.clientX - rect.left, e.clientY - rect.top);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const order = computeAngleOrder(layout);
    if (order.length === 0) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(selected && order.includes(selected) ? selected : order[0]!);
      return;
    }
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (dir === 0) return;
    e.preventDefault();
    const cur = selected ? order.indexOf(selected) : -1;
    const next = cur < 0 ? (dir > 0 ? 0 : order.length - 1) : (cur + dir + order.length) % order.length;
    onSelect(order[next]!);
  };

  const label = selected ? `Town diagram — ${selected} selected` : 'Town diagram';
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      tabIndex={0}
      style={{ width: '100%', aspectRatio: '4 / 3', display: 'block', touchAction: 'none', cursor: hover ? 'pointer' : 'default' }}
      onClick={(e) => { const id = venueAt(e); if (id) onSelect(id); }}
      onMouseMove={(e) => setHover(venueAt(e))}
      onMouseLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
    />
  );
}

// ── Pure drawing (no React) ──────────────────────────────────────────────────────────────────────

interface Frame {
  view: PlayerView; layout: TownLayout; selected: string | null;
  watchSightings: ReadonlySet<string>; hover: string | null;
}

function geometryOf(w: number, h: number): Geometry {
  const pad = Math.max(20, Math.min(w, h) * 0.06);
  return { w, h, pad, scale: clamp(Math.min(w, h) / 560, 0.6, 1.7) };
}

function project(g: Geometry, x: number, y: number): { x: number; y: number } {
  return { x: g.pad + x * (g.w - 2 * g.pad), y: g.pad + y * (g.h - 2 * g.pad) };
}

function accessById(view: PlayerView): Map<string, 'public' | 'invitational' | 'private'> {
  return new Map(view.map.venues.map((v) => [v.id, v.access]));
}

function nodeRadius(access: 'public' | 'invitational' | 'private' | undefined, g: Geometry): number {
  const base = access === 'public' ? 11 : access === 'invitational' ? 8.5 : 6.5;
  return base * g.scale;
}

function paint(canvas: HTMLCanvasElement, frame: Frame, requestRedraw: () => void): void {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (w < 1 || h < 1) return;
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pal = readPalette(canvas);
  const g = geometryOf(w, h);
  const { view, layout, selected, watchSightings, hover } = frame;

  ctx.fillStyle = pal.paper;
  ctx.fillRect(0, 0, w, h);

  drawWashesAndHulls(ctx, layout, g, pal);

  const access = accessById(view);
  drawNodes(ctx, layout, g, pal, access, watchSightings, requestRedraw);
  drawPresence(ctx, view, layout, g, pal, access);
  drawAvatar(ctx, view, layout, g, pal, access);
  drawInformants(ctx, view, layout, g, pal, access);
  if (hover && hover !== selected) drawHalo(ctx, layout, g, pal.sepia, hover, access, false);
  if (selected) drawHalo(ctx, layout, g, pal.ink, selected, access, true);
}

function drawWashesAndHulls(ctx: CanvasRenderingContext2D, layout: TownLayout, g: Geometry, pal: Palette): void {
  // Washes first — flat --wash fill, no gradient/shadow (art-direction do-nots).
  for (const h of Object.values(layout.districtHulls)) {
    const c = project(g, h.cx, h.cy);
    ctx.fillStyle = pal.wash;
    ellipse(ctx, c.x, c.y, h.rx * (g.w - 2 * g.pad), h.ry * (g.h - 2 * g.pad));
    ctx.fill();
  }
  // Then hairline borders + small-caps district labels.
  ctx.lineWidth = 1;
  ctx.strokeStyle = pal.sepia;
  for (const [district, h] of Object.entries(layout.districtHulls)) {
    const c = project(g, h.cx, h.cy);
    const rx = h.rx * (g.w - 2 * g.pad), ry = h.ry * (g.h - 2 * g.pad);
    ellipse(ctx, c.x, c.y, rx, ry);
    ctx.stroke();
    ctx.fillStyle = pal.sepia;
    ctx.font = `${Math.round(11 * g.scale)}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(smallCaps(district), c.x, c.y - ry - 4 * g.scale);
  }
}

function drawNodes(
  ctx: CanvasRenderingContext2D, layout: TownLayout, g: Geometry, pal: Palette,
  access: Map<string, 'public' | 'invitational' | 'private'>, watch: ReadonlySet<string>, requestRedraw: () => void,
): void {
  for (const [id, p] of Object.entries(layout.venues)) {
    const c = project(g, p.x, p.y);
    const r = nodeRadius(access.get(id), g);
    // Node disc: paper fill so the engraved glyph reads, hairline ink keyline.
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = pal.paper;
    ctx.fill();
    // Vermilion keyline ONLY where the intel log has a watch sighting — intel-driven, never
    // omniscient. Paired with a thicker stroke so the danger reads by weight as well as colour.
    const watched = watch.has(id);
    ctx.lineWidth = watched ? 2 * g.scale : 1;
    ctx.strokeStyle = watched ? pal.vermilion : pal.ink;
    ctx.stroke();
    drawVenueIcon(ctx, id, c.x, c.y, r, pal.ink, requestRedraw);
  }
}

function drawVenueIcon(
  ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number, r: number,
  ink: string, requestRedraw: () => void,
): void {
  const arch = venueArchetype(id);
  const registered = Object.prototype.hasOwnProperty.call(VENUE_GLYPHS, arch);
  // Consult the asset seam (asset-slots.md): a confirmed venue-icon pack rasterises here; with every
  // slot null today it resolves to 'fallback' and the engraved dingbat glyph is drawn — the shipped
  // look, never load-bearing. Unregistered archetypes skip resolveSlot (it throws on unknown ids).
  const resolved = registered ? resolveSlot(`icon.venue.${arch}`) : ({ kind: 'fallback' } as const);
  const urls = resolved.kind === 'asset' ? [resolved.url] : resolved.kind === 'layers' ? resolved.urls : [];
  let drewAsset = false;
  for (const url of urls) {
    const img = cachedImage(url, requestRedraw);
    if (img) { ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2); drewAsset = true; }
  }
  if (drewAsset) return;
  ctx.fillStyle = ink;
  ctx.font = `${Math.round(r * 1.25)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(VENUE_GLYPHS[arch] ?? '·', cx, cy + r * 0.05);
}

function drawPresence(
  ctx: CanvasRenderingContext2D, view: PlayerView, layout: TownLayout, g: Geometry, pal: Palette,
  access: Map<string, 'public' | 'invitational' | 'private'>,
): void {
  // Presence law: occupantsByVenue is populated ONLY for covered venues — one ink dot per occupant
  // you can currently see, ringed just outside the node.
  ctx.fillStyle = pal.ink;
  for (const [id, occupants] of Object.entries(view.occupantsByVenue)) {
    const p = layout.venues[id];
    if (!p || occupants.length === 0) continue;
    const c = project(g, p.x, p.y);
    const ring = nodeRadius(access.get(id), g) + 5 * g.scale;
    const dotR = 1.6 * g.scale;
    occupants.forEach((_, i) => {
      const a = (Math.PI * 2 * i) / occupants.length - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(c.x + ring * Math.cos(a), c.y + ring * Math.sin(a), dotR, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D, view: PlayerView, layout: TownLayout, g: Geometry, pal: Palette,
  access: Map<string, 'public' | 'invitational' | 'private'>,
): void {
  const venue = view.avatar.venue;
  if (venue === null) return;
  const p = layout.venues[venue];
  if (!p) return;
  const c = project(g, p.x, p.y);
  ctx.lineWidth = 2 * g.scale;
  ctx.strokeStyle = pal.verdigris;
  ctx.beginPath();
  ctx.arc(c.x, c.y, nodeRadius(access.get(venue), g) + 3.5 * g.scale, 0, Math.PI * 2);
  ctx.stroke();
}

function drawInformants(
  ctx: CanvasRenderingContext2D, view: PlayerView, layout: TownLayout, g: Geometry, pal: Palette,
  access: Map<string, 'public' | 'invitational' | 'private'>,
): void {
  ctx.fillStyle = pal.verdigris;
  const perVenue = new Map<string, number>();
  for (const inf of view.informants) {
    const venue = inf.assignedVenue;
    if (venue === null) continue;
    const p = layout.venues[venue];
    if (!p) continue;
    const c = project(g, p.x, p.y);
    const k = perVenue.get(venue) ?? 0;
    perVenue.set(venue, k + 1);
    const ring = nodeRadius(access.get(venue), g) + 3.5 * g.scale;
    const a = -Math.PI / 4 + k * (Math.PI / 6); // fan out multiple informants at one post
    ctx.beginPath();
    ctx.arc(c.x + ring * Math.cos(a), c.y + ring * Math.sin(a), 2.4 * g.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHalo(
  ctx: CanvasRenderingContext2D, layout: TownLayout, g: Geometry, color: string, id: string,
  access: Map<string, 'public' | 'invitational' | 'private'>, dashed: boolean,
): void {
  const p = layout.venues[id];
  if (!p) return;
  const c = project(g, p.x, p.y);
  ctx.save();
  ctx.lineWidth = 1.5 * g.scale;
  ctx.strokeStyle = color;
  // Selection reads by SHAPE (a detached dashed ring), never colour alone (art-direction rule).
  if (dashed) ctx.setLineDash([3 * g.scale, 3 * g.scale]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, nodeRadius(access.get(id), g) + 6 * g.scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function hitTest(view: PlayerView, layout: TownLayout, g: Geometry, px: number, py: number): string | null {
  const access = accessById(view);
  let best: string | null = null;
  let bestD = Infinity;
  for (const [id, p] of Object.entries(layout.venues)) {
    const c = project(g, p.x, p.y);
    const d = Math.hypot(c.x - px, c.y - py);
    const r = nodeRadius(access.get(id), g) + 3 * g.scale;
    if (d <= r && d < bestD) { best = id; bestD = d; }
  }
  return best;
}

function readPalette(el: Element): Palette {
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  const v = (name: string, fb: string) => (cs?.getPropertyValue(name).trim() || fb);
  return {
    paper: v('--paper', '#f3ead8'),
    ink: v('--ink', '#221a12'),
    sepia: v('--sepia', '#7a5c3e'),
    verdigris: v('--verdigris', '#3e6e64'),
    vermilion: v('--vermilion', '#9e2b25'),
    wash: v('--wash', 'rgba(122,92,62,0.08)'),
  };
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
}

function smallCaps(s: string): string {
  return s.toUpperCase();
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
