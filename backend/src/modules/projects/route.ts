import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createProject, getProject, addMessage, processAIResponse, handleBuildEvents } from './controller.js';
import { CreateProjectInput, createProjectSchema } from './schema.js';

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
      body: {
        type: 'object',
        required: ['initialPrompt'],
        properties: {
          initialPrompt: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const input = request.body as CreateProjectInput;
    const result = await createProject(input);

    // Set up SSE for AI response
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Process AI response and stream to client
    const anthropicClient = fastify.anthropicClient;
    const buildService = fastify.buildService;

    // Handle message events from Anthropic
    const onMessage = (event: any) => {
      if (event.type === 'content' && event.content) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: event.content })}\n\n`);
      } else if (event.type === 'error') {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`);
        reply.raw.end();
      } else if (event.type === 'complete') {
        // Save the assistant message to the database
        fastify.prisma.message.create({
          data: {
            projectId: result.projectId,
            role: 'assistant',
            content: event.content || '',
          }
        }).then(() => {
          // Parse and apply edits
          if (event.content) {
            const edits = buildService.parseEdits(event.content);
            if (edits.length > 0) {
              return buildService.applyEdits(result.projectId, edits);
            }
          }
        }).catch(error => {
          console.error('Error saving assistant message:', error);
        });
      }
    };

    // Handle build events
    const onBuild = (event: any) => {
      reply.raw.write(`data: ${JSON.stringify({
        type: 'build',
        buildType: event.type,
        message: event.message
      })}\n\n`);

      if (event.type === 'preview-ready' || event.type === 'error') {
        // End the SSE stream after build completes or errors
        anthropicClient.removeListener('message', onMessage);
        buildService.removeListener('build', onBuild);
        reply.raw.end();
      }
    };

    // Register event listeners
    anthropicClient.on('message', onMessage);
    buildService.on('build', onBuild);

    // Handle client disconnect
    request.raw.on('close', () => {
      anthropicClient.removeListener('message', onMessage);
      buildService.removeListener('build', onBuild);
    });

    // Process the initial prompt
    await processAIResponse(result.projectId);
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
  fastify.post('/:id/messages', async (request: FastifyRequest<{
    Params: MessageParams;
    Body: MessageBody;
  }>, reply) => {
    const { id } = request.params;
    const { content } = request.body;

    try {
      // Set up SSE for AI response
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Add user message
      await addMessage(id, content);

      // Process AI response and stream to client
      const anthropicClient = fastify.anthropicClient;
      const buildService = fastify.buildService;

      // Handle message events from Anthropic
      const onMessage = (event: any) => {
        if (event.type === 'content' && event.content) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: event.content })}\n\n`);
        } else if (event.type === 'error') {
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`);
          reply.raw.end();
        } else if (event.type === 'complete') {
          // Save the assistant message to the database
          fastify.prisma.message.create({
            data: {
              projectId: id,
              role: 'assistant',
              content: event.content || '',
            }
          }).then(() => {
            // Parse and apply edits
            if (event.content) {
              const edits = buildService.parseEdits(event.content);
              if (edits.length > 0) {
                return buildService.applyEdits(id, edits);
              }
            }
          }).catch(error => {
            console.error('Error saving assistant message:', error);
          });
        }
      };

      // Handle build events
      const onBuild = (event: any) => {
        if (event.projectId === id) {
          reply.raw.write(`data: ${JSON.stringify({
            type: 'build',
            buildType: event.type,
            message: event.message
          })}\n\n`);

          if (event.type === 'preview-ready' || event.type === 'error') {
            // End the SSE stream after build completes or errors
            anthropicClient.removeListener('message', onMessage);
            buildService.removeListener('build', onBuild);
            reply.raw.end();
          }
        }
      };

      // Register event listeners
      anthropicClient.on('message', onMessage);
      buildService.on('build', onBuild);

      // Handle client disconnect
      request.raw.on('close', () => {
        anthropicClient.removeListener('message', onMessage);
        buildService.removeListener('build', onBuild);
      });

      // Process the message
      await processAIResponse(id);
    } catch (error) {
      reply.code(404).send({ error: `Project not found: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
};
