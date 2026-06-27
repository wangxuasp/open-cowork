import fs from 'node:fs';
import path from 'node:path';
import { safeReaddirSync } from '../utils/safe-fs';
import { TEAMCENTER_SKILL_TEMPLATE_FILENAME } from './teamcenter-skill-runtime';

export interface SkillDirectorySignatureOptions {
  ignoreSkillMd?: boolean;
  ignoreTemplate?: boolean;
}

export function isDanglingSymlink(filePath: string): boolean {
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isSymbolicLink()) {
      return false;
    }
    fs.statSync(filePath);
    return false;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === 'ENOENT';
  }
}

export function cleanDanglingSymlinksInDir(dir: string): void {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return;
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    if (isDanglingSymlink(entryPath)) {
      try {
        fs.unlinkSync(entryPath);
      } catch {
        // Best-effort cleanup before sync.
      }
    }
  }
}

function findRootSkillMd(skillDir: string): string | null {
  const directSkillMd = path.join(skillDir, 'SKILL.md');
  if (fs.existsSync(directSkillMd) && fs.statSync(directSkillMd).isFile()) {
    return directSkillMd;
  }
  return null;
}

export function computeSkillDirectorySignature(
  skillDir: string,
  options: SkillDirectorySignatureOptions = {}
): string {
  if (!fs.existsSync(skillDir) || !fs.statSync(skillDir).isDirectory()) {
    return '';
  }

  const parts: string[] = [];
  const visit = (currentDir: string): void => {
    for (const entry of safeReaddirSync(currentDir)) {
      if (entry.name === 'node_modules') {
        continue;
      }
      if (entry.name.startsWith('.')) {
        if (entry.name === TEAMCENTER_SKILL_TEMPLATE_FILENAME && !options.ignoreTemplate) {
          const templatePath = entry.entryPath;
          if (fs.statSync(templatePath).isFile()) {
            const stat = fs.statSync(templatePath);
            parts.push(
              `${path.relative(skillDir, templatePath)}:${stat.size}:${Math.floor(stat.mtimeMs)}`
            );
          }
        }
        continue;
      }

      const entryPath = entry.entryPath;
      const isDirectory =
        entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(entryPath).isDirectory());
      if (isDirectory) {
        visit(entryPath);
        continue;
      }

      if (options.ignoreSkillMd && entry.name === 'SKILL.md') {
        continue;
      }

      const stat = fs.statSync(entryPath);
      parts.push(`${path.relative(skillDir, entryPath)}:${stat.size}:${Math.floor(stat.mtimeMs)}`);
    }
  };

  visit(skillDir);
  return parts.sort().join('|');
}

function resolveComparableSourcePath(sourcePath: string, targetPath: string): string {
  try {
    const targetStat = fs.lstatSync(targetPath);
    if (targetStat.isSymbolicLink()) {
      return fs.realpathSync(targetPath);
    }
  } catch {
    // Fall back to the declared source path.
  }
  return fs.realpathSync(sourcePath);
}

export function shouldRefreshRuntimeSkillEntry(sourcePath: string, targetPath: string): boolean {
  if (!fs.existsSync(targetPath)) {
    return true;
  }

  if (isDanglingSymlink(targetPath)) {
    return true;
  }

  try {
    const targetStat = fs.lstatSync(targetPath);
    if (targetStat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(targetPath);
      if (/\.asar[/\\]/.test(linkTarget)) {
        return true;
      }
      return resolveComparableSourcePath(sourcePath, targetPath) !== fs.realpathSync(sourcePath);
    }

    const sourceWithoutSkillMd = computeSkillDirectorySignature(sourcePath, {
      ignoreSkillMd: true,
    });
    const targetWithoutSkillMd = computeSkillDirectorySignature(targetPath, {
      ignoreSkillMd: true,
      ignoreTemplate: true,
    });
    if (sourceWithoutSkillMd !== targetWithoutSkillMd) {
      return true;
    }

    const templatePath = path.join(targetPath, TEAMCENTER_SKILL_TEMPLATE_FILENAME);
    const sourceSkillMd = findRootSkillMd(sourcePath);
    if (fs.existsSync(templatePath) && sourceSkillMd) {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const sourceSkillContent = fs.readFileSync(sourceSkillMd, 'utf8');
      return templateContent !== sourceSkillContent;
    }

    return (
      computeSkillDirectorySignature(sourcePath) !== computeSkillDirectorySignature(targetPath)
    );
  } catch {
    return true;
  }
}

export function runtimeSkillEntryMatchesSource(sourcePath: string, targetPath: string): boolean {
  return fs.existsSync(targetPath) && !shouldRefreshRuntimeSkillEntry(sourcePath, targetPath);
}
