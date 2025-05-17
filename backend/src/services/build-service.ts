import { execa } from 'execa';
import { mkdir, cp, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

// Setup file paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../../../');
const templateDir = join(rootDir, 'template');
const workspaceDir = join(rootDir, 'workspace');

// Timeout values
const BUILD_TIMEOUT_MS = 30000; // 30 seconds

// Event types
export interface BuildEvent {
  type: 'preview-ready' | 'error' | 'progress';
  projectId: string;
  message?: string;
}

export class BuildService extends EventEmitter {
  private workspaceDir: string;
  private templateDir: string;

  constructor() {
    super();
    this.workspaceDir = workspaceDir;
    this.templateDir = templateDir;
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
   * Applies code edits and rebuilds the project
   */
  async applyEdits(projectId: string, edits: Array<{ filePath: string, content: string }>): Promise<void> {
    const projectDir = join(this.workspaceDir, projectId);

    try {
      // Apply each edit
      for (const edit of edits) {
        const fullPath = join(projectDir, edit.filePath);
        const dirPath = dirname(fullPath);

        // Ensure directory exists
        await mkdir(dirPath, { recursive: true });

        // Write the file content
        await writeFile(fullPath, edit.content);

        this.emit('build', {
          type: 'progress',
          projectId,
          message: `Applied edit to ${edit.filePath}`
        });
      }

      // Rebuild the project
      await this.buildProject(projectId);

      // Emit event that preview is ready
      this.emit('build', {
        type: 'preview-ready',
        projectId,
        message: 'Build completed after edits'
      });
    } catch (error) {
      console.error('Error applying edits:', error);
      this.emit('build', {
        type: 'error',
        projectId,
        message: `Failed to apply edits: ${error instanceof Error ? error.message : String(error)}`
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
        timeout: BUILD_TIMEOUT_MS,
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
        message: 'Building project...'
      });

      // Run npm run build with timeout
      const subprocess = execa('npm', ['run', 'build'], {
        cwd: projectDir,
        timeout: BUILD_TIMEOUT_MS,
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
   * Extracts edits from XML format
   * <edit file="path/to/file.js">content</edit>
   */
  parseEdits(content: string): Array<{ filePath: string, content: string }> {
    const editRegex = /<edit\s+file="([^"]+)">([\s\S]*?)<\/edit>/g;
    const edits: Array<{ filePath: string, content: string }> = [];

    let match;
    while ((match = editRegex.exec(content)) !== null) {
      const [, filePath, fileContent] = match;
      edits.push({
        filePath,
        content: fileContent
      });
    }

    return edits;
  }
}
