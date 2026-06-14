import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const settingsPanelPath = path.resolve(process.cwd(), 'src/renderer/components/SettingsPanel.tsx');
const settingsAboutPath = path.resolve(
  process.cwd(),
  'src/renderer/components/settings/SettingsAbout.tsx'
);
const enLocalePath = path.resolve(process.cwd(), 'src/renderer/i18n/locales/en.json');
const zhLocalePath = path.resolve(process.cwd(), 'src/renderer/i18n/locales/zh.json');

describe('About settings entry', () => {
  it('adds a dedicated About tab to the settings panel', () => {
    const source = fs.readFileSync(settingsPanelPath, 'utf8');

    expect(source).toContain('import { SettingsAbout }');
    expect(source).toContain("'about'");
    expect(source).toContain("id: 'about' as TabId");
    expect(source).toContain('<SettingsAbout />');
    expect(source).toContain("t('settings.about'");
    expect(source).toContain("t('settings.aboutDesc'");
  });

  it('renders Omni Worker branding with the Disst logo', () => {
    const source = fs.readFileSync(settingsAboutPath, 'utf8');

    expect(source).toContain("import disstLogoSrc from '../../../../resources/disstlogo.png'");
    expect(source).toContain('w-28 h-28');
    expect(source).toContain('object-contain');
    expect(source).toContain("t('about.productName'");
    expect(source).toContain("t('about.copyright'");
  });

  it('includes English and Chinese copyright text', () => {
    const en = fs.readFileSync(enLocalePath, 'utf8');
    const zh = fs.readFileSync(zhLocalePath, 'utf8');

    expect(en).toContain('Omni Worker');
    expect(en).toContain(
      'Copyright © 2026 Shanghai Disst Technology Co., Ltd. All rights reserved.'
    );
    expect(zh).toContain('Omni Worker');
    expect(zh).toContain('上海迪斯特科技有限公司 版权所有 2026');
  });
});
