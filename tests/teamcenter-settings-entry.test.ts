import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const settingsPanelPath = path.resolve(process.cwd(), 'src/renderer/components/SettingsPanel.tsx');
const settingsTeamcenterPath = path.resolve(
  process.cwd(),
  'src/renderer/components/settings/SettingsTeamcenter.tsx'
);
const settingsKnowledgeBasePath = path.resolve(
  process.cwd(),
  'src/renderer/components/settings/SettingsKnowledgeBase.tsx'
);
const rendererTypesPath = path.resolve(process.cwd(), 'src/renderer/types/index.ts');
const mainConfigStorePath = path.resolve(process.cwd(), 'src/main/config/config-store.ts');
const mainIndexPath = path.resolve(process.cwd(), 'src/main/index.ts');
const useIPCPath = path.resolve(process.cwd(), 'src/renderer/hooks/useIPC.ts');
const enLocalePath = path.resolve(process.cwd(), 'src/renderer/i18n/locales/en.json');
const zhLocalePath = path.resolve(process.cwd(), 'src/renderer/i18n/locales/zh.json');

describe('Teamcenter settings entry', () => {
  it('adds a dedicated Teamcenter tab to the settings panel', () => {
    const source = fs.readFileSync(settingsPanelPath, 'utf8');

    expect(source).toContain('import { SettingsTeamcenter }');
    expect(source).toContain("'teamcenter'");
    expect(source).toContain("id: 'teamcenter' as TabId");
    expect(source).toContain('<SettingsTeamcenter />');
    expect(source).toContain("t('settings.teamcenter'");
    expect(source).toContain("t('settings.teamcenterDesc'");
  });

  it('renders Teamcenter Web-Tier URL, Rich Client MicroService URL, account, and password fields', () => {
    const source = fs.readFileSync(settingsTeamcenterPath, 'utf8');

    expect(source).toContain("t('teamcenter.webTierGroupTitle'");
    expect(source).toContain("t('teamcenter.webTierUrl'");
    expect(source).toContain("t('teamcenter.richClientMicroserviceGroupTitle'");
    expect(source).toContain("t('teamcenter.richClientMicroserviceUrl'");
    expect(source).toContain("t('teamcenter.account'");
    expect(source).toContain("t('teamcenter.password'");
    expect(source).toContain("t('teamcenter.saveConfig'");
    expect(source).toContain('type="password"');
    expect(source).toContain('teamcenterWebTierUrl');
    expect(source).toContain('teamcenterRichClientMicroserviceUrl');
    expect(source).toContain('teamcenterAccount');
    expect(source).toContain('teamcenterPassword');
    expect(source).toContain("type: 'settings.update'");
  });

  it('groups Web-Tier credentials separately from the Rich Client MicroService URL', () => {
    const source = fs.readFileSync(settingsTeamcenterPath, 'utf8');

    const webTierGroup = source.indexOf("t('teamcenter.webTierGroupTitle'");
    const webTierUrl = source.indexOf("t('teamcenter.webTierUrl'");
    const account = source.indexOf("t('teamcenter.account'");
    const password = source.indexOf("t('teamcenter.password'");
    const microserviceGroup = source.indexOf("t('teamcenter.richClientMicroserviceGroupTitle'");
    const microserviceUrl = source.indexOf("t('teamcenter.richClientMicroserviceUrl'");

    expect(webTierGroup).toBeGreaterThan(-1);
    expect(microserviceGroup).toBeGreaterThan(-1);
    expect(webTierGroup).toBeLessThan(webTierUrl);
    expect(webTierUrl).toBeLessThan(account);
    expect(account).toBeLessThan(password);
    expect(password).toBeLessThan(microserviceGroup);
    expect(microserviceGroup).toBeLessThan(microserviceUrl);
  });

  it('persists Teamcenter settings through the app config snapshot', () => {
    const rendererTypes = fs.readFileSync(rendererTypesPath, 'utf8');
    const mainConfigStore = fs.readFileSync(mainConfigStorePath, 'utf8');
    const mainIndex = fs.readFileSync(mainIndexPath, 'utf8');
    const useIPC = fs.readFileSync(useIPCPath, 'utf8');

    expect(rendererTypes).toContain('teamcenterWebTierUrl: string;');
    expect(rendererTypes).toContain('teamcenterRichClientMicroserviceUrl: string;');
    expect(rendererTypes).toContain('teamcenterAccount: string;');
    expect(rendererTypes).toContain('teamcenterPassword: string;');
    expect(mainConfigStore).toContain("teamcenterWebTierUrl: ''");
    expect(mainConfigStore).toContain("teamcenterRichClientMicroserviceUrl: ''");
    expect(mainConfigStore).toContain('teamcenterPassword:');
    expect(mainIndex).toContain('teamcenterWebTierUrl');
    expect(mainIndex).toContain('teamcenterRichClientMicroserviceUrl');
    expect(useIPC).toContain(
      'teamcenterRichClientMicroserviceUrl: config.teamcenterRichClientMicroserviceUrl ||'
    );
    expect(useIPC).toContain('teamcenterPassword: config.teamcenterPassword ||');
  });

  it('includes English and Chinese labels for the MicroService URL and save button', () => {
    const en = fs.readFileSync(enLocalePath, 'utf8');
    const zh = fs.readFileSync(zhLocalePath, 'utf8');

    expect(en).toContain('Teamcenter Web-Tier');
    expect(en).toContain('Teamcenter Rich Client MicroService URL');
    expect(en).toContain('Save configuration');
    expect(zh).toContain('Teamcenter Web-Tier');
    expect(zh).toContain('Teamcenter Rich Client MicroService URL');
    expect(zh).toContain('保存配置');
  });

  it('adds a dedicated Knowledge Base tab with an HTTP URL field', () => {
    const panelSource = fs.readFileSync(settingsPanelPath, 'utf8');
    const source = fs.readFileSync(settingsKnowledgeBasePath, 'utf8');

    expect(panelSource).toContain('import { SettingsKnowledgeBase }');
    expect(panelSource).toContain("'knowledgeBase'");
    expect(panelSource).toContain("id: 'knowledgeBase' as TabId");
    expect(panelSource).toContain('<SettingsKnowledgeBase />');
    expect(panelSource).toContain("t('settings.knowledgeBase'");
    expect(panelSource).toContain("t('settings.knowledgeBaseDesc'");

    expect(source).toContain("t('knowledgeBase.httpUrl'");
    expect(source).toContain('knowledgeBaseHttpUrl');
    expect(source).toContain("type: 'settings.update'");
  });

  it('persists Knowledge Base settings through the app config snapshot', () => {
    const rendererTypes = fs.readFileSync(rendererTypesPath, 'utf8');
    const mainConfigStore = fs.readFileSync(mainConfigStorePath, 'utf8');
    const mainIndex = fs.readFileSync(mainIndexPath, 'utf8');
    const useIPC = fs.readFileSync(useIPCPath, 'utf8');

    expect(rendererTypes).toContain('knowledgeBaseHttpUrl: string;');
    expect(rendererTypes).toContain('knowledgeBaseHttpUrl?: string;');
    expect(mainConfigStore).toContain("knowledgeBaseHttpUrl: ''");
    expect(mainIndex).toContain('knowledgeBaseHttpUrl');
    expect(useIPC).toContain('knowledgeBaseHttpUrl: config.knowledgeBaseHttpUrl ||');
  });

  it('includes Knowledge Base URL labels without showing placeholder guidance in the UI', () => {
    const source = fs.readFileSync(settingsKnowledgeBasePath, 'utf8');
    const en = fs.readFileSync(enLocalePath, 'utf8');
    const zh = fs.readFileSync(zhLocalePath, 'utf8');

    expect(en).toContain('Knowledge Base HTTP URL');
    expect(zh).toContain('知识库 HTTP URL');
    expect(source).not.toContain('knowledgeBase.placeholderHint');
    expect(en).not.toContain('{KNOWLEDGE_BASE_HTTP_URL}');
    expect(zh).not.toContain('{KNOWLEDGE_BASE_HTTP_URL}');
  });
});
