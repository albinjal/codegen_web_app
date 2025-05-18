import EventEmitter from 'events';
import fs from 'fs-extra';
import path, { resolve, sep, dirname, relative } from 'path';
import { execa } from 'execa';
import { env } from '../../config/env.js';

export interface BuildEvent {
  type: string; // e.g., 'start', 'progress', 'preview_ready', 'error', 'file_created', 'file_viewed', 'file_edited'
  projectId: string;
  message?: string;
  data?: any; // For returning file content or other data
}

export class BuildService extends EventEmitter {
  private readonly WORKSPACE_DIR: string;
  private readonly TEMPLATE_DIR: string;

  constructor(pwdOverride?: string) {
    super();
    const PWD = pwdOverride || env.PWD;
    if (!PWD) {
      // This case should ideally not happen if env.PWD is always set
      // or if pwdOverride is provided in tests.
      throw new Error('PWD environment variable is not set and no override was provided.');
    }
    this.WORKSPACE_DIR = path.join(PWD, 'workspace');
    this.TEMPLATE_DIR = path.join(PWD, 'template');
    // Ensure workspace directory exists
    fs.ensureDirSync(this.WORKSPACE_DIR);
  }

  // Helper function to ensure path is within project directory
  private async getValidatedFilePath(projectId: string, relativeUserPath: string): Promise<string> {
    const projectDir = path.join(this.WORKSPACE_DIR, projectId);
    const resolvedProjectDir = resolve(projectDir); // path.resolve alias
    const resolvedAbsoluteUserPath = resolve(projectDir, relativeUserPath); // path.resolve alias

    // Security check
    if (!resolvedAbsoluteUserPath.startsWith(resolvedProjectDir + sep) || resolvedAbsoluteUserPath === resolvedProjectDir) {
        throw new Error(`Path traversal attempt or invalid path. Operation on '${relativeUserPath}' is outside the project workspace.`);
    }
    return resolvedAbsoluteUserPath;
  }

  async createProject(projectId: string): Promise<void> {
    const projectPath = path.join(this.WORKSPACE_DIR, projectId);
    try {
      await fs.ensureDir(projectPath);
      await fs.copy(this.TEMPLATE_DIR, projectPath);
      this.emit('build', { type: 'project_created', projectId, message: 'Project workspace created successfully.' });
      console.log(`Project workspace created for ${projectId} at ${projectPath}`);
    } catch (error) {
      console.error(`Failed to create project workspace for ${projectId}:`, error);
      this.emit('build', { type: 'error', projectId, message: `Failed to create project workspace: ${error instanceof Error ? error.message : String(error)}` });
      throw error; // Re-throw to allow caller to handle
    }
  }

  async buildProject(projectId: string): Promise<void> {
    const projectPath = path.join(this.WORKSPACE_DIR, projectId);
    this.emit('build', { type: 'build_start', projectId, message: 'Build process started.' });

    try {
      // Step 1: Install dependencies
      console.log(`Installing dependencies for ${projectId} in ${projectPath}...`);
      this.emit('build', { type: 'build_progress', projectId, message: 'Installing dependencies...' });
      await execa('npm', ['install'], { cwd: projectPath, stdio: 'pipe' }); // Changed to pipe to capture output if needed later
      console.log(`Dependencies installed for ${projectId}.`);
      this.emit('build', { type: 'build_progress', projectId, message: 'Dependencies installed.' });

      // Step 2: Run the build script
      console.log(`Building project ${projectId} in ${projectPath}...`);
      this.emit('build', { type: 'build_progress', projectId, message: 'Building project...' });
      const { stdout, stderr } = await execa('npm', ['run', 'build'], { cwd: projectPath, stdio: 'pipe' });

      if (stderr) {
        // Some build tools output warnings to stderr, so we log it but don't necessarily treat as fatal error immediately
        console.warn(`Build process for ${projectId} produced warnings/errors on stderr:`, stderr);
        this.emit('build', { type: 'build_progress', projectId, message: `Build warnings: ${stderr}` });
      }

      console.log(`Project ${projectId} built successfully. Output:\n${stdout}`);
      // The preview is typically in a 'dist' subfolder
      const previewPath = path.join(projectPath, 'dist', 'index.html');
      this.emit('build', { type: 'preview_ready', projectId, message: `Build successful. Preview at ${previewPath}` });

    } catch (error) {
      let errorMessage = 'Unknown build error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // execa errors often have stdout/stderr properties
        // @ts-ignore
        if (error.stderr) {
        // @ts-ignore
          errorMessage += `\nStderr: ${error.stderr}`;
        }
        // @ts-ignore
        if (error.stdout) {
        // @ts-ignore
          errorMessage += `\nStdout: ${error.stdout}`;
        }
      }
      console.error(`Failed to build project ${projectId}:`, errorMessage);
      this.emit('build', { type: 'error', projectId, message: `Build failed: ${errorMessage}` });
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Creates a new text file within the project's workspace.
   * Ensures the file path is securely within the project directory.
   */
  async createFile(projectId: string, relativeFilePath: string, content: string): Promise<void> {
    const projectPath = path.join(this.WORKSPACE_DIR, projectId);
    // Resolve paths to be absolute and normalized
    const resolvedProjectPath = path.resolve(projectPath);
    const resolvedAbsoluteFilePath = path.resolve(projectPath, relativeFilePath);

    // Security check: Ensure the target path is strictly within the project directory
    if (!resolvedAbsoluteFilePath.startsWith(resolvedProjectPath + path.sep) || resolvedAbsoluteFilePath === resolvedProjectPath) {
      const errorMessage = `Path traversal attempt or invalid path. Cannot write to ${relativeFilePath}.`;
      console.error(errorMessage + ` (Project: ${projectId})`);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      throw new Error(errorMessage);
    }

    try {
      const dirPath = path.dirname(resolvedAbsoluteFilePath);
      await fs.ensureDir(dirPath); // fs-extra ensures directory exists
      await fs.writeFile(resolvedAbsoluteFilePath, content, 'utf-8');

      this.emit('build', {
        type: 'file_created',
        projectId,
        message: `File created: ${relativeFilePath}`
      });
      console.log(`File ${relativeFilePath} created for project ${projectId} at ${resolvedAbsoluteFilePath}`);
    } catch (error) {
      const errorMessage = `Failed to create file ${relativeFilePath}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage + ` for project ${projectId}:`, error);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      throw error;
    }
  }

  /**
   * Handles the 'create' command from the Anthropic text editor tool.
   */
  async handleEditorCreateCommand(projectId: string, relativeFilePath: string, fileText: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);
      const dirPath = dirname(absoluteFilePath); // path.dirname alias
      await fs.ensureDir(dirPath);
      await fs.writeFile(absoluteFilePath, fileText, 'utf-8');

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
      return `Error: ${errorMessage}`;
    }
  }

  /**
   * Handles the 'view' command from the Anthropic text editor tool.
   * viewRange: [startLine, endLine] (1-indexed, endLine -1 for EOF)
   */
  async handleEditorViewCommand(projectId: string, relativePath: string, viewRange?: [number, number]): Promise<string> {
    try {
      const absolutePath = await this.getValidatedFilePath(projectId, relativePath);
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        const message = `Viewing directories is not currently supported. Path: ${relativePath}`;
        this.emit('build', { type: 'progress', projectId, message });
        return message;
      }

      let fileContent = await fs.readFile(absolutePath, 'utf-8');
      const lines = fileContent.split('\n');

      if (viewRange && viewRange.length === 2) {
        let [startLine, endLine] = viewRange;
        startLine = Math.max(1, startLine);
        if (endLine === -1 || endLine > lines.length) {
          endLine = lines.length;
        }
        fileContent = lines.slice(startLine - 1, endLine).map((line, index) => `${startLine + index}: ${line}`).join('\n');
      } else {
        fileContent = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
      }

      this.emit('build', {
        type: 'file_viewed',
        projectId,
        message: `File viewed: ${relativePath}`,
        data: { path: relativePath }
      });
      return fileContent;
    } catch (error) {
      const errorMessage = `Failed to view '${relativePath}' for project ${projectId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage, error);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      return `Error: ${errorMessage}`;
    }
  }

  /**
   * Handles the 'str_replace' command from the Anthropic text editor tool.
   */
  async handleEditorStrReplaceCommand(projectId: string, relativeFilePath: string, oldStr: string, newStr: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);
      const originalContent = await fs.readFile(absoluteFilePath, 'utf-8');

      const parts = originalContent.split(oldStr);
      if (parts.length -1 !== 1) {
         const message = parts.length -1 === 0 ? `String to replace '${oldStr.substring(0,50)}...' not found in ${relativeFilePath}.` : `String '${oldStr.substring(0,50)}...' found multiple times (${parts.length-1}) in ${relativeFilePath}. Replacement aborted for safety.`;
         this.emit('build', {type: 'error', projectId, message});
         return `Error: ${message}`;
      }
      const newContent = originalContent.replace(oldStr, newStr);

      if (newContent === originalContent) {
         const message = `String to replace '${oldStr.substring(0,50)}...' not found. No changes made to ${relativeFilePath}.`;
         this.emit('build', { type: 'progress', projectId, message });
         return message;
      }

      await fs.writeFile(absoluteFilePath, newContent, 'utf-8');
      const successMessage = `Successfully replaced text in ${relativeFilePath}.`;
      this.emit('build', {
        type: 'file_edited',
        projectId,
        message: successMessage,
        data: { path: relativeFilePath }
      });
      console.log(`${successMessage} (Project: ${projectId})`);
      return "Successfully replaced text at exactly one location.";
    } catch (error) {
      const errorMessage = `Failed to replace string in '${relativeFilePath}' for project ${projectId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage, error);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      return `Error: ${errorMessage}`;
    }
  }

  /**
   * Handles the 'insert' command from the Anthropic text editor tool.
   * insertLine: 0 for beginning of file.
   */
  async handleEditorInsertCommand(projectId: string, relativeFilePath: string, insertLine: number, newText: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);
      const originalContent = await fs.readFile(absoluteFilePath, 'utf-8');
      const lines = originalContent.split('\n');
      const lineIndexToInsertAt = Math.max(0, Math.min(insertLine, lines.length));

      lines.splice(lineIndexToInsertAt, 0, newText);
      const newContent = lines.join('\n');

      await fs.writeFile(absoluteFilePath, newContent, 'utf-8');
      const successMessage = `Successfully inserted text into ${relativeFilePath} at line ${insertLine}.`;
      this.emit('build', {
        type: 'file_edited',
        projectId,
        message: successMessage,
        data: { path: relativeFilePath }
      });
      console.log(`${successMessage} (Project: ${projectId})`);
      return successMessage;
    } catch (error) {
      const errorMessage = `Failed to insert text into '${relativeFilePath}' for project ${projectId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMessage, error);
      this.emit('build', { type: 'error', projectId, message: errorMessage });
      return `Error: ${errorMessage}`;
    }
  }
}
