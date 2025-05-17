/**
 * Projects module controller
 */
import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../core/database.js';
// import { BuildService } from '../../services/build/index.js'; // Commented out if BuildService is not ready/used yet
import { AnthropicClient } from '../../services/anthropic/index.js';
import { CreateProjectInput, ProjectOutput } from './schema.js';

// Get instances of required services
const prisma = getPrismaClient();
// const buildService = new BuildService(); // Commented out if BuildService is not ready/used yet
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
  // await buildService.createProject(project.id); // Commented out if BuildService is not ready

  return { projectId: project.id };
}

/**
 * Retrieves all projects
 */
export async function listProjects(): Promise<ProjectOutput[]> {
  const projects = await prisma.project.findMany({
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

  if (messages.length === 0) {
    console.warn(`No messages found for project ${projectId}, skipping AI response.`);
    return;
  }

  // Format messages for Anthropic API
  const formattedMessages = messages.map((msg, index) => {
    let currentContent = msg.content;
    // Check if it's the last message and if it's a user message
    if (index === messages.length - 1 && msg.role === 'user') {
      // The formatPrompt method already includes the necessary system-level instructions
      currentContent = anthropicClient.formatPrompt(msg.content);
    }
    return {
      role: msg.role as 'user' | 'assistant',
      content: currentContent
    };
  });

  // Stream the AI response. The system prompt is effectively embedded in the last user message.
  anthropicClient.streamMessage(formattedMessages);
}

export interface BuildEvent {
  type: string; // e.g., 'start', 'progress', 'preview-ready', 'error'
  projectId: string;
  message?: string;
  // Add other relevant event properties if known
}

/**
 * Handles build events for a project
 */
export function handleBuildEvents(projectId: string, callback: (event: BuildEvent) => void): void {
  // buildService.on('build', (event: BuildEvent) => { // Assuming BuildService emits typed events
  //   if (event.projectId === projectId) {
  //     callback(event);
  //   }
  // });
  // Placeholder if BuildService is not active or its event structure is unknown
  console.warn('handleBuildEvents is a placeholder as BuildService integration might be incomplete.');
}

/**
 * Apply AI-generated edits to a project
 */
export async function applyEdits(projectId: string, content: string): Promise<void> {
  // Parse edits from the AI response
  // const edits = buildService.parseEdits(content); // Commented out
  console.warn('applyEdits is a placeholder as BuildService integration might be incomplete.');

  // if (edits.length === 0) {
  //   return;
  // }

  // Apply edits to the project
  // await buildService.applyEdits(projectId, edits); // Commented out
}
