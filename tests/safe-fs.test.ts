import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { safeReaddirSync } from '../src/main/utils/safe-fs';

describe('safeReaddirSync', () => {
  let tmpDir = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-fs-test-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns regular directories and files', () => {
    fs.mkdirSync(path.join(tmpDir, 'alpha'));
    fs.writeFileSync(path.join(tmpDir, 'beta.txt'), 'ok');

    const entries = safeReaddirSync(tmpDir)
      .map((entry) => entry.name)
      .sort();
    expect(entries).toEqual(['alpha', 'beta.txt']);
  });

  it('returns an empty array when the directory cannot be read', () => {
    const onSkip = vi.fn();
    const entries = safeReaddirSync(path.join(tmpDir, 'missing'), onSkip);
    expect(entries).toEqual([]);
    expect(onSkip).toHaveBeenCalled();
  });
});
