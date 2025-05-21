import { readdir, stat, readFile } from 'fs/promises';
import { join, relative, resolve, sep } from 'path';
import { env } from '../../config/env.js';

// Default ignore patterns from template .gitignore
const DEFAULT_IGNORE = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  'logs',
  'temp',
];

/**
 * Helper function to get the absolute path to a specific project's workspace.
 */
function getAbsoluteProjectWorkspacePath(projectId: string): string {
  // env.WORKSPACE_DIR is expected to be relative to process.cwd()
  // e.g., if cwd is /app, WORKSPACE_DIR might be 'backend/workspace'
  // or if cwd is /app/backend, WORKSPACE_DIR might be 'workspace'
  const baseWorkspaceDir = resolve(process.cwd(), env.WORKSPACE_DIR);
  return join(baseWorkspaceDir, projectId);
}

/**
 * Recursively builds a file tree string for a given directory, ignoring specified patterns.
 */
async function buildTree(dir: string, baseDir: string, ignore: string[], prefix = ''): Promise<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  // Sort: directories first, then files
  entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
  let tree = '';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (ignore.some(pattern => entry.name === pattern)) continue;
    const isLast = i === entries.length - 1;
    const pointer = isLast ? '└── ' : '├── ';
    const entryPath = join(dir, entry.name);
    // No longer need relPath for tree string generation here, path in output is just entry.name
    tree += `${prefix}${pointer}${entry.name}`;
    if (entry.isDirectory()) {
      tree += '/'; // Keep trailing slash for directories in tree view
      tree += '\n';
      tree += await buildTree(entryPath, baseDir, ignore, prefix + (isLast ? '    ' : '│   '));
    } else {
      tree += '\n';
    }
  }
  return tree;
}

/**
 * Returns the file structure of a project as a tree string, ignoring specified patterns.
 * @param projectId The project folder name in workspace
 * @param ignore Optional array of folder/file names to ignore (defaults to template .gitignore)
 */
export async function getProjectFileTree(
  projectId: string,
  ignore: string[] = DEFAULT_IGNORE
): Promise<string> {
  const projectWorkspaceAbsPath = getAbsoluteProjectWorkspacePath(projectId);
  return buildTree(projectWorkspaceAbsPath, projectWorkspaceAbsPath, ignore);
}

/**
 * Ensures that the given absolutePath is within the project workspace directory for the given projectId.
 * Throws an error if the path is outside the project directory (prevents path traversal attacks).
 * @param projectId The project folder name in workspace
 * @param checkAbsolutePath The absolute path to check
 */
export function ensurePathInProject(projectId: string, checkAbsolutePath: string): void {
  const projectRootAbsPath = getAbsoluteProjectWorkspacePath(projectId);
  const resolvedProjectRoot = resolve(projectRootAbsPath); // Normalize project root path
  const resolvedCheckPath = resolve(checkAbsolutePath); // Normalize path to check

  if (
    !resolvedCheckPath.startsWith(resolvedProjectRoot + sep) &&
    resolvedCheckPath !== resolvedProjectRoot
  ) {
    throw new Error(`Path '${checkAbsolutePath}' is outside the project workspace for project '${projectId}'.`);
  }
}

/**
 * Reads the content of a file within a project, given its relative path.
 * Ensures the path is safe before reading.
 * @param projectId The project folder name in workspace
 * @param relativeFilePath The path to the file relative to the project root
 * @returns The content of the file as a string
 */
export async function readFileInProject(projectId: string, relativeFilePath: string): Promise<string> {
  const projectWorkspaceAbsPath = getAbsoluteProjectWorkspacePath(projectId);
  const absoluteFilePath = resolve(projectWorkspaceAbsPath, relativeFilePath);
  ensurePathInProject(projectId, absoluteFilePath); // Safety check using the resolved absolute path
  return readFile(absoluteFilePath, 'utf-8');
}

/**
 * Recursively collects all file paths within a directory, ignoring specified patterns.
 */
async function collectFilePaths(dir: string, baseDir: string, ignore: string[]): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  let filePaths: string[] = [];
  for (const entry of entries) {
    if (ignore.some(pattern => entry.name === pattern)) continue;
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      filePaths = filePaths.concat(await collectFilePaths(entryPath, baseDir, ignore));
    } else {
      filePaths.push(relative(baseDir, entryPath));
    }
  }
  return filePaths;
}

/**
 * Returns the content of all files in a project, formatted as an XML-like string.
 * Ignores files and folders based on the provided ignore list (defaults to template .gitignore).
 * EX:
 * <file path="index.css"> .... </file>
 * ...
 * @param projectId The project folder name in workspace
 * @param ignore Optional array of folder/file names to ignore
 * @returns A string containing all file contents formatted with <file> tags
 */
export async function getAllProjectFilesContent(
  projectId: string,
  ignore: string[] = DEFAULT_IGNORE
): Promise<string> {
  const projectWorkspaceAbsPath = getAbsoluteProjectWorkspacePath(projectId);
  const allFiles = await collectFilePaths(projectWorkspaceAbsPath, projectWorkspaceAbsPath, ignore);
  let output = '';
  for (const filePath of allFiles) {
    try {
      const content = await readFileInProject(projectId, filePath); // readFileInProject takes relative path
      output += `<file path="${filePath}">\n${content}\n</file>\n`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping file ${filePath} due to read error: ${errorMessage}`);
      output += `<file path="${filePath}" error="Could not read file: ${errorMessage}"></file>\n`;
    }
  }
  return output;
}

/**
 * Returns the content of all files in the 'src' directory of a project, formatted as an XML-like string.
 * Ignores files and folders based on the provided ignore list (defaults to template .gitignore).
 * @param projectId The project folder name in workspace
 * @param ignore Optional array of folder/file names to ignore
 * @returns A string containing all file contents formatted with <file> tags, only for files under 'src/'
 */
export async function getAllSrcFilesContent(
  projectId: string,
  ignore: string[] = DEFAULT_IGNORE
): Promise<string> {
  const projectWorkspaceAbsPath = getAbsoluteProjectWorkspacePath(projectId);
  const srcDir = join(projectWorkspaceAbsPath, 'src');
  let allFiles: string[] = [];
  try {
    allFiles = await collectFilePaths(srcDir, projectWorkspaceAbsPath, ignore);
  } catch (error) {
    // If src/ doesn't exist, return empty string
    return '';
  }
  let output = '';
  for (const filePath of allFiles) {
    try {
      const content = await readFileInProject(projectId, filePath); // readFileInProject takes relative path
      output += `<file path="${filePath}">\n${content}\n</file>\n`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping file ${filePath} due to read error: ${errorMessage}`);
      output += `<file path="${filePath}" error="Could not read file: ${errorMessage}"></file>\n`;
    }
  }
  return output;
}
