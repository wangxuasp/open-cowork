import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const builderConfigPath = path.resolve(process.cwd(), 'electron-builder.yml');

describe('electron-builder branding configuration', () => {
  it('uses Omni Worker identity for app id, executable, installer, and shortcuts', () => {
    const builderConfig = fs.readFileSync(builderConfigPath, 'utf8');

    expect(builderConfig).toContain('appId: cn.disst.omniworker');
    expect(builderConfig).toContain('productName: Omni Worker');
    expect(builderConfig).toContain('executableName: Omni Worker');
    expect(builderConfig).toContain('artifactName: Omni-Worker-${version}-win-${arch}.${ext}');
    expect(builderConfig).toContain('shortcutName: Omni Worker');
    expect(builderConfig).toContain('uninstallDisplayName: Omni Worker');
    expect(builderConfig).toContain("name: 'Omni Worker.app'");
  });
});
