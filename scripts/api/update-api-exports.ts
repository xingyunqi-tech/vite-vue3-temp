/**
 * ==================== API 导出更新脚本 ====================
 *
 * 功能：自动扫描 src/api/generated/ 和 src/api/modules/ 目录，更新 src/api/index.ts 的导出语句
 *
 * 执行时机：在 Orval 生成 API 代码后自动执行（通过 orval.config.ts 的 hooks 配置）
 *
 * 工作流程：
 * 1. 扫描 src/api/generated/ 下的所有模块目录（排除 model）
 * 2. 扫描 src/api/modules/ 下的所有 .ts 文件（排除 .d.ts），提取值导出名
 * 3. 生成导出语句：generated 函数显式导出，其中与 modules 导出同名的剔除；modules 用 `export *`
 * 4. 更新 src/api/index.ts 文件
 *
 * 特性：
 * - ✅ 自动发现 generated 模块并提取函数名
 * - ✅ 自动发现 modules 目录下的所有自定义模块
 * - ✅ 支持多个自定义模块文件（upload.ts, download.ts, auth.ts 等）
 * - ✅ 按字母顺序排序，保持导出顺序一致
 * - ✅ modules 里的同名函数覆盖 generated 版本
 * - ✅ 详细的控制台输出，便于调试
 *
 * 使用示例：
 * 1. 在 modules/ 目录新增 upload.ts
 * 2. 运行 pnpm orval
 * 3. 脚本自动检测并导出 modules/upload.ts
 *
 * 覆盖优先级：ESM 里显式命名导出压过 `export *` 中的同名绑定且不报错，
 * 所以被 modules 覆盖的 generated 函数不进入显式导出清单，覆盖版本才能对外生效。
 *
 * ⚠️ 本文件是 admin 与 h5 两个模版真源共用的实现，应逐字节相同。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const GENERATED_DIR = path.join(PROJECT_ROOT, 'src/api/generated');
const CUSTOM_DIR = path.join(PROJECT_ROOT, 'src/api/modules');
const API_INDEX_FILE = path.join(PROJECT_ROOT, 'src/api/index.ts');

/** 生成模块信息 */
interface GeneratedModule {
  name: string;
  functions: string[];
}

/** 自定义模块信息（name 为文件名，不含扩展名） */
interface CustomModule {
  name: string;
  exports: string[];
}

/** 去掉块注释与整行行注释，注释里的示例代码不参与导出名识别 */
function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * 从生成模块文件中提取导出的函数名
 *
 * 只认 `export const name =`，不限定右侧参数列表形态；`export type XxxResult = ...` 天然不匹配。
 * @param modulePath 模块文件路径
 * @returns 导出的函数名列表
 */
function extractExportedFunctions(modulePath: string): string[] {
  try {
    const content = fs.readFileSync(modulePath, 'utf-8');
    const functionPattern = /export\s+const\s+(\w+)\s*=/g;
    return Array.from(content.matchAll(functionPattern), match => match[1]);
  } catch (error) {
    console.error(`提取函数失败 (${modulePath}):`, error);
    return [];
  }
}

/**
 * 从自定义模块文件中提取所有值导出名（用于剔除 generated 的同名显式导出）
 *
 * 识别：`export const/let/var name`、`export function name`、`export class name`、
 * `export { a, b as c }`（取对外名）。`export type` / `export interface` 不参与：类型不构成覆盖。
 * @param modulePath 模块文件路径
 * @returns 导出名列表
 */
function extractExportedNames(modulePath: string): string[] {
  try {
    const content = stripComments(fs.readFileSync(modulePath, 'utf-8'));
    const names = new Set<string>();

    const variablePattern = /export\s+(?:const|let|var)\s+(\w+)\s*[=:]/g;
    const functionPattern = /export\s+(?:async\s+)?function\s*\*?\s*(\w+)/g;
    const classPattern = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
    const bracePattern = /export\s+(?!type\s*\{)\{([^}]*)\}/g;

    for (const pattern of [variablePattern, functionPattern, classPattern]) {
      for (const match of content.matchAll(pattern)) names.add(match[1]);
    }
    for (const match of content.matchAll(bracePattern)) {
      match[1]
        .split(',')
        .map(part => part.trim())
        .filter(part => part && !part.startsWith('type '))
        .forEach(part => {
          const alias = part.split(/\s+as\s+/);
          const exposed = (alias[1] ?? alias[0]).trim();
          if (/^\w+$/.test(exposed) && exposed !== 'default') names.add(exposed);
        });
    }

    return [...names];
  } catch (error) {
    console.error(`提取导出名失败 (${modulePath}):`, error);
    return [];
  }
}

/**
 * 扫描 generated 目录，获取所有 API 模块及其函数
 * @returns API 模块信息列表
 */
function scanGeneratedModules(): GeneratedModule[] {
  try {
    const entries = fs.readdirSync(GENERATED_DIR, { withFileTypes: true });

    return entries
      .filter(entry => {
        // 只保留目录
        if (!entry.isDirectory()) return false;

        // 排除 model 目录（类型定义单独导出）
        if (entry.name === 'model') return false;

        // 检查目录下是否有 .ts 文件
        const modulePath = path.join(GENERATED_DIR, entry.name);
        const files = fs.readdirSync(modulePath);
        return files.some(file => file.endsWith('.ts'));
      })
      .map(entry => {
        const moduleName = entry.name;
        const modulePath = path.join(GENERATED_DIR, moduleName, `${moduleName}.ts`);
        const functions = extractExportedFunctions(modulePath);
        return { name: moduleName, functions };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // 按字母排序
  } catch (error) {
    console.error('扫描 generated 目录失败:', error);
    return [];
  }
}

/**
 * 扫描 modules 目录，获取所有自定义模块及其导出名
 * @returns 自定义模块信息列表
 */
function scanCustomModules(): CustomModule[] {
  try {
    // 检查 modules 目录是否存在
    if (!fs.existsSync(CUSTOM_DIR)) {
      console.log('ℹ️  modules 目录不存在，跳过自定义模块扫描');
      return [];
    }

    const entries = fs.readdirSync(CUSTOM_DIR, { withFileTypes: true });

    return entries
      .filter(entry => {
        // 只保留 .ts 文件（排除 .d.ts）
        return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts');
      })
      .map(entry => ({
        // 移除 .ts 扩展名
        name: entry.name.replace(/\.ts$/, ''),
        exports: extractExportedNames(path.join(CUSTOM_DIR, entry.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // 按字母排序
  } catch (error) {
    console.error('扫描 modules 目录失败:', error);
    return [];
  }
}

/**
 * 生成 API 导出代码
 * @param modules API 模块信息列表
 * @param customModules 自定义模块列表
 * @returns 完整的 index.ts 内容
 */
function generateIndexContent(modules: GeneratedModule[], customModules: CustomModule[]): string {
  // modules/ 导出的所有名字：generated 的同名显式导出必须让位，否则覆盖不生效
  const overriddenNames = new Set(customModules.flatMap(({ exports }) => exports));

  // 生成 generated 模块导出语句（剔除被 modules/ 覆盖的名字）
  const exportStatements = modules
    .map(({ name, functions }) => {
      const kept = functions.filter(fn => !overriddenNames.has(fn));
      const shadowed = functions.filter(fn => overriddenNames.has(fn));
      if (kept.length === 0) {
        return `// './generated/${name}/${name}' 的导出全部被 modules/ 覆盖：${shadowed.join(', ')}`;
      }
      const funcList = kept.join(',\n  ');
      const note =
        shadowed.length > 0 ? `// 以下函数由 modules/ 覆盖，故不从 generated 导出：${shadowed.join(', ')}\n` : '';
      return `${note}export {\n  ${funcList},\n} from './generated/${name}/${name}';`;
    })
    .join('\n\n');

  // 生成 modules 模块导出语句
  const customExportStatements =
    customModules.length > 0 ? customModules.map(({ name }) => `export * from './modules/${name}';`).join('\n') : '';

  return `/**
 * ==================== API 模块统一导出 ====================
 *
 * ⚠️ 本文件由 \`pnpm orval\` 的 afterAllFilesWrite 钩子（scripts/api/update-api-exports.ts）
 * 自动生成，请勿手写：下次生成会整份覆盖。要调整导出，改那个脚本。
 *
 * 使用指南：
 * - API 函数：import { getAuthUserInfo } from '@/api'
 * - 类型定义：import type { UserInfoResult } from '@/api'
 */

/**
 * ==================== 导出策略 ====================
 *
 * 0. 先 star 导出 core（HttpClient 实例与请求工具），绕过 Orval 直接发请求时从 @/api 取
 * 1. 再导出 model 里的类型定义（接口、枚举等）
 * 2. 再显式导出各 generated 模块的 API 函数（只导函数，不导 *Result 类型别名）
 * 3. 最后 star 导出 modules/ 里的自定义扩展与工具函数
 *
 * 为什么第 2 步用显式导出而不是 \`export *\`：
 * - model 里的接口（如 UploadCertificateResult）是后端返回的数据结构
 * - generated 模块里的同名类型别名是整个响应的类型
 * - 两者同名不同义，两个 \`export *\` 撞名会让该名字变成歧义导出
 *
 * 为什么被 modules/ 覆盖的函数不出现在第 2 步：
 * - ESM 里显式导出压过 \`export *\`，generated 显式导出了同名函数的话，
 *   modules/ 的覆盖版本永远拿不到（且不报错）。所以生成时已把它们剔除。
 */

// 0. HTTP 客户端与便捷请求函数
// 消费方统一从 @/api 取，无需知道 core/ 的内部结构
export * from './core';

// 1. 从 model 目录导出所有类型定义 (优先导出)
export * from './generated/model';

// 2. 自动生成的 API 函数 (只导出函数,不导出类型)
${exportStatements}

// 3. 自定义工具函数 (自动扫描 modules 目录)
${customExportStatements}
`;
}

/**
 * 主函数
 */
function main() {
  console.log('🔄 开始更新 API 导出文件...\n');

  // 1. 扫描 generated 模块
  console.log('📂 扫描 generated 目录...');
  const modules = scanGeneratedModules();

  if (modules.length === 0) {
    // 常见原因：orval.config.ts 的 input.target 还留空，或本次生成没产出任何模块目录。
    // 此时不改 src/api/index.ts —— 覆盖成「只有 modules 导出」会把已有的 generated 导出抹掉。
    console.log('⚠️  未找到任何 generated API 模块，保持 src/api/index.ts 不变');
    return;
  }

  console.log(`✅ 找到 ${modules.length} 个生成模块:`);
  modules.forEach(({ name }) => console.log(`   - ${name}`));
  console.log();

  // 2. 扫描 modules 模块
  console.log('📂 扫描 modules 目录...');
  const customModules = scanCustomModules();

  if (customModules.length > 0) {
    console.log(`✅ 找到 ${customModules.length} 个自定义模块:`);
    customModules.forEach(({ name, exports }) => console.log(`   - ${name} (${exports.length} 个导出)`));
  } else {
    console.log('ℹ️  未找到自定义模块');
  }
  console.log();

  // 3. 生成内容
  console.log('📝 生成导出代码...');
  const content = generateIndexContent(modules, customModules);

  // 4. 写入文件
  console.log('💾 更新 src/api/index.ts...');
  fs.writeFileSync(API_INDEX_FILE, content, 'utf-8');

  console.log('✅ API 导出文件更新完成!\n');

  // 5. 显示导出信息
  console.log('📋 导出统计:');
  console.log(`   生成模块: ${modules.length} 个`);
  modules.forEach(({ name, functions }) => {
    console.log(`     - ${name}: ${functions.length} 个函数`);
  });
  console.log(`   自定义模块: ${customModules.length} 个`);
  customModules.forEach(({ name, exports }) => {
    console.log(`     - ${name}: ${exports.join(', ') || '（无值导出）'}`);
  });

  // 覆盖情况单独打出来：这是「同名覆盖是否真的生效」的唯一可见凭据
  const overriddenNames = new Set(customModules.flatMap(({ exports }) => exports));
  const shadowed = modules.flatMap(({ name, functions }) =>
    functions.filter(fn => overriddenNames.has(fn)).map(fn => `${fn} (generated/${name})`),
  );
  if (shadowed.length > 0) {
    console.log(`   modules/ 覆盖了 ${shadowed.length} 个 generated 函数:`);
    shadowed.forEach(item => console.log(`     - ${item}`));
  }
  console.log();
}

// 执行
main();
