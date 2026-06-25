import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';

// Vite plugin that adds a GET /api/hello mock endpoint on the dev server.
// Shape matches HelloMessage so the LiveHelloClient can fetch it without
// any change to the seam contract. source='live' proves the live path works.
function helloApiPlugin(): Plugin {
  return {
    name: 'hello-api',
    configureServer(server) {
      server.middlewares.use('/api/hello', (_req, res) => {
        const body = JSON.stringify({
          message: 'Hello from the Vite dev-server middleware — live path confirmed.',
          timestamp: new Date().toISOString(),
          source: 'live',
        });
        res.setHeader('Content-Type', 'application/json');
        res.end(body);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), helloApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
