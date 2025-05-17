import { z } from 'zod';

/**
 * Schema for creating a new project
 */
export const createProjectSchema = z.object({
  initialPrompt: z.string().min(1, 'Initial prompt is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Schema for project output
 */
export const projectSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messages: z.array(
    z.object({
      id: z.string(),
      projectId: z.string(),
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      createdAt: z.date(),
    })
  ),
});

export type ProjectOutput = z.infer<typeof projectSchema>;
