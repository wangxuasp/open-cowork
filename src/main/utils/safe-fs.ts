import * as fs from 'fs';
import * as path from 'path';

export interface SafeDirEntry {
  name: string;
  entryPath: string;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  isFile(): boolean;
}

function isPermissionError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === 'EPERM' || code === 'EACCES';
}

/**
 * Read a directory without failing when individual entries are inaccessible.
 * Unlike readdir({ withFileTypes: true }), a single EPERM/EACCES entry does not
 * abort the whole listing.
 */
export function safeReaddirSync(
  dir: string,
  onSkip?: (entryPath: string, error: unknown) => void
): SafeDirEntry[] {
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch (error) {
    onSkip?.(dir, error);
    return [];
  }

  const entries: SafeDirEntry[] = [];
  for (const name of names) {
    const entryPath = path.join(dir, name);
    try {
      const lstat = fs.lstatSync(entryPath);
      entries.push({
        name,
        entryPath,
        isDirectory: () => lstat.isDirectory(),
        isSymbolicLink: () => lstat.isSymbolicLink(),
        isFile: () => lstat.isFile(),
      });
    } catch (error) {
      onSkip?.(entryPath, error);
      if (!isPermissionError(error)) {
        continue;
      }
    }
  }

  return entries;
}
