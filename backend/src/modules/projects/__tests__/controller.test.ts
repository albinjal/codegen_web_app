import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProject, getProject, addMessage } from '../controller.js';
import { getPrismaClient } from '../../../core/database.js';
import { BuildService } from '../../../services/build/index.js';
import { AnthropicClient } from '../../../services/anthropic/index.js';

// Mock dependencies
vi.mock('../../../core/database.js', () => ({
  getPrismaClient: vi.fn().mockReturnValue({
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  }),
}));

vi.mock('../../../services/build/index.js', () => ({
  BuildService: vi.fn().mockImplementation(() => ({
    createProject: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    parseEdits: vi.fn().mockReturnValue([]),
    applyEdits: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../services/anthropic/index.js', () => ({
  AnthropicClient: vi.fn().mockImplementation(() => ({
    streamMessage: vi.fn(),
    on: vi.fn(),
  })),
}));

describe('Projects Controller', () => {
  const prisma = getPrismaClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project and message', async () => {
      const projectId = 'test-project-id';
      const initialPrompt = 'Create a website';

      // Mock prisma responses
      (prisma.project.create as any).mockResolvedValue({ id: projectId });
      (prisma.message.create as any).mockResolvedValue({ id: 'message-id' });

      const result = await createProject({ initialPrompt });

      expect(prisma.project.create).toHaveBeenCalled();
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          projectId,
          role: 'user',
          content: initialPrompt,
        }
      });

      expect(result).toEqual({ projectId });
    });
  });

  describe('getProject', () => {
    it('should return a project with messages', async () => {
      const projectId = 'test-project-id';
      const project = {
        id: projectId,
        createdAt: new Date(),
        messages: [
          {
            id: 'message-1',
            projectId,
            role: 'user',
            content: 'Hello',
            createdAt: new Date(),
          }
        ]
      };

      (prisma.project.findUnique as any).mockResolvedValue(project);

      const result = await getProject(projectId);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { messages: true }
      });

      expect(result).toEqual(project);
    });

    it('should throw an error if project not found', async () => {
      const projectId = 'non-existent-id';

      (prisma.project.findUnique as any).mockResolvedValue(null);

      await expect(getProject(projectId)).rejects.toThrow(`Project with ID ${projectId} not found`);
    });
  });

  describe('addMessage', () => {
    it('should add a message to an existing project', async () => {
      const projectId = 'test-project-id';
      const content = 'New message';
      const messageId = 'new-message-id';

      (prisma.project.findUnique as any).mockResolvedValue({ id: projectId });
      (prisma.message.create as any).mockResolvedValue({ id: messageId });

      const result = await addMessage(projectId, content);

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId }
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          projectId,
          role: 'user',
          content,
        }
      });

      expect(result).toEqual({ messageId });
    });

    it('should throw an error if project not found', async () => {
      const projectId = 'non-existent-id';
      const content = 'Message';

      (prisma.project.findUnique as any).mockResolvedValue(null);

      await expect(addMessage(projectId, content)).rejects.toThrow(`Project with ID ${projectId} not found`);
    });
  });
});
