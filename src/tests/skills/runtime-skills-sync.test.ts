import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyTeamcenterBaseUrlToSkillDescriptions,
  TEAMCENTER_BASE_URL_PLACEHOLDER,
  TEAMCENTER_SKILL_TEMPLATE_FILENAME,
} from '../../main/skills/teamcenter-skill-runtime';
import {
  cleanDanglingSymlinksInDir,
  computeSkillDirectorySignature,
  runtimeSkillEntryMatchesSource,
  shouldRefreshRuntimeSkillEntry,
} from '../../main/skills/runtime-skills-sync';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeSkill(dir: string, content: string, extraFiles: Record<string, string> = {}): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
  for (const [name, fileContent] of Object.entries(extraFiles)) {
    fs.writeFileSync(path.join(dir, name), fileContent, 'utf8');
  }
}

function copyDirectorySync(source: string, target: string): void {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source)) {
    const sourcePath = path.join(source, entry);
    const targetPath = path.join(target, entry);
    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      copyDirectorySync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function syncBuiltinLike(sourceRoot: string, targetRoot: string, skillName: string): void {
  const sourcePath = path.join(sourceRoot, skillName);
  const targetPath = path.join(targetRoot, skillName);
  if (!shouldRefreshRuntimeSkillEntry(sourcePath, targetPath)) {
    return;
  }
  if (fs.existsSync(targetPath)) {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(targetPath);
    } else {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  }
  fs.symlinkSync(sourcePath, targetPath, 'dir');
}

describe('runtime-skills-sync helpers', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir('runtime-skills-sync-');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does not refresh materialized skills solely because a template marker exists', () => {
    const sourceDir = path.join(tmpDir, 'source', 'teamcenter-skill');
    const runtimeDir = path.join(tmpDir, 'runtime', 'teamcenter-skill');
    writeSkill(sourceDir, `# Teamcenter\nCall ${TEAMCENTER_BASE_URL_PLACEHOLDER}\n`, {
      'helper.txt': 'keep-me',
    });
    copyDirectorySync(sourceDir, runtimeDir);
    fs.writeFileSync(
      path.join(runtimeDir, TEAMCENTER_SKILL_TEMPLATE_FILENAME),
      fs.readFileSync(path.join(sourceDir, 'SKILL.md'), 'utf8'),
      'utf8'
    );
    fs.writeFileSync(path.join(runtimeDir, 'SKILL.md'), 'Call http://localhost:8080/\n', 'utf8');

    expect(shouldRefreshRuntimeSkillEntry(sourceDir, runtimeDir)).toBe(false);
    expect(runtimeSkillEntryMatchesSource(sourceDir, runtimeDir)).toBe(true);
  });

  it('keeps builtin sync stable across consecutive passes', () => {
    const builtinRoot = path.join(tmpDir, 'resources', 'skills');
    const runtimeRoot = path.join(tmpDir, 'appdata', 'claude', 'skills');
    fs.mkdirSync(builtinRoot, { recursive: true });
    fs.mkdirSync(runtimeRoot, { recursive: true });

    writeSkill(path.join(builtinRoot, 'custom-skill'), '# Custom skill\nDo work.\n', {
      'helper.txt': 'static',
    });

    syncBuiltinLike(builtinRoot, runtimeRoot, 'custom-skill');
    const firstSignature = computeSkillDirectorySignature(path.join(runtimeRoot, 'custom-skill'));

    syncBuiltinLike(builtinRoot, runtimeRoot, 'custom-skill');
    const secondSignature = computeSkillDirectorySignature(path.join(runtimeRoot, 'custom-skill'));

    expect(secondSignature).toBe(firstSignature);
    expect(fs.lstatSync(path.join(runtimeRoot, 'custom-skill')).isSymbolicLink()).toBe(true);
  });

  it('skips configured sync when runtime entry already matches source', () => {
    const configuredRoot = path.join(tmpDir, 'configured');
    const runtimeRoot = path.join(tmpDir, 'runtime');
    fs.mkdirSync(configuredRoot, { recursive: true });
    fs.mkdirSync(runtimeRoot, { recursive: true });

    const sourceDir = path.join(configuredRoot, 'configured-skill');
    const targetDir = path.join(runtimeRoot, 'configured-skill');
    writeSkill(sourceDir, '# Configured skill\nStable.\n');
    fs.symlinkSync(sourceDir, targetDir, 'dir');

    expect(runtimeSkillEntryMatchesSource(sourceDir, targetDir)).toBe(true);
    expect(shouldRefreshRuntimeSkillEntry(sourceDir, targetDir)).toBe(false);
  });

  it('cleans dangling symlinks without rebuilding valid entries', () => {
    const runtimeRoot = path.join(tmpDir, 'runtime');
    fs.mkdirSync(runtimeRoot, { recursive: true });
    const validDir = path.join(tmpDir, 'valid-skill');
    writeSkill(validDir, '# Valid\n');
    fs.symlinkSync(validDir, path.join(runtimeRoot, 'valid-skill'), 'dir');
    fs.symlinkSync(path.join(tmpDir, 'missing'), path.join(runtimeRoot, 'broken-skill'), 'dir');

    cleanDanglingSymlinksInDir(runtimeRoot);

    expect(fs.existsSync(path.join(runtimeRoot, 'valid-skill'))).toBe(true);
    expect(fs.existsSync(path.join(runtimeRoot, 'broken-skill'))).toBe(false);
  });
});

describe('applyTeamcenterBaseUrlToSkillDescriptions idempotency', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir('teamcenter-idempotent-');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does not rewrite SKILL.md on a second apply with unchanged URLs', () => {
    const skillDir = path.join(tmpDir, 'teamcenter-skill');
    writeSkill(skillDir, `# Teamcenter\nCall ${TEAMCENTER_BASE_URL_PLACEHOLDER}\n`);

    const urls = {
      baseUrl: 'http://localhost:8080',
      richClientMicroserviceUrl: 'http://localhost:8080',
      webTierUrl: '',
      knowledgeBaseHttpUrl: '',
    };

    const first = applyTeamcenterBaseUrlToSkillDescriptions(tmpDir, urls);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const afterFirst = fs.readFileSync(skillFile, 'utf8');
    const afterFirstMtime = fs.statSync(skillFile).mtimeMs;

    const second = applyTeamcenterBaseUrlToSkillDescriptions(tmpDir, urls);
    const afterSecond = fs.readFileSync(skillFile, 'utf8');
    const afterSecondMtime = fs.statSync(skillFile).mtimeMs;

    expect(first.updatedCount).toBeGreaterThan(0);
    expect(second.updatedCount).toBe(0);
    expect(afterSecond).toBe(afterFirst);
    expect(afterSecondMtime).toBe(afterFirstMtime);
    expect(fs.existsSync(path.join(skillDir, TEAMCENTER_SKILL_TEMPLATE_FILENAME))).toBe(true);
  });
});
