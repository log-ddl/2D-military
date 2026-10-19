import { defineConfig } from 'vite';
import path from 'node:path';
import { studioApiPlugin } from './server/routes.ts';
import { projectAssets } from './server/assets.ts';
const repoRoot = path.resolve(import.meta.dirname, '..');
export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [projectAssets(), studioApiPlugin()],
  server: { port: 5173, strictPort: false, hmr: process.env.PDOOM_NO_HMR ? false : undefined, fs: { allow: [repoRoot] } },
  resolve: { alias: {
    '@root': repoRoot,
    '@engine': path.resolve(import.meta.dirname, 'src/engine'),
    '@library': path.resolve(import.meta.dirname, 'src/library'),
    // Projects live outside app/, but share its installed dependencies.
    'three': path.resolve(import.meta.dirname, 'node_modules/three'),
    'gsap': path.resolve(import.meta.dirname, 'node_modules/gsap'),
  } },
  build: { target: 'esnext', assetsInlineLimit: 0 },
});
