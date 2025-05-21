import { execa } from 'execa';
import { mkdir, cp, writeFile, readFile, stat } from 'fs/promises';
import { join, dirname, resolve, sep, relative } from 'path';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';

export class BuildService extends EventEmitter {
  private workspaceDir: string;
  private templateDir: string;
  private buildTimeoutMs: number;

  constructor() {
    super();
    this.workspaceDir = join(process.cwd(), env.WORKSPACE_DIR);
    this.templateDir = join(process.cwd(), env.TEMPLATE_DIR);
    this.buildTimeoutMs = env.BUILD_TIMEOUT_MS;
  }

  // Helper function to ensure path is within project directory
  private async getValidatedFilePath(projectId: string, relativeUserPath: string): Promise<string> {
    const projectDir = join(this.workspaceDir, projectId);
    const resolvedProjectDir = resolve(projectDir);
    const resolvedAbsoluteUserPath = resolve(projectDir, relativeUserPath);

    if (!resolvedAbsoluteUserPath.startsWith(resolvedProjectDir + sep) || resolvedAbsoluteUserPath === resolvedProjectDir) {
      throw new Error(`Path traversal attempt or invalid path. Operation on '${relativeUserPath}' is outside the project workspace.`);
    }
    return resolvedAbsoluteUserPath;
  }

  /**
   * Creates a new project workspace from the template
   */
  async createProject(projectId: string): Promise<void> {
    const projectDir = join(this.workspaceDir, projectId);

    try {
      // Create project directory
      await mkdir(projectDir, { recursive: true });

      // Copy template to project directory
      await cp(this.templateDir, projectDir, { recursive: true });

      this.emit('build', {
        type: 'progress',
        projectId,
        message: 'Template copied to workspace'
      });

      // Install dependencies
      await this.installDependencies(projectId);

      // Build the project
      await this.buildProject(projectId);

      // Emit event that preview is ready
      this.emit('build', {
        type: 'preview-ready',
        projectId,
        message: 'Initial build completed'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      this.emit('build', {
        type: 'error',
        projectId,
        message: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Installs project dependencies with timeout
   */
  private async installDependencies(projectId: string): Promise<void> {
    const projectDir = join(this.workspaceDir, projectId);

    try {
      this.emit('build', {
        type: 'progress',
        projectId,
        message: 'Installing dependencies...'
      });

      // Run npm install with timeout
      const subprocess = execa('npm', ['install'], {
        cwd: projectDir,
        timeout: this.buildTimeoutMs,
      });

      await subprocess;

      this.emit('build', {
        type: 'progress',
        projectId,
        message: 'Dependencies installed'
      });
    } catch (error) {
      console.error('Error installing dependencies:', error);
      this.emit('build', {
        type: 'error',
        projectId,
        message: 'Failed to install dependencies, proceeding with build anyway'
      });
      // We continue even if npm install fails, as the template might not need dependencies
    }
  }

  /**
   * Builds the project with timeout
   */
  private async buildProject(projectId: string): Promise<void> {
    const projectDir = join(this.workspaceDir, projectId);

    try {
      this.emit('build', {
        type: 'progress',
        projectId,
        message: 'Building React project...'
      });

      // Run npm run build with timeout (for React/Vite projects)
      const subprocess = execa('npm', ['run', 'build'], {
        cwd: projectDir,
        timeout: this.buildTimeoutMs,
      });

      await subprocess;

      this.emit('build', {
        type: 'progress',
        projectId,
        message: 'Build completed'
      });
    } catch (error) {
      console.error('Error building project:', error);
      throw new Error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Public method to rebuild a project
   */
  async rebuildProject(projectId: string): Promise<void> {
    try {
      await this.buildProject(projectId);
      this.emit('build', {
        type: 'preview-ready',
        projectId,
        message: 'Project rebuilt successfully'
      });
    } catch (error) {
      console.error('Error rebuilding project:', error);
      this.emit('build', {
        type: 'error',
        projectId,
        message: `Rebuild failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Handles the 'create' command from the Anthropic text editor tool.
   * Creates a new text file within the project's workspace.
   */
  async handleEditorCreateCommand(projectId: string, relativeFilePath: string, fileText: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);
      const dirPath = dirname(absoluteFilePath);
      await mkdir(dirPath, { recursive: true });
      await writeFile(absoluteFilePath, fileText, 'utf-8');

      const successMessage = `File created successfully: ${relativeFilePath}`;
      this.emit('build', {
        type: 'file_created',
        projectId,
        message: successMessage,
        data: { path: relativeFilePath }
      });
      console.log(`${successMessage} (Project: ${projectId})`);
      return successMessage;
    } catch (error) {
      const errorMessage = `Failed to create file '${relativeFilePath}' for project ${projectId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage, error);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      // Anthropic expects a string result, even for errors, to send back to the model.
      return `Error: ${errorMessage}`;
    }
  }

  /**
   * Handles the 'str_replace' command from the Anthropic text editor tool.
   * Replaces a specific string in a file.
   */
  async handleEditorStrReplaceCommand(projectId: string, relativeFilePath: string, oldStr: string, newStr: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);

      if (oldStr === '') {
        // Overwrite the file with newStr
        await writeFile(absoluteFilePath, newStr, 'utf-8');
        const successMessage = `File ${relativeFilePath} overwritten successfully.`;
        this.emit('build', {
          type: 'file_edited',
          projectId,
          message: successMessage,
          data: { path: relativeFilePath, oldStr, newStr }
        });
        console.log(`${successMessage} (Project: ${projectId})`);
        return successMessage;
      }

      const originalContent = await readFile(absoluteFilePath, 'utf-8');
      // Basic string replacement. For more complex scenarios (e.g., regex, multiple occurrences), this would need enhancement.
      // The Anthropic guide implies exact match and replacement of the first occurrence if not specified otherwise.
      // For safety, let's ensure only one replacement or make it configurable.

      const parts = originalContent.split(oldStr);
      if (parts.length -1 !== 1) {
         const message = parts.length -1 === 0 ? `String to replace '${oldStr.substring(0,50)}...' not found in ${relativeFilePath}.` : `String '${oldStr.substring(0,50)}...' found multiple times (${parts.length-1}) in ${relativeFilePath}. Replacement aborted for safety.`;
         this.emit('build', {type: 'error', projectId, message});
         return `Error: ${message}`;
      }

      const newContent = originalContent.replace(oldStr, newStr);

      if (newContent === originalContent) {
        const message = `String to replace '${oldStr.substring(0,50)}...' not found in ${relativeFilePath}. No changes made.`;
        this.emit('build', { type: 'progress', projectId, message });
        return message; // Or an error-like string if appropriate for Claude
      }

      await writeFile(absoluteFilePath, newContent, 'utf-8');
      const successMessage = `Successfully replaced text in ${relativeFilePath}.`;
      this.emit('build', {
        type: 'file_edited',
        projectId,
        message: successMessage,
        data: { path: relativeFilePath, oldStr, newStr }
      });
      console.log(`${successMessage} (Project: ${projectId})`);
      // Anthropic example returns: "Successfully replaced text at exactly one location."
      return "Successfully replaced text at exactly one location.";
    } catch (error) {
      const errorMessage = `Failed to replace string in '${relativeFilePath}' for project ${projectId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage, error);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      return `Error: ${errorMessage}`;
    }
  }
}
