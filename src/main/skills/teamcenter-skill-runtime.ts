import fs from 'node:fs';
import path from 'node:path';

export const TEAMCENTER_BASE_URL_PLACEHOLDER = '{BASE_URL}';
export const TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER =
  '{TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL}';
export const TEAMCENTER_WEB_TIER_URL_PLACEHOLDER = '{TEAMCENTER_WEB_TIER_URL}';
export const KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER = '{KNOWLEDGE_BASE_HTTP_URL}';
export const TEAMCENTER_SKILL_TEMPLATE_FILENAME = '.open-cowork-skill-template';

export interface TeamcenterSkillUrlConfig {
  richClientMicroserviceUrl?: string;
  webTierUrl?: string;
  baseUrl?: string;
  knowledgeBaseHttpUrl?: string;
}

interface TeamcenterSkillSubstitutionResult {
  updatedCount: number;
}

const TEAMCENTER_URL_PLACEHOLDERS = [
  TEAMCENTER_BASE_URL_PLACEHOLDER,
  TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER,
  TEAMCENTER_WEB_TIER_URL_PLACEHOLDER,
  KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER,
];

function normalizeTeamcenterSkillUrls(
  teamcenterUrls: string | TeamcenterSkillUrlConfig
): Required<TeamcenterSkillUrlConfig> {
  if (typeof teamcenterUrls === 'string') {
    const baseUrl = teamcenterUrls.trim();
    return {
      baseUrl,
      richClientMicroserviceUrl: baseUrl,
      webTierUrl: '',
      knowledgeBaseHttpUrl: '',
    };
  }

  const richClientMicroserviceUrl = (teamcenterUrls.richClientMicroserviceUrl || '').trim();
  const webTierUrl = (teamcenterUrls.webTierUrl || '').trim();
  const baseUrl = (teamcenterUrls.baseUrl || richClientMicroserviceUrl || webTierUrl).trim();
  const knowledgeBaseHttpUrl = (teamcenterUrls.knowledgeBaseHttpUrl || '').trim();

  return {
    baseUrl,
    richClientMicroserviceUrl,
    webTierUrl,
    knowledgeBaseHttpUrl,
  };
}

function replacePlaceholderIfConfigured(
  content: string,
  placeholder: string,
  value: string
): string {
  return value ? content.replaceAll(placeholder, value) : content;
}

function copyDirectorySync(source: string, target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

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

function materializeSkillDirectoryIfNeeded(skillDir: string): void {
  const stat = fs.lstatSync(skillDir);
  if (!stat.isSymbolicLink()) {
    return;
  }

  const sourceDir = fs.realpathSync(skillDir);
  fs.unlinkSync(skillDir);
  copyDirectorySync(sourceDir, skillDir);
}

function findSkillFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    return [];
  }

  const skillFiles: string[] = [];
  const visit = (currentDir: string): void => {
    const skillFile = path.join(currentDir, 'SKILL.md');
    if (fs.existsSync(skillFile) && fs.statSync(skillFile).isFile()) {
      skillFiles.push(skillFile);
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      const entryPath = path.join(currentDir, entry.name);
      const isDirectory = entry.isDirectory() || entry.isSymbolicLink();
      if (isDirectory) {
        try {
          if (fs.statSync(entryPath).isDirectory()) {
            visit(entryPath);
          }
        } catch {
          // Ignore entries that disappear during runtime refresh.
        }
      }
    }
  };

  visit(rootDir);
  return skillFiles;
}

export function applyTeamcenterBaseUrlToSkillDescriptions(
  runtimeSkillsDir: string,
  teamcenterUrls: string | TeamcenterSkillUrlConfig
): TeamcenterSkillSubstitutionResult {
  const normalizedUrls = normalizeTeamcenterSkillUrls(teamcenterUrls);
  let updatedCount = 0;

  for (const skillFile of findSkillFiles(runtimeSkillsDir)) {
    const skillDir = path.dirname(skillFile);
    const currentContent = fs.readFileSync(skillFile, 'utf8');
    const templatePath = path.join(skillDir, TEAMCENTER_SKILL_TEMPLATE_FILENAME);
    const existingTemplate = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf8')
      : null;
    const templateContent = existingTemplate ?? currentContent;

    if (!TEAMCENTER_URL_PLACEHOLDERS.some((placeholder) => templateContent.includes(placeholder))) {
      continue;
    }

    materializeSkillDirectoryIfNeeded(skillDir);

    if (!existingTemplate) {
      fs.writeFileSync(templatePath, templateContent, 'utf8');
    }

    let nextContent = templateContent;
    nextContent = replacePlaceholderIfConfigured(
      nextContent,
      TEAMCENTER_BASE_URL_PLACEHOLDER,
      normalizedUrls.baseUrl
    );
    nextContent = replacePlaceholderIfConfigured(
      nextContent,
      TEAMCENTER_RICH_CLIENT_MICROSERVICE_URL_PLACEHOLDER,
      normalizedUrls.richClientMicroserviceUrl
    );
    nextContent = replacePlaceholderIfConfigured(
      nextContent,
      TEAMCENTER_WEB_TIER_URL_PLACEHOLDER,
      normalizedUrls.webTierUrl
    );
    nextContent = replacePlaceholderIfConfigured(
      nextContent,
      KNOWLEDGE_BASE_HTTP_URL_PLACEHOLDER,
      normalizedUrls.knowledgeBaseHttpUrl
    );

    const materializedSkillFile = path.join(skillDir, 'SKILL.md');
    if (fs.readFileSync(materializedSkillFile, 'utf8') !== nextContent) {
      fs.writeFileSync(materializedSkillFile, nextContent, 'utf8');
      updatedCount += 1;
    }
  }

  return { updatedCount };
}
