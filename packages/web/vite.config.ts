import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  envDir: '..',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        games: resolve(__dirname, 'src/games.html'),
        stats: resolve(__dirname, 'src/stats.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
