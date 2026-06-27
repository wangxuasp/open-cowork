#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'c:/My Projects/Codes/open-cowork';
const INTER = join(ROOT, '.understand-anything/intermediate');
const graph = JSON.parse(readFileSync(join(INTER, 'assembled-graph.json'), 'utf8'));

const fileLevel = graph.nodes.filter((n) =>
  ['file', 'config', 'document', 'service', 'pipeline', 'schema', 'resource'].includes(n.type)
);

function layerForNode(n) {
  const p = n.filePath || n.id.replace(/^[^:]+:/, '');
  if (p.startsWith('src/main/claude') || p.includes('agent-runner')) return 'layer:agent-runtime';
  if (p.startsWith('src/main/memory')) return 'layer:memory';
  if (p.startsWith('src/main/mcp') || p.includes('mcp')) return 'layer:mcp-integration';
  if (p.startsWith('src/main/sandbox')) return 'layer:sandbox';
  if (p.startsWith('src/main/remote')) return 'layer:remote-channels';
  if (p.startsWith('src/main/')) return 'layer:electron-main';
  if (p.startsWith('src/renderer/')) return 'layer:renderer-ui';
  if (p.startsWith('src/shared/')) return 'layer:shared';
  if (p.startsWith('tests/') || p.startsWith('src/tests/')) return 'layer:tests';
  if (p.startsWith('.claude/skills/')) return 'layer:skills';
  if (p.startsWith('scripts/')) return 'layer:build-scripts';
  if (n.type === 'document' || p.endsWith('.md')) return 'layer:documentation';
  if (n.type === 'config' || /\.(json|yml|yaml|toml)$/i.test(p)) return 'layer:configuration';
  return 'layer:other';
}

const layerDefs = {
  'layer:electron-main': {
    name: 'Electron 主进程',
    description: '桌面应用主进程：会话、IPC、配置、工具执行与系统集成。',
  },
  'layer:agent-runtime': {
    name: 'Agent 运行时',
    description: 'Claude/Pi SDK 代理执行、模型解析、上下文压缩与消息桥接。',
  },
  'layer:renderer-ui': {
    name: '渲染进程 UI',
    description: 'React 前端：聊天界面、设置面板、上下文面板与状态管理。',
  },
  'layer:memory': {
    name: '记忆系统',
    description: '长期记忆抽取、检索、导航与 prompt 注入。',
  },
  'layer:mcp-integration': {
    name: 'MCP 集成',
    description: 'Model Context Protocol 连接器与外部工具桥接。',
  },
  'layer:sandbox': {
    name: '沙箱隔离',
    description: 'WSL/Lima 虚拟机隔离与路径安全。',
  },
  'layer:remote-channels': {
    name: '远程通道',
    description: '飞书、Slack 等远程控制与消息路由。',
  },
  'layer:shared': {
    name: '共享模块',
    description: '主进程与渲染进程共用的类型与工具。',
  },
  'layer:skills': {
    name: 'Skills 技能库',
    description: '内置与可扩展技能（文档、BOM、数据集等）。',
  },
  'layer:tests': {
    name: '测试',
    description: '单元测试与集成测试。',
  },
  'layer:build-scripts': {
    name: '构建脚本',
    description: '打包、下载依赖与平台构建脚本。',
  },
  'layer:configuration': {
    name: '配置',
    description: '项目与应用配置文件。',
  },
  'layer:documentation': {
    name: '文档',
    description: 'README、技能说明与开发文档。',
  },
  'layer:other': {
    name: '其他',
    description: '未归入上述分层的文件。',
  },
};

const buckets = new Map();
for (const n of fileLevel) {
  const lid = layerForNode(n);
  if (!buckets.has(lid)) buckets.set(lid, []);
  buckets.get(lid).push(n.id);
}

const layers = [...buckets.entries()].map(([id, nodeIds]) => ({
  id,
  name: layerDefs[id]?.name || id,
  description: layerDefs[id]?.description || '',
  nodeIds: [...new Set(nodeIds)].sort(),
}));

const tour = [
  {
    order: 1,
    title: '项目概览',
    description: '从 README 了解 Omni Worker（Open Cowork）的定位：开源 AI Agent 桌面应用。',
    nodeIds: ['document:README.md', 'document:README_zh.md'].filter((id) =>
      graph.nodes.some((n) => n.id === id)
    ),
  },
  {
    order: 2,
    title: '应用入口',
    description: 'Electron 主进程入口与窗口生命周期。',
    nodeIds: ['file:src/main/index.ts'].filter((id) => graph.nodes.some((n) => n.id === id)),
  },
  {
    order: 3,
    title: 'Agent 执行核心',
    description: 'ClaudeAgentRunner：模型解析、Pi SDK 会话、上下文压缩与工具调用。',
    nodeIds: ['file:src/main/claude/agent-runner.ts'].filter((id) =>
      graph.nodes.some((n) => n.id === id)
    ),
    languageLesson: '长对话时 auto-compaction 由 Pi SDK 触发；UI 显示的 token 占用可能低于真实 payload。',
  },
  {
    order: 4,
    title: '前端聊天界面',
    description: 'React 渲染进程：ChatView、ContextPanel 与 IPC 通信。',
    nodeIds: [
      'file:src/renderer/components/ChatView.tsx',
      'file:src/renderer/components/ContextPanel.tsx',
      'file:src/renderer/hooks/useIPC.ts',
    ].filter((id) => graph.nodes.some((n) => n.id === id)),
  },
  {
    order: 5,
    title: '记忆与上下文',
    description: 'MemoryService 渐进检索与 MemoryExtension 在运行前注入记忆前缀。',
    nodeIds: [
      'file:src/main/memory/memory-service.ts',
      'file:src/main/memory/memory-extension.ts',
      'file:src/main/memory/memory-manager.ts',
    ].filter((id) => graph.nodes.some((n) => n.id === id)),
  },
  {
    order: 6,
    title: 'MCP 与沙箱',
    description: '外部工具连接与 VM 级隔离执行环境。',
    nodeIds: [
      'file:src/main/mcp/mcp-manager.ts',
      'file:src/main/sandbox/sandbox-manager.ts',
    ].filter((id) => graph.nodes.some((n) => n.id === id)),
  },
].filter((s) => s.nodeIds.length > 0);

writeFileSync(join(INTER, 'layers.json'), JSON.stringify(layers, null, 2));
writeFileSync(join(INTER, 'tour.json'), JSON.stringify(tour, null, 2));
console.log('layers', layers.length, 'tour', tour.length);
