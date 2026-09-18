import { configDefaults, defineConfig } from 'vitest/config';
// R35: `.superpowers/**` holds review evidence and reviewer probe tests (not under node_modules),
// which vitest's default exclude does not cover. It is never part of the shipped suite.
export default defineConfig({ test: { globals: true, exclude: [...configDefaults.exclude, '.superpowers/**'] } });
