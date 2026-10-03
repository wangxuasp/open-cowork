import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const skillsRoot = path.resolve(__dirname, '../../../.claude/skills');

function readSkill(name: string): string {
  return fs.readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8');
}

function descriptionOf(skill: string): string {
  const frontMatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const description = frontMatter.match(/description:\s*["']?([^"'\r\n]+)["']?/)?.[1] ?? '';
  return description.trim();
}

describe('knowledge chat skill routing', () => {
  const systemChat = readSkill('system-chat');
  const processChat = readSkill('process-chat');
  const systemDescription = descriptionOf(systemChat);
  const processDescription = descriptionOf(processChat);

  it('sends software usage questions to /api/qdrant/chat and keeps process questions out', () => {
    expect(systemDescription).toContain('/api/qdrant/chat');
    expect(systemDescription).toMatch(/Teamcenter|NX/);
    expect(systemDescription).toContain('工艺');
    expect(systemDescription).not.toMatch(/检索问答|RAG 问答|知识库聊天|向量库问答/);
  });

  it('sends process questions to /api/chat and forbids the qdrant route', () => {
    expect(processDescription).toContain('/api/chat');
    expect(processDescription).toContain('工艺');
    expect(processDescription).toMatch(/禁止使用 \/api\/qdrant\/chat|不要使用 \/api\/qdrant\/chat/);
    expect(processDescription).not.toMatch(/检索问答|RAG 问答/);
  });

  it('does not tell the process skill to call Qdrant Chat', () => {
    expect(processChat).not.toContain('调用 Qdrant Chat');
    expect(processChat).not.toContain('Qdrant Chat 服务');
    expect(processChat).toContain('/api/chat');
  });

  it('reads the process chat JSON fields instead of a stream', () => {
    expect(processChat).toContain('hitProcesses');
    expect(processChat).toContain('drawingNo');
    expect(processChat).toContain('usedVectorFallback');
    expect(processChat).not.toContain('"question": "工艺问题"');
    expect(processChat).not.toContain('"关键字1"');
  });
});
