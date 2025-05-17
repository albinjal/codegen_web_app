import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { env } from '../config/env.js';
import { router } from '../routes/index.js';
import { BuildService } from '../services/build/index.js';
import { AnthropicClient } from '../services/anthropic/index.js';
import { getPrismaClient } from './database.js';

// Extend Fastify types to include our service decorators
declare module 'fastify' {
  interface FastifyInstance {
    buildService: BuildService;
    anthropicClient: AnthropicClient;
    prisma: ReturnType<typeof getPrismaClient>;
  }
}

/**
 * Creates and configures a Fastify server instance
 */
export function createServer(): FastifyInstance {
  // Initialize Fastify server
  const server = Fastify({
    logger: true,
  });

  return server;
}

/**
 * Registers all plugins and routes for the server
 */
export async function setupServer(server: FastifyInstance): Promise<void> {
  // Register CORS
  await server.register(fastifyCors, {
    origin: true, // Allow all origins in development
  });

  // Serve static files from workspace for project previews
  await server.register(fastifyStatic, {
    root: join(process.cwd(), env.WORKSPACE_DIR),
    prefix: '/preview/',
    decorateReply: false,
  });

  // Add service instances as decorators
  server.decorate('buildService', new BuildService());
  server.decorate('anthropicClient', new AnthropicClient());
  server.decorate('prisma', getPrismaClient());

  // Register all routes
  await server.register(router);
}

/**
 * Starts the server
 */
export async function startServer(server: FastifyInstance): Promise<void> {
  try {
    await server.listen({
      port: env.PORT,
      host: env.HOST
    });
    server.log.info(`Server listening on ${env.HOST}:${env.PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

/**
 * Stops the server
 */
export async function stopServer(server: FastifyInstance): Promise<void> {
  try {
    await server.close();
    server.log.info('Server stopped');
  } catch (error) {
    server.log.error('Error stopping server:', error);
    process.exit(1);
  }
}
