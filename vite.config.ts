import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  // The three OFL font families (theme.css @font-face, docs/art-direction.md Typography) live at
  // the repo-level assets/fonts/ — a sibling of the app root, not a descendant of it. Vite's static
  // asset pipeline (relative CSS url()/JS `?url` imports) DOES resolve files outside root correctly,
  // but plain <link href> references in index.html do NOT get rewritten by Vite's dev middleware for
  // a normal "/" request (only build-time HTML processing rewrites those) — a static relative
  // `../assets/fonts/...` preload href works in the built app but 404s (silently, via the SPA
  // fallback) in `npm run app:dev`. Scoping `publicDir` to fonts/ ONLY (never the whole assets/
  // tree, which also holds unconfirmed-license art packs per assets/LICENSES.md) serves the fonts at
  // stable root-absolute paths in both dev and build, so theme.css and index.html can both just say
  // `/Cinzel-Regular.woff2` etc. Verified: dev server serves the real font bytes at that path, and
  // `vite build` copies the font files (OFL fonts + their license .txt) verbatim into dist/.
  publicDir: '../assets/fonts',
});
