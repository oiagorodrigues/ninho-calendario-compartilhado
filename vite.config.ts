import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

const apiPort = Number(process.env.NINHO_PORT ?? 8787);

export default defineConfig({
  root: fileURLToPath(new URL('./src/web', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('./dist/web', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: false },
      '/ics': { target: `http://localhost:${apiPort}`, changeOrigin: false },
    },
  },
});
