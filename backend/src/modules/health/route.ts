import { FastifyPluginAsync } from 'fastify';
import { healthCheck } from './controller.js';

/**
 * Health route plugin
 */
export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_, reply) => {
    return healthCheck();
  });
};
