import { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from '../modules/health/index.js';
import { projectRoutes } from '../modules/projects/index.js';

/**
 * Main router plugin that registers all route modules
 */
export const router: FastifyPluginAsync = async (fastify) => {
  // Register all API routes with /api prefix
  fastify.register(async (api) => {
    // Health routes
    api.register(healthRoutes);

    // Project routes
    api.register(projectRoutes, { prefix: '/projects' });

    // TODO: Register other route modules as they are implemented
    // Example:
    // api.register(projectRoutes, { prefix: '/projects' });
    // api.register(messageRoutes, { prefix: '/messages' });
  }, { prefix: '/api' });
};
