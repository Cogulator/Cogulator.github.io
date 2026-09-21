import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: 'src',
  resolve: { preserveSymlinks: true },
  // The linked engine changes without a lockfile update; rebuild its cached bundle on startup.
  optimizeDeps: { include: ['@cogulator/modeling-engine'], force: true },
  build: {
    outDir: '../dist',
    assetsDir: 'scenario-assets',
    emptyOutDir: true,
  },
});
