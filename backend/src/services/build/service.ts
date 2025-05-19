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

      // Update static file path mapping to point to the React build output
      const distDir = join(projectDir, 'dist');

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
   * Handles the 'view' command from the Anthropic text editor tool.
   * Reads the content of a file or lists directory contents within the project's workspace.
   * viewRange: [startLine, endLine] (1-indexed, endLine -1 for EOF)
   */
  async handleEditorViewCommand(projectId: string, relativePath: string, viewRange?: [number, number]): Promise<string> {
    try {
      const absolutePath = await this.getValidatedFilePath(projectId, relativePath);
      const stats = await stat(absolutePath);

      if (stats.isDirectory()) {
        // For now, we won't implement directory listing via this command as Anthropic examples focus on files.
        // If needed, this is where `fs.readdir` would go, formatted appropriately.
        const message = `Viewing directories is not currently supported via this command. Path: ${relativePath}`;
        this.emit('build', { type: 'progress', projectId, message});
        return message; // Or an error string if preferred
      }

      // Handle file viewing
      let fileContent = await readFile(absolutePath, 'utf-8');
      const lines = fileContent.split('\n');

      if (viewRange && viewRange.length === 2) {
        let [startLine, endLine] = viewRange;
        startLine = Math.max(1, startLine); // Ensure start is at least 1
        if (endLine === -1 || endLine > lines.length) {
          endLine = lines.length;
        }
        // Slice operates on 0-indexed, and end is exclusive
        fileContent = lines.slice(startLine - 1, endLine).map((line, index) => `${startLine + index}: ${line}`).join('\n');
      } else {
        // If no range, or invalid range, return full content with line numbers (as per Anthropic example)
        fileContent = lines.map((line, index) => `${index + 1}: ${line}`).join('\n');
      }

      this.emit('build', {
        type: 'file_viewed',
        projectId,
        message: `File viewed: ${relativePath}`,
        data: { path: relativePath, content: fileContent } // Consider if sending full content in event is wise for large files
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
   * Replaces a specific string in a file.
   */
  async handleEditorStrReplaceCommand(projectId: string, relativeFilePath: string, oldStr: string, newStr: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);

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

  /**
   * Handles the 'insert' command from the Anthropic text editor tool.
   * Inserts text at a specific line number in a file.
   * insertLine: 0 for beginning of file. Anthropic: "line number after which to insert"
   */
  async handleEditorInsertCommand(projectId: string, relativeFilePath: string, insertLine: number, newText: string): Promise<string> {
    try {
      const absoluteFilePath = await this.getValidatedFilePath(projectId, relativeFilePath);
      const originalContent = await readFile(absoluteFilePath, 'utf-8');
      const lines = originalContent.split('\n');

      // insertLine is 0 for beginning, 1 to insert after line 1, etc.
      // If insertLine is 0, newText is at the beginning.
      // If insertLine is N, newText is after line N (so it becomes line N+1, content of line N+1 shifts to N+2 etc).
      // lines.splice(index, deleteCount, ...itemsToAdd)
      // So if insertLine is 0, splice at index 0.
      // If insertLine is 1 (after line 1), splice at index 1.
      const lineIndexToInsertAt = Math.max(0, Math.min(insertLine, lines.length));

      lines.splice(lineIndexToInsertAt, 0, newText);
      const newContent = lines.join('\n');

      await writeFile(absoluteFilePath, newContent, 'utf-8');
      const successMessage = `Successfully inserted text into ${relativeFilePath} at line ${insertLine}.`;
      this.emit('build', {
        type: 'file_edited',
        projectId,
        message: successMessage,
        data: { path: relativeFilePath, insertLine, newText }
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

  // Placeholder for undo_edit if needed in the future
  // async handleEditorUndoCommand(projectId: string, relativeFilePath: string): Promise<string> {
  //   // This would require storing previous versions or diffs, which is complex.
  //   const message = "Undo command is not yet implemented.";
  //   this.emit('build', { type: 'progress', projectId, message });
  //   return message;
  // }
}
