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

vi.mock('../src/main/utils/logger', () => ({
  log: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

import { SkillsManager } from '../src/main/skills/skills-manager';
import { createSkillsAdapter } from '../src/main/skills/skills-adapter';
import type { DatabaseInstance } from '../src/main/db/database';

type SkillRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  enabled: number;
  config: string | null;
  created_at: number;
};

function createDbWithSkillsTable(): DatabaseInstance {
  const skills = new Map<string, SkillRow>();

  return {
    raw: {} as DatabaseInstance['raw'],
    sessions: {} as DatabaseInstance['sessions'],
    messages: {} as DatabaseInstance['messages'],
    traceSteps: {} as DatabaseInstance['traceSteps'],
    scheduledTasks: {} as DatabaseInstance['scheduledTasks'],
    prepare: vi.fn((sql: string) => ({
      run: (...args: unknown[]) => {
        if (sql.includes('INSERT OR REPLACE INTO skills')) {
          const [id, name, description, type, enabled, config, created_at] = args as [
            string,
            string,
            string | null,
            string,
            number,
            string | null,
            number,
          ];
          skills.set(id, { id, name, description, type, enabled, config, created_at });
        }
        if (sql.includes('DELETE FROM skills')) {
          skills.delete(args[0] as string);
        }
      },
      get: (id: string) => skills.get(id),
    })),
    exec: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn(),
  };
}

function writeBuiltinSkill(name: string): void {
  const builtinRoot = path.join(testRoot, '.claude', 'skills', name);
  fs.mkdirSync(builtinRoot, { recursive: true });
  fs.writeFileSync(
    path.join(builtinRoot, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name} skill\n---\n\nUse ${name}.`,
    'utf8'
  );
}

describe('SkillsManager enabled persistence', () => {
  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-cowork-skill-enabled-test-'));
    fs.mkdirSync(path.join(testRoot, 'userData'), { recursive: true });
    fs.mkdirSync(path.join(testRoot, 'home'), { recursive: true });
    writeBuiltinSkill('pdf');
  });

  afterEach(() => {
    if (testRoot && fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('persists setSkillEnabled to the database', () => {
    const db = createDbWithSkillsTable();
    const manager = new SkillsManager(db);
    const skills = manager.getAllSkills();
    const pdfSkill = skills.find((skill) => skill.id === 'builtin-pdf');
    expect(pdfSkill).toBeDefined();

    manager.setSkillEnabled('builtin-pdf', false);

    const stmt = db.prepare('SELECT enabled FROM skills WHERE id = ?');
    const row = stmt.get('builtin-pdf') as { enabled: number } | undefined;
    expect(row?.enabled).toBe(0);
    expect(manager.getAllSkills().find((skill) => skill.id === 'builtin-pdf')?.enabled).toBe(false);
  });

  it('restores disabled state when manager is recreated', () => {
    const db = createDbWithSkillsTable();
    const firstManager = new SkillsManager(db);
    firstManager.setSkillEnabled('builtin-pdf', false);

    const secondManager = new SkillsManager(db);
    const pdfSkill = secondManager.getAllSkills().find((skill) => skill.id === 'builtin-pdf');
    expect(pdfSkill?.enabled).toBe(false);
  });

  it('changes enabled signature when toggling through adapter', () => {
    const db = createDbWithSkillsTable();
    const manager = new SkillsManager(db);
    const adapter = createSkillsAdapter(manager);
    const initialSignature = adapter.getEnabledSkillSignature();

    manager.setSkillEnabled('builtin-pdf', false);
    const disabledSignature = adapter.getEnabledSkillSignature();

    expect(disabledSignature).not.toBe(initialSignature);
    expect(adapter.isSkillEnabled('builtin', 'pdf')).toBe(false);
  });
});
