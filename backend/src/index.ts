import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.join(__dirname, '../../workspace');

const server = Fastify({
  logger: true,
});

// Register plugins
await server.register(cors, {
  origin: true, // Allow all origins in development
});

// Serve static files from workspace for project previews
await server.register(staticPlugin, {
  root: workspacePath,
  prefix: '/preview/',
  decorateReply: false,
});

// Define routes
server.get('/api/health', async () => {
  return { status: 'ok' };
});

// Start the server
const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server is running at http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
