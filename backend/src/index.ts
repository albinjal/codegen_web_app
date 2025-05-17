import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { BuildService } from './services/build-service.js';
import { AnthropicClient } from './services/anthropic-client.js';
import 'dotenv/config';

// Initialize services
const prisma = new PrismaClient();
const buildService = new BuildService();
const anthropicClient = new AnthropicClient();

// Setup file paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const workspacePath = join(__dirname, '../../workspace');

// Initialize Fastify server
const server = Fastify({
  logger: true,
});

// Define route schemas
const createProjectSchema = z.object({
  initialPrompt: z.string().min(1),
});

const createMessageSchema = z.object({
  content: z.string().min(1),
});

// Setup server
async function setup() {
  // Register plugins
  await server.register(fastifyCors, {
    origin: true, // Allow all origins in development
  });

  // Serve static files from workspace for project previews
  await server.register(fastifyStatic, {
    root: workspacePath,
    prefix: '/preview/',
    decorateReply: false,
  });

  // Set up build service event handling
  buildService.on('build', (event) => {
    server.log.info(`Build event: ${event.type} for project ${event.projectId}`, event);
  });

  // Health check route
  server.get('/api/health', async () => {
    return { status: 'ok' };
  });

  // Create a new project
  server.post('/api/projects', async (request, reply) => {
    const body = createProjectSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    // Set up Server-Sent Events for streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    try {
      // Create a new project in the database
      const project = await prisma.project.create({
        data: {
          messages: {
            create: {
              role: 'user',
              content: body.data.initialPrompt,
            },
          },
        },
        include: {
          messages: true,
        },
      });

      // Send project ID to client
      reply.raw.write(`data: ${JSON.stringify({ type: 'project-created', projectId: project.id })}\n\n`);

      // Set up workspace for the project
      try {
        await buildService.createProject(project.id);

        // Listen for build events
        const buildListener = (event) => {
          if (event.projectId === project.id) {
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        };

        buildService.on('build', buildListener);

        // Process message with Anthropic
        const formattedPrompt = anthropicClient.formatPrompt(body.data.initialPrompt);

        // Set up message listener for streaming response
        const messageListener = (event) => {
          if (event.type === 'content' && event.content) {
            reply.raw.write(`data: ${JSON.stringify({
              type: 'assistant-message',
              content: event.content
            })}\n\n`);
          } else if (event.type === 'complete' && event.content) {
            // Save assistant message in database
            prisma.message.create({
              data: {
                projectId: project.id,
                role: 'assistant',
                content: event.content,
              },
            }).catch(error => {
              server.log.error('Error saving assistant message:', error);
            });

            // Check for code edits
            const edits = buildService.parseEdits(event.content);

            if (edits.length > 0) {
              buildService.applyEdits(project.id, edits).catch(error => {
                server.log.error('Error applying edits:', error);
                reply.raw.write(`data: ${JSON.stringify({
                  type: 'error',
                  message: 'Failed to apply code edits'
                })}\n\n`);
              });
            }
          } else if (event.type === 'error') {
            reply.raw.write(`data: ${JSON.stringify({
              type: 'error',
              message: event.error || 'Unknown error'
            })}\n\n`);
          }
        };

        anthropicClient.on('message', messageListener);

        // Start streaming the AI response
        await anthropicClient.streamMessage([
          { role: 'user', content: formattedPrompt }
        ]);

        // Clean up event listeners
        anthropicClient.removeListener('message', messageListener);
        buildService.removeListener('build', buildListener);

        // Send "complete" event when done processing
        reply.raw.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      } catch (error) {
        server.log.error('Error setting up project:', error);
        reply.raw.write(`data: ${JSON.stringify({
          type: 'error',
          message: 'Failed to set up project workspace'
        })}\n\n`);
      }

      reply.raw.end();
    } catch (error) {
      server.log.error(error);
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to create project' })}\n\n`);
      reply.raw.end();
    }
  });

  // Get project details
  server.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      return project;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch project' });
    }
  });

  // Add a new message to a project
  server.post('/api/projects/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = createMessageSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    // Set up Server-Sent Events for streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    try {
      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!project) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Project not found' })}\n\n`);
        reply.raw.end();
        return;
      }

      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          projectId: id,
          role: 'user',
          content: body.data.content,
        },
      });

      // Send acknowledgment to client
      reply.raw.write(`data: ${JSON.stringify({ type: 'message-received' })}\n\n`);

      // Listen for build events
      const buildListener = (event) => {
        if (event.projectId === id) {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      };

      buildService.on('build', buildListener);

      // Format message history for Anthropic
      const messages = project.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Add the new user message
      messages.push({
        role: 'user',
        content: body.data.content,
      });

      // Set up message listener for streaming response
      const messageListener = (event) => {
        if (event.type === 'content' && event.content) {
          reply.raw.write(`data: ${JSON.stringify({
            type: 'assistant-message',
            content: event.content
          })}\n\n`);
        } else if (event.type === 'complete' && event.content) {
          // Save assistant message in database
          prisma.message.create({
            data: {
              projectId: id,
              role: 'assistant',
              content: event.content,
            },
          }).catch(error => {
            server.log.error('Error saving assistant message:', error);
          });

          // Check for code edits
          const edits = buildService.parseEdits(event.content);

          if (edits.length > 0) {
            buildService.applyEdits(id, edits).catch(error => {
              server.log.error('Error applying edits:', error);
              reply.raw.write(`data: ${JSON.stringify({
                type: 'error',
                message: 'Failed to apply code edits'
              })}\n\n`);
            });
          }
        } else if (event.type === 'error') {
          reply.raw.write(`data: ${JSON.stringify({
            type: 'error',
            message: event.error || 'Unknown error'
          })}\n\n`);
        }
      };

      anthropicClient.on('message', messageListener);

      // Start streaming the AI response
      await anthropicClient.streamMessage(messages);

      // Clean up event listeners
      anthropicClient.removeListener('message', messageListener);
      buildService.removeListener('build', buildListener);

      // Send "complete" event when done processing
      reply.raw.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      reply.raw.end();
    } catch (error) {
      server.log.error(error);
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`);
      reply.raw.end();
    }
  });
}

// Start the server
async function start() {
  try {
    await setup();
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server is running at http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
