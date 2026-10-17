import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * 常量链不成环
 *
 * `@/constants` 在模块加载期同步消费这条链，链上任何模块回指 `@/constants` 都会让常量读到
 * undefined。ESLint 的 restricted-imports 只看直接 import 路径，抓不到「经中间模块绕回去」，
 * 这里按静态依赖图走一遍。
 */
const SRC = resolve(__dirname, '../../src');
const OVERRIDES = join(SRC, 'overrides');

/** 租户自己的常量入口随目录增减，扫出来而不是写死 */
function tenantConstantsModules(): string[] {
  if (!existsSync(OVERRIDES)) return [];
  return readdirSync(OVERRIDES, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `overrides/${entry.name}/constants.ts`)
    .filter(file => existsSync(join(SRC, file)));
}

const CHAIN_MODULES = [
  'overrides/constants.ts',
  'overrides/registry.ts',
  'overrides/deployment.ts',
  'plugins/override/override-constants.ts',
  ...tenantConstantsModules(),
].filter(file => existsSync(join(SRC, file)));

/** 只统计静态值导入：import type 会被编译擦除，动态 import 不参与模块初始化 */
const STATIC_VALUE_IMPORT = /^\s*import\s+(?!type\s)(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/gm;

function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(join(SRC, from), '..', spec);
  else return null;

  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function staticDeps(file: string): string[] {
  const content = readFileSync(join(SRC, file), 'utf-8');
  return Array.from(content.matchAll(STATIC_VALUE_IMPORT))
    .map(match => resolveSpec(match[1], file))
    .filter((path): path is string => path !== null);
}

describe('常量链', () => {
  it('链上模块的静态依赖不回指 @/constants', () => {
    const entry = join(SRC, 'constants/index.ts');
    const visited = new Set<string>();
    const offenders: string[] = [];

    const walk = (file: string, trail: string[]) => {
      for (const dep of staticDeps(file)) {
        if (dep === entry) {
          offenders.push([...trail, dep].join(' -> '));
          continue;
        }
        if (visited.has(dep)) continue;
        visited.add(dep);
        walk(dep.slice(SRC.length + 1), [...trail, dep]);
      }
    };

    for (const module of CHAIN_MODULES) walk(module, [module]);
    expect(offenders).toEqual([]);
  });

  it('链上模块不引内核 barrel @/plugins/override', () => {
    // barrel 会把 api/core/request 拖进这条链，而它自己就依赖 @/constants
    const barrel = join(SRC, 'plugins/override/index.ts');
    const offenders = CHAIN_MODULES.filter(file => staticDeps(file).includes(barrel));

    expect(offenders).toEqual([]);
  });
});
