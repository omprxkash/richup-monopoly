import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@richup/shared';
import { registerHandlers } from './socket';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

registerHandlers(io);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// In production, serve the built client and fall back to index.html for the SPA.
const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Richup-Monopoly server listening on http://localhost:${PORT}`);
});
