#!/usr/bin/env node
/**
 * Orchestrate extract-structure for all batches and emit batch-*.json graph files
 * with Chinese summaries (structural heuristics).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = 'c:/My Projects/Codes/open-cowork';
const SKILL_DIR =
  'C:/Users/wangx/.cursor/plugins/cache/understand-anything/understand-anything/f6a4fa36ccaf5b7edbc50d2006ee07beaf488c5e/skills/understand';
const INTER = join(PROJECT_ROOT, '.understand-anything/intermediate');
const TMP = join(PROJECT_ROOT, '.understand-anything/tmp');

const batches = JSON.parse(readFileSync(join(INTER, 'batches.json'), 'utf8'));

function nodeTypeForCategory(cat, path) {
  if (cat === 'config') return 'config';
  if (cat === 'docs') return 'document';
  if (cat === 'infra') {
    if (/workflows|gitlab-ci|jenkins|circleci/i.test(path)) return 'pipeline';
    if (/\.tf$|tfvars|cloudformation/i.test(path)) return 'resource';
    return 'service';
  }
  if (cat === 'data') {
    if (/\.sql$/i.test(path)) return 'table';
    if (/\.(graphql|gql|proto|prisma)$/i.test(path)) return 'schema';
    return 'schema';
  }
  return 'file';
}

function nodeId(type, path, name) {
  const prefix =
    type === 'file'
      ? 'file'
      : type === 'config'
        ? 'config'
        : type === 'document'
          ? 'document'
          : type === 'service'
            ? 'service'
            : type === 'pipeline'
              ? 'pipeline'
              : type === 'resource'
                ? 'resource'
                : type === 'table'
                  ? 'table'
                  : type === 'schema'
                    ? 'schema'
                    : type === 'function'
                      ? 'function'
                      : type === 'class'
                        ? 'class'
                        : 'file';
  if (name) return `${prefix}:${path}:${name}`;
  if (prefix === 'file' || prefix === 'config' || prefix === 'document') return `${prefix}:${path}`;
  return `${prefix}:${path}`;
}

function complexity(nonEmpty) {
  if (nonEmpty < 50) return 'simple';
  if (nonEmpty <= 200) return 'moderate';
  return 'complex';
}

function tagsFor(path, cat, metrics = {}) {
  const base = basename(path).toLowerCase();
  const tags = [];
  if (/\.(test|spec)\./i.test(path) || /test_/i.test(path)) tags.push('test');
  if (base === 'index.ts' || base === 'index.tsx' || base === 'main.ts') tags.push('entry-point');
  if (/agent-runner|main\/index/i.test(path)) tags.push('entry-point', 'service');
  if (/mcp|connector/i.test(path)) tags.push('service', 'integration');
  if (/memory|context/i.test(path)) tags.push('service');
  if (/sandbox|wsl|lima/i.test(path)) tags.push('infrastructure', 'security');
  if (/renderer|components/i.test(path)) tags.push('component', 'ui');
  if (/store|selector/i.test(path)) tags.push('state-management');
  if (/config/i.test(path) || cat === 'config') tags.push('configuration');
  if (cat === 'docs') tags.push('documentation');
  if (cat === 'infra') tags.push('infrastructure');
  if ((metrics.functionCount || 0) > 5) tags.push('utility');
  const uniq = [...new Set(tags)].slice(0, 5);
  return uniq.length ? uniq : [cat === 'code' ? 'module' : cat];
}

function zhSummary(path, cat, result) {
  const name = basename(path);
  const fn = result.metrics?.functionCount || (result.functions?.length ?? 0);
  const cls = result.metrics?.classCount || (result.classes?.length ?? 0);
  if (cat === 'docs') return `文档文件 ${name}，共约 ${result.nonEmptyLines || 0} 行有效内容。`;
  if (cat === 'config') return `配置文件 ${name}，定义项目或运行时的关键参数与依赖。`;
  if (cat === 'infra') return `基础设施定义 ${name}，描述部署、容器或 CI/CD 相关设置。`;
  if (cat === 'data') return `数据/模式文件 ${name}，包含结构化数据或 API 模式定义。`;
  if (fn === 0 && cls === 0)
    return `源码模块 ${path}，体量 ${result.nonEmptyLines || 0} 行，承担项目中的辅助或声明性逻辑。`;
  if (cls > 0)
    return `TypeScript/JavaScript 模块 ${path}，导出 ${cls} 个类与 ${fn} 个函数，是应用逻辑的一部分。`;
  return `源码模块 ${path}，包含 ${fn} 个函数，约 ${result.nonEmptyLines || 0} 行有效代码。`;
}

function graphFromExtraction(batch, extractJson) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  const addNode = (n) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    nodes.push(n);
  };
  const addEdge = (e) => edges.push(e);

  for (const r of extractJson.results || []) {
    const type = nodeTypeForCategory(r.fileCategory, r.path);
    const fileNodeId = nodeId(type, r.path);
    addNode({
      id: fileNodeId,
      type,
      name: basename(r.path),
      filePath: r.path,
      summary: zhSummary(r.path, r.fileCategory, r),
      tags: tagsFor(r.path, r.fileCategory, r.metrics),
      complexity: complexity(r.nonEmptyLines || 0),
      language: r.language,
    });

    const imports = batch.batchImportData?.[r.path] || [];
    for (const imp of imports) {
      const impType = nodeTypeForCategory('code', imp);
      addEdge({
        source: fileNodeId,
        target: nodeId(impType, imp),
        type: 'imports',
        weight: 0.7,
      });
    }

    for (const fn of r.functions || []) {
      const lines = (fn.endLine || 0) - (fn.startLine || 0) + 1;
      const exported = (r.exports || []).some((e) => e.name === fn.name);
      if (lines < 10 && !exported) continue;
      const fid = nodeId('function', r.path, fn.name);
      addNode({
        id: fid,
        type: 'function',
        name: fn.name,
        filePath: r.path,
        summary: `函数 ${fn.name}，位于 ${r.path} 第 ${fn.startLine}-${fn.endLine} 行。`,
        tags: tagsFor(r.path, r.fileCategory),
        complexity: lines < 30 ? 'simple' : lines < 80 ? 'moderate' : 'complex',
        language: r.language,
      });
      addEdge({ source: fileNodeId, target: fid, type: 'contains', weight: 1.0 });
    }

    for (const cls of r.classes || []) {
      const lines = (cls.endLine || 0) - (cls.startLine || 0) + 1;
      const methods = cls.methods?.length || 0;
      if (lines < 20 && methods < 2) continue;
      const cid = nodeId('class', r.path, cls.name);
      addNode({
        id: cid,
        type: 'class',
        name: cls.name,
        filePath: r.path,
        summary: `类 ${cls.name}，含 ${methods} 个方法，位于 ${r.path}。`,
        tags: [...tagsFor(r.path, r.fileCategory), 'type-definition'],
        complexity: complexity(lines),
        language: r.language,
      });
      addEdge({ source: fileNodeId, target: cid, type: 'contains', weight: 1.0 });
    }

    for (const cg of r.callGraph || []) {
      const src = nodeId('function', r.path, cg.caller);
      const tgtLocal = nodeId('function', r.path, cg.callee);
      if (seen.has(src)) {
        addEdge({ source: src, target: tgtLocal, type: 'calls', weight: 0.8 });
      }
    }
  }

  return { nodes, edges };
}

mkdirSync(TMP, { recursive: true });

for (const batch of batches.batches) {
  const idx = batch.batchIndex;
  const inputPath = join(TMP, `ua-file-analyzer-input-${idx}.json`);
  const extractPath = join(TMP, `ua-file-extract-results-${idx}.json`);
  const outPath = join(INTER, `batch-${idx}.json`);

  writeFileSync(
    inputPath,
    JSON.stringify({
      projectRoot: PROJECT_ROOT,
      batchFiles: batch.files,
      batchImportData: batch.batchImportData,
    })
  );

  const run = spawnSync(
    'node',
    [join(SKILL_DIR, 'extract-structure.mjs'), inputPath, extractPath],
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
  );
  if (run.status !== 0) {
    console.error(`batch ${idx} extract failed:`, run.stderr?.slice(0, 500));
    continue;
  }

  const extractJson = JSON.parse(readFileSync(extractPath, 'utf8'));
  const graph = graphFromExtraction(batch, extractJson);
  writeFileSync(outPath, JSON.stringify(graph, null, 2));
  console.log(`batch-${idx}: nodes=${graph.nodes.length} edges=${graph.edges.length}`);
}

console.log('done');
