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
    const { prisma, serverEvents } = fastify; // Get decorated services
    try {
      const { projectId } = await createProject(input);

      // Trigger AI processing for the initial prompt
      processAIResponse(projectId, prisma, serverEvents, undefined)
        .catch(err => fastify.log.error(err, `Background AI processing failed for new project ${projectId}`));

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
    const { prisma, serverEvents, anthropicClient } = fastify; // Get decorated services

    try {
      // addMessage now takes prisma instance
      const { messageId } = await addMessage(id, content, prisma);

      // Centrally trigger AI processing. Do not await, let it run in background.
      processAIResponse(id, prisma, serverEvents, undefined)
        .catch(err => fastify.log.error(err, `Background AI processing failed for project ${id}`));

      // No longer emit `new_message_${id}` from here

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
    const { prisma, serverEvents, buildService } = fastify; // Get decorated services

    // Validate project existence
    try {
      await getProject(projectId); // Uses module-level prisma, ensure this is okay or pass prisma
    } catch (error) {
      reply.code(404).send({ error: 'Project not found for SSE stream' });
      return;
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendEvent = (data: any) => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Handlers for centrally emitted AI events
    const onAiContent = (data: { type: 'content', content: string, projectId: string }) => {
      // fastify.log.info(`SSE onAiContent for project ${data.projectId}. Current stream is for ${projectId}.`);
      if (data.projectId === projectId) sendEvent({ type: 'ai_content', content: data.content });
    };
    const onAiComplete = (data: { type: 'complete', message: any, projectId: string }) => {
      // fastify.log.info(`SSE onAiComplete for project ${data.projectId}. Current stream is for ${projectId}.`);
      if (data.projectId === projectId) sendEvent({ type: 'ai_complete', message: data.message });
    };
    const onAiError = (data: { type: 'error', error: string, projectId: string }) => {
      // fastify.log.error(`SSE onAiError for project ${data.projectId}: ${data.error}. Current stream is for ${projectId}.`);
      if (data.projectId === projectId) sendEvent({ type: 'ai_error', error: data.error });
    };

    // Handler for build events (if/when active)
    const onBuildEvent = (event: any) => {
      if (event.projectId === projectId) { // Ensure event is for this project
        sendEvent({ type: 'build', buildType: event.type, message: event.message });
        if (event.type === 'preview-ready') {
          sendEvent({ type: 'preview-ready', projectId: projectId });
        }
      }
    };

    // Subscribe to project-specific AI events
    serverEvents.on(`ai_content_${projectId}`, onAiContent);
    serverEvents.on(`ai_complete_${projectId}`, onAiComplete);
    serverEvents.on(`ai_error_${projectId}`, onAiError);
    buildService?.on('build', onBuildEvent); // buildService might be undefined if not fully integrated

    // Send existing messages to the client once upon connection
    getProject(projectId)
      .then(projectData => {
        sendEvent({ type: 'historic_messages', messages: projectData.messages });
        sendEvent({ type: 'connected', message: 'SSE connection established and history loaded' });
      })
      .catch(err => {
        fastify.log.error(err, `Error fetching project history for SSE stream ${projectId}`);
        sendEvent({ type: 'error', error: 'Failed to load project history.' });
      });

    // No more processAndListen() or newMessageHandler for `new_message_...`

    // Clean up on client disconnect
    request.raw.on('close', () => {
      serverEvents.removeListener(`ai_content_${projectId}`, onAiContent);
      serverEvents.removeListener(`ai_complete_${projectId}`, onAiComplete);
      serverEvents.removeListener(`ai_error_${projectId}`, onAiError);
      buildService?.removeListener('build', onBuildEvent);
      fastify.log.info(`SSE connection closed for project ${projectId}`);
    });
  });
};
