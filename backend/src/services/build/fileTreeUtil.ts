import { readdir, stat } from 'fs/promises';
import { join, relative, resolve } from 'path';

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
    const relPath = relative(baseDir, entryPath);
    tree += `${prefix}${pointer}${entry.name}`;
    if (entry.isDirectory()) {
      tree += '/\n';
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
  const workspaceRoot = join(process.cwd(), 'backend', 'workspace', projectId);
  return buildTree(workspaceRoot, workspaceRoot, ignore);
}

/**
 * Ensures that the given absolutePath is within the project workspace directory for the given projectId.
 * Throws an error if the path is outside the project directory (prevents path traversal attacks).
 * @param projectId The project folder name in workspace
 * @param absolutePath The absolute path to check
 */
export function ensurePathInProject(projectId: string, absolutePath: string): void {
  const projectRoot = join(process.cwd(), 'backend', 'workspace', projectId);
  const resolvedProjectRoot = resolve(projectRoot);
  const resolvedAbsolutePath = resolve(absolutePath);
  if (
    !resolvedAbsolutePath.startsWith(resolvedProjectRoot + require('path').sep) &&
    resolvedAbsolutePath !== resolvedProjectRoot
  ) {
    throw new Error(`Path '${absolutePath}' is outside the project workspace for project '${projectId}'.`);
  }
}
