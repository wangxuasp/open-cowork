import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applyTeamcenterBaseUrlToSkillDescriptions,
  KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER,
  TEAMCENTER_BASE_URL_PLACEHOLDER,
  TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER,
  TEAMCENTER_WEB_TIER_URL_PLACEHOLDER,
  TEAMCENTER_SKILL_TEMPLATE_FILENAME,
} from '../src/main/skills/teamcenter-skill-runtime';

const tempRoots: string[] = [];

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'open-cowork-teamcenter-skills-'));
  tempRoots.push(root);
  return root;
}

function writeRuntimeSkill(root: string, name: string, content: string): string {
  const skillDir = path.join(root, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf8');
  return skillDir;
}

describe('Teamcenter skill runtime substitution', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('replaces BASE_URL placeholders in runtime skill descriptions without mutating the template', () => {
    const root = makeTempRoot();
    const skillDir = writeRuntimeSkill(
      root,
      'dataset',
      `---\nname: dataset\ndescription: Dataset skill\n---\n\nGET ${TEAMCENTER_BASE_URL_PLACEHOLDER}/dataset`
    );

    const result = applyTeamcenterBaseUrlToSkillDescriptions(root, 'https://tc.example.com/tc');

    const skillContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const templateContent = fs.readFileSync(
      path.join(skillDir, TEAMCENTER_SKILL_TEMPLATE_FILENAME),
      'utf8'
    );
    expect(result.updatedCount).toBe(1);
    expect(skillContent).toContain('GET https://tc.example.com/tc/dataset');
    expect(skillContent).not.toContain(TEAMCENTER_BASE_URL_PLACEHOLDER);
    expect(templateContent).toContain(`${TEAMCENTER_BASE_URL_PLACEHOLDER}/dataset`);
  });

  it('replaces explicit Teamcenter URL placeholders independently', () => {
    const root = makeTempRoot();
    const skillDir = writeRuntimeSkill(
      root,
      'mixed-teamcenter',
      [
        '---',
        'name: mixed-teamcenter',
        'description: Mixed Teamcenter endpoints',
        '---',
        '',
        `GET ${TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER}/dataset?action=query`,
        `GET ${TEAMCENTER_WEB_TIER_URL_PLACEHOLDER}/tc/web`,
        `GET ${TEAMCENTER_BASE_URL_PLACEHOLDER}/legacy`,
      ].join('\n')
    );

    const result = applyTeamcenterBaseUrlToSkillDescriptions(root, {
      richClientMicroserviceUrl: 'https://rich.example.com/micro',
      webTierUrl: 'https://web.example.com/tc',
    });

    const skillContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const templateContent = fs.readFileSync(
      path.join(skillDir, TEAMCENTER_SKILL_TEMPLATE_FILENAME),
      'utf8'
    );
    expect(result.updatedCount).toBe(1);
    expect(skillContent).toContain('GET https://rich.example.com/micro/dataset?action=query');
    expect(skillContent).toContain('GET https://web.example.com/tc/tc/web');
    expect(skillContent).toContain('GET https://rich.example.com/micro/legacy');
    expect(skillContent).not.toContain(TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER);
    expect(skillContent).not.toContain(TEAMCENTER_WEB_TIER_URL_PLACEHOLDER);
    expect(templateContent).toContain(TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER);
    expect(templateContent).toContain(TEAMCENTER_WEB_TIER_URL_PLACEHOLDER);
  });

  it('updates an existing runtime skill when the Teamcenter URL changes', () => {
    const root = makeTempRoot();
    const skillDir = writeRuntimeSkill(
      root,
      'folder',
      `---\nname: folder\ndescription: Folder skill\n---\n\nGET ${TEAMCENTER_BASE_URL_PLACEHOLDER}?action=query`
    );

    applyTeamcenterBaseUrlToSkillDescriptions(root, 'https://old.example.com/tc');
    applyTeamcenterBaseUrlToSkillDescriptions(root, 'https://new.example.com/tc');

    const skillContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    expect(skillContent).toContain('https://new.example.com/tc?action=query');
    expect(skillContent).not.toContain('https://old.example.com/tc');
  });

  it('restores placeholders when Teamcenter URL is empty', () => {
    const root = makeTempRoot();
    const skillDir = writeRuntimeSkill(
      root,
      'bom',
      `---\nname: bom\ndescription: BOM skill\n---\n\nPOST ${TEAMCENTER_BASE_URL_PLACEHOLDER}/bom/create/single`
    );

    applyTeamcenterBaseUrlToSkillDescriptions(root, 'https://tc.example.com/tc');
    applyTeamcenterBaseUrlToSkillDescriptions(root, '');

    const skillContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    expect(skillContent).toContain(`${TEAMCENTER_BASE_URL_PLACEHOLDER}/bom/create/single`);
    expect(skillContent).not.toContain('https://tc.example.com/tc');
  });

  it('replaces Knowledge Base HTTP URL placeholders independently', () => {
    const root = makeTempRoot();
    const skillDir = writeRuntimeSkill(
      root,
      'system-chat',
      [
        '---',
        'name: system-chat',
        'description: Knowledge Base chat skill',
        '---',
        '',
        `POST ${KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER}`,
      ].join('\n')
    );

    const result = applyTeamcenterBaseUrlToSkillDescriptions(root, {
      knowledgeBaseHttpUrl: 'http://kb.example.com/api/qdrant/chat',
    });

    const skillContent = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const templateContent = fs.readFileSync(
      path.join(skillDir, TEAMCENTER_SKILL_TEMPLATE_FILENAME),
      'utf8'
    );
    expect(result.updatedCount).toBe(1);
    expect(skillContent).toContain('POST http://kb.example.com/api/qdrant/chat');
    expect(skillContent).not.toContain(KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER);
    expect(templateContent).toContain(KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER);
  });
});
