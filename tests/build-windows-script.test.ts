import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.resolve(process.cwd(), 'scripts/build-windows.js');

describe('build-windows helper', () => {
  it('exits early on non-Windows hosts to avoid misleading runs', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');

    expect(source).toContain("if (process.platform !== 'win32') {");
    expect(source).toContain('Skipping build.');
    expect(source).toContain('process.exit(0);');
  });

  it('copies legacy cleanup helpers into the Windows release output after a successful build', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');

    expect(source).toContain(
      "const { writeLegacyCleanupArtifacts } = require('./build-windows-artifacts');"
    );
    expect(source).toContain('writeLegacyCleanupArtifacts({');
    expect(source).toContain('Added legacy cleanup helper:');
  });

  it('preserves electronDist paths that contain spaces on Windows', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');

    expect(source).toContain("builderArgs.push('--config.electronDist', LOCAL_ELECTRON_DIST);");
    expect(source).not.toContain('`--config.electronDist=${LOCAL_ELECTRON_DIST}`');
    expect(source).toContain('process.env.npm_execpath');
    expect(source).toContain('process.execPath');
    expect(source).toContain('shell: false');
    expect(source).not.toContain("shell: process.platform === 'win32'");
  });

  it('uses a mirror for electron-builder binary downloads on Windows builds', () => {
    const source = fs.readFileSync(scriptPath, 'utf8');

    expect(source).toContain('DEFAULT_ELECTRON_BUILDER_BINARIES_MIRROR');
    expect(source).toContain('https://npmmirror.com/mirrors/electron-builder-binaries/');
    expect(source).toContain('resolveElectronBuilderBinariesMirror()');
    expect(source).toContain('ELECTRON_BUILDER_BINARIES_MIRROR: electronBuilderBinariesMirror');
    expect(source).toContain(
      'npm_config_electron_builder_binaries_mirror: electronBuilderBinariesMirror'
    );
  });
});
