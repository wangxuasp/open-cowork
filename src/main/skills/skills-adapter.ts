import type { SkillsManager } from './skills-manager';

export type SkillSource = 'builtin' | 'user' | 'configured';

export interface SkillsAdapter {
  isSkillEnabled(source: SkillSource, directoryName: string): boolean;
  getEnabledSkillSignature(): string;
}

export function createSkillsAdapter(skillsManager: SkillsManager): SkillsAdapter {
  return {
    isSkillEnabled(source, directoryName) {
      return skillsManager.isSkillEnabledByDirectory(source, directoryName);
    },
    getEnabledSkillSignature() {
      return JSON.stringify(skillsManager.getEnabledSkillIds());
    },
  };
}
