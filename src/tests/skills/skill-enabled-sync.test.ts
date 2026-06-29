import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let testRoot = '';

vi.mock('electron', () => ({
  app: {
    getAppPath: () => testRoot,
    getVersion: () => '0.0.0-test',
    getPath: (name: string) => {
      if (name === 'userData') return path.join(testRoot, 'userData');
      if (name === 'home') return path.join(testRoot, 'home');
      return testRoot;
    },
  },
}));

vi.mock('../../main/utils/logger', () => ({
  log: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

import { SkillsManager } from '../../main/skills/skills-manager';
import { createSkillsAdapter } from '../../main/skills/skills-adapter';
import type { DatabaseInstance } from '../../main/db/database';

function createDbMock(): DatabaseInstance {
  const skills = new Map<string, { enabled: number }>();
  return {
    raw: {} as DatabaseInstance['raw'],
    sessions: {} as DatabaseInstance['sessions'],
    messages: {} as DatabaseInstance['messages'],
    traceSteps: {} as DatabaseInstance['traceSteps'],
    scheduledTasks: {} as DatabaseInstance['scheduledTasks'],
    prepare: vi.fn(
      (sql: string) =>
        ({
          run: (...args: unknown[]) => {
            if (sql.includes('INSERT OR REPLACE INTO skills')) {
              skills.set(args[0] as string, { enabled: args[4] as number });
            }
          },
          get: (id: string) => skills.get(id),
        }) as unknown as ReturnType<DatabaseInstance['prepare']>
    ),
    exec: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn(),
  };
}

function writeSkill(root: string, name: string): void {
  const skillRoot = path.join(root, name);
  fs.mkdirSync(skillRoot, { recursive: true });
  fs.writeFileSync(
    path.join(skillRoot, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name} skill\n---\n`,
    'utf8'
  );
}

function removeRuntimeEntry(runtimeDir: string, skillName: string): void {
  const runtimePath = path.join(runtimeDir, skillName);
  if (!fs.existsSync(runtimePath)) {
    return;
  }
  const stat = fs.lstatSync(runtimePath);
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(runtimePath);
    return;
  }
  fs.rmSync(runtimePath, { recursive: true, force: true });
}

describe('enabled-gated runtime skill sync', () => {
  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-cowork-skill-enabled-sync-'));
    fs.mkdirSync(path.join(testRoot, 'userData'), { recursive: true });
    fs.mkdirSync(path.join(testRoot, 'home'), { recursive: true });
  });

  afterEach(() => {
    if (testRoot && fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('does not keep disabled builtin skills in runtime directory', () => {
    const builtinRoot = path.join(testRoot, '.claude', 'skills');
    const runtimeDir = path.join(testRoot, 'runtime-skills');
    fs.mkdirSync(runtimeDir, { recursive: true });
    writeSkill(builtinRoot, 'pdf');
    writeSkill(builtinRoot, 'docx');
    fs.cpSync(path.join(builtinRoot, 'pdf'), path.join(runtimeDir, 'pdf'), { recursive: true });
    fs.cpSync(path.join(builtinRoot, 'docx'), path.join(runtimeDir, 'docx'), { recursive: true });

    const manager = new SkillsManager(createDbMock());
    const adapter = createSkillsAdapter(manager);
    manager.setSkillEnabled('builtin-pdf', false);

    for (const entry of fs.readdirSync(builtinRoot)) {
      if (!adapter.isSkillEnabled('builtin', entry)) {
        removeRuntimeEntry(runtimeDir, entry);
      }
    }

    expect(fs.existsSync(path.join(runtimeDir, 'pdf'))).toBe(false);
    expect(fs.existsSync(path.join(runtimeDir, 'docx'))).toBe(true);
  });

  it('restores runtime entry after re-enabling a builtin skill', () => {
    const builtinRoot = path.join(testRoot, '.claude', 'skills');
    const runtimeDir = path.join(testRoot, 'runtime-skills');
    fs.mkdirSync(runtimeDir, { recursive: true });
    writeSkill(builtinRoot, 'pdf');

    const manager = new SkillsManager(createDbMock());
    const adapter = createSkillsAdapter(manager);
    manager.setSkillEnabled('builtin-pdf', false);
    removeRuntimeEntry(runtimeDir, 'pdf');
    expect(fs.existsSync(path.join(runtimeDir, 'pdf'))).toBe(false);

    manager.setSkillEnabled('builtin-pdf', true);
    expect(adapter.isSkillEnabled('builtin', 'pdf')).toBe(true);
    fs.cpSync(path.join(builtinRoot, 'pdf'), path.join(runtimeDir, 'pdf'), { recursive: true });
    expect(fs.existsSync(path.join(runtimeDir, 'pdf'))).toBe(true);
  });
});
