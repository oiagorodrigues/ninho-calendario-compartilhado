import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'node:fs';
import { createApp } from './app.ts';
import { openDatabase } from './db.ts';

const port = Number(process.env.NINHO_PORT ?? 8787);
const isProduction = process.env.NODE_ENV === 'production';
const publicUrl = (process.env.NINHO_PUBLIC_URL ?? (isProduction ? `http://localhost:${port}` : 'http://localhost:5173')).replace(/\/$/, '');
const db = openDatabase(process.env.NINHO_DB ?? './data/ninho.db');

const authAttemptLimit = process.env.NINHO_AUTH_ATTEMPT_LIMIT === undefined ? undefined : Number(process.env.NINHO_AUTH_ATTEMPT_LIMIT);
const app = createApp({ db, publicUrl, isSecureCookie: publicUrl.startsWith('https://'), authAttemptLimit });

if (isProduction) {
  const indexHtml = readFileSync('./dist/web/index.html', 'utf8');
  app.use('/*', serveStatic({ root: './dist/web' }));
  app.get('*', (c) => (c.req.path.startsWith('/api/') ? c.notFound() : c.html(indexHtml)));
}

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(JSON.stringify({ level: 'info', msg: 'listening', port: info.port, publicUrl }));
});

function shutdown(): void {
  server.close();
  db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
