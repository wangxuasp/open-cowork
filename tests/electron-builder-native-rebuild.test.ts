import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const builderConfigPath = path.resolve(process.cwd(), 'electron-builder.yml');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

describe('electron-builder native rebuild configuration', () => {
  it('does not rebuild native modules during packaging', () => {
    const builderConfig = fs.readFileSync(builderConfigPath, 'utf8');
    const packageJson = fs.readFileSync(packageJsonPath, 'utf8');

    expect(builderConfig).toContain('npmRebuild: false');
    expect(builderConfig).not.toContain('npmRebuild: true');
    expect(packageJson).toContain('"rebuild":');
    expect(packageJson).toContain('npm rebuild better-sqlite3 --runtime=electron');
  });
});
