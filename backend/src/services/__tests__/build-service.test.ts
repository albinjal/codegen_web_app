import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BuildService } from '../build-service.js';
import { EventEmitter } from 'events';
import { mkdir, cp, writeFile } from 'fs/promises';
import { execa } from 'execa';

// Mock the fs/promises module
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  cp: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue('file content'),
}));

// Mock the execa module
vi.mock('execa', () => ({
  execa: vi.fn().mockReturnValue({
    stdout: 'mock stdout',
    stderr: 'mock stderr',
  }),
}));

describe('BuildService', () => {
  let buildService: BuildService;

  beforeEach(() => {
    buildService = new BuildService();
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be an instance of EventEmitter', () => {
    expect(buildService).toBeInstanceOf(EventEmitter);
  });

  describe('createProject', () => {
    it('should create a project directory and copy template', async () => {
      const projectId = 'test-project-id';

      // Spy on the emit method
      const emitSpy = vi.spyOn(buildService, 'emit');

      // Mock the installDependencies and buildProject methods
      const installDependenciesSpy = vi.spyOn(buildService as any, 'installDependencies')
        .mockResolvedValue(undefined);
      const buildProjectSpy = vi.spyOn(buildService as any, 'buildProject')
        .mockResolvedValue(undefined);

      await buildService.createProject(projectId);

      // Check if the methods were called with the correct arguments
      expect(mkdir).toHaveBeenCalled();
      expect(cp).toHaveBeenCalled();
      expect(installDependenciesSpy).toHaveBeenCalledWith(projectId);
      expect(buildProjectSpy).toHaveBeenCalledWith(projectId);

      // Check if the correct event was emitted
      expect(emitSpy).toHaveBeenCalledWith('build', {
        type: 'preview-ready',
        projectId,
        message: 'Initial build completed'
      });
    });

    it('should handle errors properly', async () => {
      const projectId = 'test-project-id';
      const testError = new Error('Test error');

      // Make mkdir throw an error
      (mkdir as any).mockRejectedValue(testError);

      // Spy on the emit method
      const emitSpy = vi.spyOn(buildService, 'emit');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(buildService.createProject(projectId)).rejects.toThrow(testError);

      // Check if the error was logged and the error event was emitted
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating project:', testError);
      expect(emitSpy).toHaveBeenCalledWith('build', {
        type: 'error',
        projectId,
        message: `Failed to create project: ${testError.message}`
      });
    });
  });

  describe('parseEdits', () => {
    it('should parse edits from XML format', () => {
      const content = `
        Some text before
        <edit file="src/index.js">console.log('hello world');</edit>
        Some text in between
        <edit file="src/styles.css">body { margin: 0; }</edit>
        Some text after
      `;

      const result = buildService.parseEdits(content);

      expect(result).toEqual([
        {
          filePath: 'src/index.js',
          content: "console.log('hello world');"
        },
        {
          filePath: 'src/styles.css',
          content: "body { margin: 0; }"
        }
      ]);
    });

    it('should return an empty array if no edits are found', () => {
      const content = 'No edits here';

      const result = buildService.parseEdits(content);

      expect(result).toEqual([]);
    });
  });
});
