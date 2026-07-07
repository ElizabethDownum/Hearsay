import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSlot, portraitFor, VENUE_GLYPHS } from '../../app/src/assets';

// This test reads assets/manifest.json and assets/LICENSES.md straight off disk (fs), deliberately
// NOT via the app's Vite JSON import — the loader (app/src/assets.ts) and this test are two
// independent readers of the same file, so a loader bug can't hide a schema/license violation.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const assetsDir = path.join(repoRoot, 'assets');

const manifest = JSON.parse(fs.readFileSync(path.join(assetsDir, 'manifest.json'), 'utf8')) as {
  version: number;
  slots: Record<string, string | string[] | null>;
};
const licensesText = fs.readFileSync(path.join(assetsDir, 'LICENSES.md'), 'utf8');

const SLOT_ID_RE = /^(portrait|icon|texture|frame|font|map)\.[a-z-]+(\.[a-z0-9-]+)?$/;

const VENUE_ARCHETYPES = [
  'tavern', 'market', 'chapel', 'workshop', 'well', 'guard-post', 'cathedral',
  'docks', 'safehouse', 'home', 'salon', 'palazzo', 'press',
];

describe('asset manifest — schema (asset-slots.md law)', () => {
  it('version === 1', () => {
    expect(manifest.version).toBe(1);
  });

  it('every slot id matches the registry pattern', () => {
    for (const id of Object.keys(manifest.slots)) {
      expect(id, `slot id '${id}' violates the naming law`).toMatch(SLOT_ID_RE);
    }
  });

  it('every non-null slot path exists on disk under assets/', () => {
    for (const [id, value] of Object.entries(manifest.slots)) {
      if (value === null) continue;
      const paths = Array.isArray(value) ? value : [value];
      for (const p of paths) {
        const abs = path.join(assetsDir, p);
        expect(fs.existsSync(abs), `slot '${id}' -> '${p}' does not exist on disk`).toBe(true);
      }
    }
  });

  it('every icon.venue.* archetype from asset-slots row 2 is present (null) — absence is a diff', () => {
    for (const archetype of VENUE_ARCHETYPES) {
      expect(manifest.slots, `missing icon.venue.${archetype}`).toHaveProperty(`icon.venue.${archetype}`);
    }
  });

  it('portrait.npc.* is present (null) — the registry is explicit', () => {
    const hasPortraitNpcSlot = Object.keys(manifest.slots).some((id) => id.startsWith('portrait.npc.'));
    expect(hasPortraitNpcSlot).toBe(true);
  });
});

/**
 * Local re-implementation of the license gate's rule, exercised against BOTH the real files
 * (today: zero violations, because nothing non-font is wired) and synthetic fixtures (proving the
 * gate actually rejects an unconfirmed pack and accepts a confirmed one). This is the gate's teeth
 * — asset-slots.md rule 5: "unlisted-in-LICENSES.md ⇒ unwired, no exceptions."
 */
function licenseGateViolations(slots: Record<string, string | string[] | null>, licenses: string): string[] {
  const lines = licenses.split('\n');
  const bad: string[] = [];
  for (const [id, value] of Object.entries(slots)) {
    if (value === null) continue;
    const paths = Array.isArray(value) ? value : [value];
    for (const p of paths) {
      // OFL fonts are pre-cleared, never bought — but ONLY the font.* slot family gets this
      // exemption. Gating on path prefix alone would let a non-font id smuggle an asset in by
      // pointing its path at fonts/ (e.g. "icon.ui.rumor": "fonts/smuggled.png"); both the id
      // family AND the path must agree before we skip the CONFIRMED check.
      if (id.startsWith('font.') && p.startsWith('fonts/')) continue;
      const packDir = p.split('/')[0]!;
      // A pack row is CONFIRMED only if some line naming this pack dir also says CONFIRMED —
      // per-line, not "anywhere in the file", so one pack's TBD row can't be shadowed by another
      // pack's CONFIRMED row.
      const confirmed = lines.some((line) => line.includes(packDir) && /\bCONFIRMED\b/.test(line));
      if (!confirmed) bad.push(id);
    }
  }
  return bad;
}

describe('license gate has real teeth (assets/LICENSES.md)', () => {
  it('today: the real manifest has zero non-font non-null slots, so zero violations', () => {
    expect(licenseGateViolations(manifest.slots, licensesText)).toEqual([]);
  });

  it('teeth: a hypothetical slot pointing at a still-TBD pack (per the REAL LICENSES.md) is rejected', () => {
    const hypothetical = { 'texture.paper.board': 'wenrexa-uiarmy/PreviewMap.png' };
    expect(licenseGateViolations(hypothetical, licensesText)).toEqual(['texture.paper.board']);
  });

  it('teeth: a slot whose pack row reads CONFIRMED is accepted', () => {
    const confirmedLicenses = `${licensesText}\n| \`assets/testpack/\` | some-pack | Some Artist | CONFIRMED (order #999) |\n`;
    const hypothetical = { 'icon.ui.coin': 'testpack/Coin.png' };
    expect(licenseGateViolations(hypothetical, confirmedLicenses)).toEqual([]);
  });

  it('teeth: a non-font id smuggling a path under fonts/ is NOT exempt — path prefix alone is not enough', () => {
    const smuggled = { 'icon.ui.rumor': 'fonts/smuggled.png' };
    expect(licenseGateViolations(smuggled, licensesText)).toEqual(['icon.ui.rumor']);
  });

  it('every wired (non-null) font slot really is under fonts/', () => {
    for (const [id, value] of Object.entries(manifest.slots)) {
      if (value === null || Array.isArray(value)) continue;
      if (id.startsWith('font.')) expect(value.startsWith('fonts/'), id).toBe(true);
    }
  });
});

describe('resolveSlot', () => {
  it('returns fallback for a registered-but-null slot', () => {
    expect(resolveSlot('texture.paper.board')).toEqual({ kind: 'fallback' });
  });

  it('returns an asset for a wired slot', () => {
    expect(resolveSlot('font.display')).toEqual({ kind: 'asset', url: 'fonts/Cinzel-Regular.woff2' });
  });

  it('throws (loudly) on an unregistered id — no ad-hoc slots', () => {
    expect(() => resolveSlot('icon.ui.some-slot-nobody-registered')).toThrow();
    expect(() => resolveSlot('not-even-a-real-family.nope')).toThrow();
  });
});

describe('portraitFor', () => {
  it('is deterministic: same (npcId, worldSeed) => byte-identical result, every call', () => {
    const a = portraitFor('mara', 'seed-1');
    const b = portraitFor('mara', 'seed-1');
    expect(b).toEqual(a);
  });

  it('is seed-sensitive: differs (in general) across worldSeeds for a fixed npc', () => {
    const results = new Set(
      ['seed-a', 'seed-b', 'seed-c', 'seed-d'].map((s) => JSON.stringify(portraitFor('mara', s))),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('falls back to initials today (the portrait pool is empty)', () => {
    const r = portraitFor('mara', 'seed-1');
    expect(r.kind).toBe('initials');
  });

  it('initials fallback has the documented shape: short uppercase initials + numeric districtHue', () => {
    const r = portraitFor('mara-baker', 'seed-1') as { kind: 'initials'; initials: string; districtHue: number };
    expect(r.kind).toBe('initials');
    expect(r.initials).toMatch(/^[A-Z]{1,2}$/);
    expect(Number.isInteger(r.districtHue)).toBe(true);
    expect(r.districtHue).toBeGreaterThanOrEqual(0);
    expect(r.districtHue).toBeLessThan(360);
  });
});

describe('VENUE_GLYPHS — unicode fallback covers all 13 venue archetypes (asset-slots row 2)', () => {
  it('has exactly the 13 registered archetypes', () => {
    expect(Object.keys(VENUE_GLYPHS).sort()).toEqual([...VENUE_ARCHETYPES].sort());
  });

  it('every glyph is a single non-empty character', () => {
    for (const [id, glyph] of Object.entries(VENUE_GLYPHS)) {
      expect(glyph.length, `${id} glyph should be one visible character`).toBeGreaterThan(0);
    }
  });

  it('matches the brief exactly', () => {
    expect(VENUE_GLYPHS).toEqual({
      tavern: '❦', market: '⚖', chapel: '✝', workshop: '⚒', well: '◉',
      'guard-post': '⛨', cathedral: '✚', docks: '⚓', safehouse: '⌂', home: '▪',
      salon: '❧', palazzo: '♛', press: '✒',
    });
  });
});
