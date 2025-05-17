/**
 * Projects module controller
 */
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../core/database.js';
import { BuildService } from '../../services/build/index.js';
import { AnthropicClient } from '../../services/anthropic/index.js';
import { CreateProjectInput, ProjectOutput } from './schema.js';

// Get instances of required services
const prisma = getPrismaClient();
const buildService = new BuildService();
const anthropicClient = new AnthropicClient();

/**
 * Creates a new project with the initial prompt
 */
export async function createProject(input: CreateProjectInput): Promise<{ projectId: string }> {
  // Create the project in the database
  const project = await prisma.project.create({
    data: {}
  });

  // Create the initial message
  await prisma.message.create({
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
 * Retrieves a project by its ID
 */
export async function getProject(projectId: string): Promise<ProjectOutput> {
  const project = await prisma.project.findUnique({
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
 * Adds a new message to a project and processes AI response
 */
export async function addMessage(projectId: string, content: string): Promise<{ messageId: string }> {
  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }

  // Create the user message
  const message = await prisma.message.create({
    data: {
      projectId,
      role: 'user',
      content,
    }
  });

  return { messageId: message.id };
}

/**
 * Process AI response for a project
 */
export async function processAIResponse(projectId: string): Promise<void> {
  // Get all messages for the project
  const messages = await prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });

  // Format messages for Anthropic API
  const formattedMessages = messages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }));

  // Stream the AI response
  anthropicClient.streamMessage(formattedMessages);
}

/**
 * Handles build events for a project
 */
export function handleBuildEvents(projectId: string, callback: (event: any) => void): void {
  buildService.on('build', (event) => {
    if (event.projectId === projectId) {
      callback(event);
    }
  });
}

/**
 * Apply AI-generated edits to a project
 */
export async function applyEdits(projectId: string, content: string): Promise<void> {
  // Parse edits from the AI response
  const edits = buildService.parseEdits(content);

  if (edits.length === 0) {
    return;
  }

  // Apply edits to the project
  await buildService.applyEdits(projectId, edits);
}
