import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/sanguo-zizhen/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
}));
