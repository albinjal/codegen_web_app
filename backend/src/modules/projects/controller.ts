/**
 * Projects module controller
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../core/database.js';
import { BuildService } from '../../services/build/index.js';
import { AnthropicClient, AnthropicMessageEvent } from '../../services/anthropic/index.js';
import { CreateProjectInput, ProjectOutput } from './schema.js';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';
import { BuildEvent } from '../../types.js';

// Get instances of required services
const prismaClient = getPrismaClient();
const buildService = new BuildService();
const globalAnthropicClient = new AnthropicClient();

/**
 * Creates a new project with the initial prompt
 */
export async function createProject(input: CreateProjectInput): Promise<{ projectId: string }> {
  // Create the project in the database
  const project = await prismaClient.project.create({
    data: {}
  });

  // Create the initial message
  await prismaClient.message.create({
    data: {
      projectId: project.id,
      role: 'user',
      content: input.initialPrompt,
    }
  });

  // Create the project workspace
  await buildService.createProject(project.id);

  return { projectId: project.id };
}

/**
 * Retrieves all projects
 */
export async function listProjects(): Promise<ProjectOutput[]> {
  const projects = await prismaClient.project.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }, // Optional: order messages if needed for display
        take: 1 // Optional: only take the first message as a preview or title
      }
    },
    orderBy: {
      createdAt: 'desc' // Show newest projects first
    }
  });

  return projects.map(project => ({
    id: project.id,
    createdAt: project.createdAt,
    // Map messages, ensuring the role is correctly typed
    messages: project.messages.map(msg => ({
      id: msg.id,
      projectId: msg.projectId,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.createdAt
    }))
    // You might want to add a name or title to the project model later
    // and include it here if you fetch it.
  }));
}

/**
 * Retrieves a project by its ID
 */
export async function getProject(projectId: string): Promise<ProjectOutput> {
  const project = await prismaClient.project.findUnique({
    where: { id: projectId },
    include: {
      messages: true
    }
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  // Transform the response to match the expected schema
  return {
    id: project.id,
    createdAt: project.createdAt,
    messages: project.messages.map(msg => ({
      id: msg.id,
      projectId: msg.projectId,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.createdAt
    }))
  };
}

/**
 * Adds a new user message to a project.
 * This function NO LONGER triggers AI response.
 */
export async function addMessage(
  projectId: string,
  content: string,
  prismaInstance: PrismaClient
): Promise<{ messageId: string }> {
  // Check if project exists
  const project = await prismaInstance.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  // Create the user message
  const message = await prismaInstance.message.create({
    data: {
      projectId,
      role: 'user',
      content,
    }
  });

  return { messageId: message.id };
}

/**
 * Process AI response for a project.
 * This function is now called centrally after a new message is added.
 * It creates its own Anthropic client for the operation and emits project-specific events.
 */
export async function processAIResponse(
  projectId: string,
  prismaInstance: PrismaClient,
  serverEvents: EventEmitter,
  anthropicApiKey: string | undefined
): Promise<void> {
  const localAnthropicClient = new AnthropicClient(anthropicApiKey || env.ANTHROPIC_API_KEY);

  // Setup listeners for this specific Anthropic call
  localAnthropicClient.on('message', (event: AnthropicMessageEvent) => {
    if (event.type === 'content' && event.content) {
      serverEvents.emit(`ai_content_${projectId}`, { type: 'content', content: event.content, projectId });
    } else if (event.type === 'error') {
      console.error(`Anthropic error for project ${projectId}:`, event.error);
      serverEvents.emit(`ai_error_${projectId}`, { type: 'error', error: event.error, projectId });
    } else if (event.type === 'complete') {
      if (event.content) {
        prismaInstance.message.create({
          data: {
            projectId: projectId,
            role: 'assistant',
            content: event.content,
          }
        }).then(savedMessage => {
          serverEvents.emit(`ai_complete_${projectId}`, { type: 'complete', message: savedMessage, projectId });
        }).catch(dbError => {
          console.error(`Failed to save assistant message for project ${projectId}:`, dbError);
          serverEvents.emit(`ai_error_${projectId}`, { type: 'error', error: 'Failed to save assistant message.', projectId });
        });
      } else {
        // Handle cases where completion might be empty but still signifies end
        serverEvents.emit(`ai_complete_${projectId}`, { type: 'complete', message: null, projectId });
      }
    }
  });

  // Get all messages for the project
  const messages = await prismaInstance.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });

  if (messages.length === 0) {
    console.warn(`No messages found for project ${projectId}, skipping AI response.`);
    return;
  }

  // Format messages for Anthropic API
  const formattedMessages = messages.map((msg, index) => {
    // The detailed system prompt with file context is now handled by AnthropicClient.streamMessage
    // No need to call formatPrompt here.
    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content // Pass raw content
    };
  });

  try {
    // Stream the AI response using the local client instance
    // streamMessage is async and will resolve when the stream is fully processed by its internal loop.
    await localAnthropicClient.streamMessage(projectId, formattedMessages); // Pass projectId as the first argument
  } catch (error) {
    console.error(`Error calling localAnthropicClient.streamMessage for project ${projectId}:`, error);
    serverEvents.emit(`ai_error_${projectId}`, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Anthropic stream initiation failed',
      projectId
    });
  }
}

/**
 * Handles build events for a project
 */
export function handleBuildEvents(projectId: string, callback: (event: BuildEvent) => void): void {
  buildService.on('build', (event: BuildEvent) => { // Assuming BuildService emits typed events
    if (event.projectId === projectId) {
      callback(event);
    }
  });
  // Placeholder if BuildService is not active or its event structure is unknown
  // console.warn('handleBuildEvents is a placeholder as BuildService integration might be incomplete.');
}
