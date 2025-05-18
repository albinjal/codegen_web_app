import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BuildService, BuildEvent } from '../index'; // Adjusted path
import fs from 'fs-extra';
import { execa } from 'execa';
import path from 'path';

// Mock dependencies with Vitest
vi.mock('fs-extra');
vi.mock('execa');

const MOCKED_PWD = '/mock/backend/root';

const MOCKED_WORKSPACE_DIR = path.join(MOCKED_PWD, 'workspace');
const MOCKED_TEMPLATE_DIR = path.join(MOCKED_PWD, 'template');

describe('BuildService', () => {
  let buildService: BuildService;
  const mockEmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    buildService = new BuildService(MOCKED_PWD); // Pass MOCKED_PWD here
    buildService.emit = mockEmit;
  });

  afterEach(() => {
    vi.resetAllMocks(); // General cleanup for vi.mock if needed, though clearAllMocks is often enough for spies.
  });

  describe('constructor', () => {
    it('should ensure the workspace directory exists', () => {
      // Instantiation is in beforeEach, so check mocks directly
      expect(fs.ensureDirSync).toHaveBeenCalledTimes(1);
      expect(fs.ensureDirSync).toHaveBeenCalledWith(MOCKED_WORKSPACE_DIR);
    });
  });

  describe('createProject', () => {
    const projectId = 'test-project-id';
    const projectPath = path.join(MOCKED_WORKSPACE_DIR, projectId);

    it('should create project directory and copy template files successfully', async () => {
      (fs.ensureDir as Mock).mockResolvedValue(undefined);
      (fs.copy as Mock).mockResolvedValue(undefined);

      await buildService.createProject(projectId);

      expect(fs.ensureDir).toHaveBeenCalledWith(projectPath);
      expect(fs.copy).toHaveBeenCalledWith(MOCKED_TEMPLATE_DIR, projectPath);
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'project_created',
        projectId,
        message: 'Project workspace created successfully.',
      });
    });

    it('should emit an error and re-throw if fs.ensureDir fails', async () => {
      const ensureDirError = new Error('Failed to ensure dir');
      (fs.ensureDir as Mock).mockRejectedValue(ensureDirError);

      await expect(buildService.createProject(projectId)).rejects.toThrow(ensureDirError);

      expect(fs.copy).not.toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'error',
        projectId,
        message: `Failed to create project workspace: ${ensureDirError.message}`,
      });
    });

    it('should emit an error and re-throw if fs.copy fails', async () => {
      const copyError = new Error('Failed to copy files');
      (fs.ensureDir as Mock).mockResolvedValue(undefined);
      (fs.copy as Mock).mockRejectedValue(copyError);

      await expect(buildService.createProject(projectId)).rejects.toThrow(copyError);

      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'error',
        projectId,
        message: `Failed to create project workspace: ${copyError.message}`,
      });
    });
  });

  describe('buildProject', () => {
    const projectId = 'test-build-project';
    const projectPath = path.join(MOCKED_WORKSPACE_DIR, projectId);
    const mockExeca = execa as Mock;

    it('should install dependencies and build the project successfully', async () => {
      mockExeca
        .mockResolvedValueOnce({ stdout: 'install success', stderr: '' } as any) // npm install
        .mockResolvedValueOnce({ stdout: 'build success', stderr: '' } as any);    // npm run build

      await buildService.buildProject(projectId);

      expect(mockExeca).toHaveBeenCalledTimes(2);
      expect(mockExeca).toHaveBeenNthCalledWith(1, 'npm', ['install'], { cwd: projectPath, stdio: 'pipe' });
      expect(mockExeca).toHaveBeenNthCalledWith(2, 'npm', ['run', 'build'], { cwd: projectPath, stdio: 'pipe' });

      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_start', projectId, message: 'Build process started.' });
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_progress', projectId, message: 'Installing dependencies...' });
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_progress', projectId, message: 'Dependencies installed.' });
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_progress', projectId, message: 'Building project...' });
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'preview_ready',
        projectId,
        message: `Build successful. Preview at ${path.join(projectPath, 'dist', 'index.html')}`,
      });
    });

    it('should handle npm install failure', async () => {
      const installError = new Error('npm install failed') as any;
      installError.stderr = 'Install error details';
      mockExeca.mockRejectedValueOnce(installError);

      await expect(buildService.buildProject(projectId)).rejects.toThrow(installError);

      expect(mockExeca).toHaveBeenCalledTimes(1);
      expect(mockExeca).toHaveBeenCalledWith('npm', ['install'], { cwd: projectPath, stdio: 'pipe' });
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_start', projectId, message: 'Build process started.' });
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_progress', projectId, message: 'Installing dependencies...' });
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'error',
        projectId,
        message: `Build failed: ${installError.message}\nStderr: ${installError.stderr}`,
      });
    });

    it('should handle npm run build failure', async () => {
      const buildError = new Error('npm run build failed') as any;
      buildError.stderr = 'Build error details';
      mockExeca
        .mockResolvedValueOnce({ stdout: 'install success', stderr: '' } as any) // npm install
        .mockRejectedValueOnce(buildError);                            // npm run build

      await expect(buildService.buildProject(projectId)).rejects.toThrow(buildError);

      expect(mockExeca).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'build_progress', projectId, message: 'Building project...' });
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'error',
        projectId,
        message: `Build failed: ${buildError.message}\nStderr: ${buildError.stderr}`,
      });
    });

    it('should handle build warnings (stderr output) during npm run build', async () => {
      const buildWarning = 'This is a build warning';
      mockExeca
        .mockResolvedValueOnce({ stdout: 'install success', stderr: '' } as any)          // npm install
        .mockResolvedValueOnce({ stdout: 'build success', stderr: buildWarning } as any); // npm run build with stderr

      await buildService.buildProject(projectId);

      expect(mockExeca).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenCalledWith('build', expect.objectContaining({
        type: 'build_progress',
        projectId,
        message: `Build warnings: ${buildWarning}`
      }));
      expect(mockEmit).toHaveBeenCalledWith('build', expect.objectContaining({
        type: 'preview_ready',
        projectId,
        message: `Build successful. Preview at ${path.join(projectPath, 'dist', 'index.html')}`,
      })); // Still emits preview_ready
    });
  });

  describe('parseEdits', () => {
    it('should return an empty array and emit placeholder event', () => {
      const content = '<edit file="test.txt">new content</edit>';
      const edits = buildService.parseEdits(content);

      expect(edits).toEqual([]);
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'edits_parsed',
        projectId: 'unknown', // As per current placeholder implementation
        message: 'Edit parsing is a placeholder.',
      });
    });
  });

  describe('applyEdits', () => {
    const projectId = 'test-apply-edits';
    // const projectPath = path.join(MOCKED_WORKSPACE_DIR, projectId); // Not strictly needed for placeholder tests

    beforeEach(() => {
      vi.useFakeTimers(); // Use fake timers for setTimeout control
    });

    afterEach(() => {
      vi.restoreAllMocks(); // Or vi.useRealTimers();
    });

    it('should emit no_edits_to_apply if edits array is empty', async () => {
      await buildService.applyEdits(projectId, []);
      expect(mockEmit).toHaveBeenCalledWith('build', { type: 'no_edits_to_apply', projectId });
    });

    it('should emit applying_edits and edits_applied for placeholder implementation with edits', async () => {
      const mockEdits = [{ instruction: 'placeholder edit' }];
      const applyEditsPromise = buildService.applyEdits(projectId, mockEdits);

      // Check first emit immediately
      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'applying_edits',
        projectId,
        message: `Applying ${mockEdits.length} edits (placeholder)...`,
      });

      // Advance timers to resolve the setTimeout in applyEdits
      vi.runAllTimers();
      await applyEditsPromise; // Wait for the applyEdits promise to complete

      expect(mockEmit).toHaveBeenCalledWith('build', {
        type: 'edits_applied',
        projectId,
        message: 'Edits applied (placeholder). Rebuild might be needed.',
      });
    });
  });

  // More tests will be added here
});
