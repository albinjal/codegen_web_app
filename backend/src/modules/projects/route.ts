import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createProject, getProject, addMessage, processAIResponse, handleBuildEvents, listProjects } from './controller.js';
import { CreateProjectInput, createProjectSchema } from './schema.js';
import { z } from 'zod';

interface MessageParams {
  id: string;
}

interface MessageBody {
  content: string;
}

/**
 * Projects route plugin
 */
export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // Create a new project
  fastify.post('/', {
    schema: {
      body: createProjectSchema
    }
  }, async (request, reply) => {
    const input = request.body as CreateProjectInput;
    try {
      const { projectId } = await createProject(input);

      reply.code(201).send({ projectId });
    } catch (error) {
      fastify.log.error(error, 'Error creating project');
      reply.code(500).send({ error: 'Failed to create project' });
    }
  });

  // Get all projects
  fastify.get('/', async (request, reply) => {
    try {
      const projects = await listProjects();
      return projects;
    } catch (error) {
      fastify.log.error(error, 'Error fetching projects');
      reply.code(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // Get a project by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const project = await getProject(id);
      return project;
    } catch (error) {
      reply.code(404).send({ error: `Project not found: ${error instanceof Error ? error.message : String(error)}` });
    }
  });

  // Add a message to a project
  fastify.post('/:id/messages', {
    schema: {
      params: z.object({ id: z.string() }),
      body: z.object({ content: z.string().min(1) })
    }
  }, async (request: FastifyRequest<{
    Params: MessageParams;
    Body: MessageBody;
  }>, reply) => {
    const { id } = request.params;
    const { content } = request.body;

    try {
      const { messageId } = await addMessage(id, content);

      // Notify active stream for this project ID if possible (e.g., via an event emitter or pub/sub for this projectId)
      // This is an advanced feature for instant updates on all connected clients.
      // For a simpler model, the client might just re-fetch or the stream might periodically check.
      // Or, the call to processAIResponse in the stream endpoint will pick up the new message.
      fastify.serverEvents?.emit(`new_message_${id}`); // Emit an event that the stream can listen to

      reply.code(201).send({ messageId });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({ error: error.message });
      } else {
        fastify.log.error(error, `Error adding message to project ${id}`);
        reply.code(500).send({ error: 'Failed to add message' });
      }
    }
  });

  // SSE Stream endpoint for a project
  fastify.get('/:id/stream', async (request: FastifyRequest<{ Params: MessageParams }>, reply) => {
    const { id: projectId } = request.params;

    // Validate project existence
    const project = await getProject(projectId); // Using existing controller function
    if (!project) {
      reply.code(404).send({ error: 'Project not found for SSE stream' });
      return;
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendEvent = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const anthropicClient = fastify.anthropicClient;
    const buildService = fastify.buildService;
    const prisma = fastify.prisma; // Get prisma from fastify instance

    // Handler for Anthropic messages
    const onAnthropicMessage = (event: any) => {
      if (event.type === 'content' && event.content) {
        sendEvent({ type: 'content', content: event.content });
      } else if (event.type === 'error') {
        sendEvent({ type: 'error', error: event.error });
        // Consider whether to close the stream on certain errors
      } else if (event.type === 'complete') {
        if (event.content) { // Save the complete assistant message
          prisma.message.create({
            data: {
              projectId: projectId,
              role: 'assistant',
              content: event.content,
            }
          }).catch(dbError => fastify.log.error(dbError, 'Failed to save assistant message from SSE'));
        }
        sendEvent({ type: 'complete', content: event.content });
      }
    };

    // Handler for build events
    const onBuildEvent = (event: any) => {
      if (event.projectId === projectId) { // Ensure event is for this project
        sendEvent({ type: 'build', buildType: event.type, message: event.message });
        if (event.type === 'preview-ready') {
          sendEvent({ type: 'preview-ready', projectId: projectId }); // Explicit preview-ready event
        }
      }
    };

    // Function to process AI and attach listeners
    const processAndListen = async () => {
      // Detach old listeners if any (important for re-calls if using serverEvents)
      anthropicClient.removeListener('message', onAnthropicMessage);
      buildService.removeListener('build', onBuildEvent);

      // Attach listeners
      anthropicClient.on('message', onAnthropicMessage);
      buildService.on('build', onBuildEvent);

      await processAIResponse(projectId); // This fetches messages and calls Anthropic
    };

    // Initial processing when client connects
    processAndListen();
    sendEvent({ type: 'connected', message: 'SSE connection established' });

    // If using an event emitter for new messages on this project
    const newMessageHandler = () => {
      fastify.log.info(`SSE stream for ${projectId} detected new message, re-processing AI.`);
      processAndListen(); // Re-process AI when a new message is posted
    };
    fastify.serverEvents?.on(`new_message_${projectId}`, newMessageHandler);

    // Clean up on client disconnect
    request.raw.on('close', () => {
      anthropicClient.removeListener('message', onAnthropicMessage);
      buildService.removeListener('build', onBuildEvent);
      fastify.serverEvents?.removeListener(`new_message_${projectId}`, newMessageHandler);
      fastify.log.info(`SSE connection closed for project ${projectId}`);
    });
  });
};
