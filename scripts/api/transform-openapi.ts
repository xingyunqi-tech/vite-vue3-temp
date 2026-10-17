/**
 * OpenAPI 文档转换器
 *
 * 功能：
 * 1. 根据 API 路径自动生成英文 tag 名称
 *    例如: /api/teachers/xxx → tag: teachers
 *
 * 2. 为通用 operationId 添加路径上下文前缀，避免命名冲突
 *    例如: /api/teachers 的 getById → getTeacherById
 *          /api/students 的 getById → getStudentById
 *          /api/student/competitions 的 getById → getStudentCompetitionById
 *
 * 原理：
 * - 提取路径中的资源段（排除参数和动作段）
 * - 将资源段组合成语义化的前缀
 * - 对通用操作名添加资源前缀
 * - 保留已有明确语义的操作名（如 uploadCertificate, parseExcel）
 *
 * 设计原则：
 * - 不包含任何业务特定的路径或名称
 * - 使用通用规则识别动作段和资源段
 * - API 前缀可配置
 */

import type { OpenAPIObject, OperationObject, PathItemObject } from 'openapi3-ts/oas30';

// ==================== 配置 ====================

/**
 * API 路径前缀（可根据项目配置修改）
 */
const API_PREFIX = '/api/v1';

// ==================== 通用工具函数 ====================

/**
 * 将 kebab-case 转换为 PascalCase
 * competition-news → CompetitionNews
 * award-records → AwardRecords
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * 将复数形式转换为单数形式
 * Teachers → Teacher
 * Competitions → Competition
 * AwardRecords → AwardRecord
 */
function toSingular(pascalCase: string): string {
  if (pascalCase.endsWith('ies')) {
    return pascalCase.slice(0, -3) + 'y';
  }
  if (
    pascalCase.endsWith('ses') ||
    pascalCase.endsWith('xes') ||
    pascalCase.endsWith('ches') ||
    pascalCase.endsWith('shes')
  ) {
    return pascalCase.slice(0, -2);
  }
  if (pascalCase.endsWith('s') && !pascalCase.endsWith('ss')) {
    return pascalCase.slice(0, -1);
  }
  return pascalCase;
}

// ==================== 路径解析 ====================

/**
 * 移除路径的 API 前缀
 */
function removeApiPrefix(path: string): string {
  if (path.startsWith(API_PREFIX + '/')) {
    return path.slice(API_PREFIX.length + 1);
  }
  if (path.startsWith(API_PREFIX)) {
    return path.slice(API_PREFIX.length);
  }
  // 如果没有前缀，移除开头的斜杠
  return path.startsWith('/') ? path.slice(1) : path;
}

/**
 * 从路径中提取模块名（用于 tag 分组）
 * /api/teachers/xxx → teachers
 * /api/student/competitions → student
 */
function extractModuleFromPath(path: string): string {
  const pathWithoutPrefix = removeApiPrefix(path);
  const firstSegment = pathWithoutPrefix.split('/')[0];
  return firstSegment || 'default';
}

/**
 * 通用动作动词（这些通常是动作而不是资源名）
 * 使用动词词根匹配，不包含业务特定名词
 */
const ACTION_VERBS = new Set([
  // 批量操作
  'batch',
  // 导入导出
  'export',
  'import',
  // 上传下载
  'upload',
  'download',
  // 确认解析
  'confirm',
  'parse',
  // 发布审核
  'publish',
  'published',
  'review',
  // 分页历史
  'page',
  'history',
  // 统计模板
  'statistics',
  'template',
  // 导航
  'navigation',
]);

/**
 * 判断一个路径段是否是动作段（而非资源名）
 * 规则：
 * 1. 是已知的动作动词
 * 2. 以 "by-" 开头（如 by-registration, by-user）
 * 3. 包含 "batch-" 前缀（如 batch-delete, batch-review）
 */
function isActionSegment(segment: string): boolean {
  // 已知动作动词
  if (ACTION_VERBS.has(segment)) {
    return true;
  }
  // by-xxx 模式（关联查询）
  if (segment.startsWith('by-')) {
    return true;
  }
  // batch-xxx 模式（批量操作）
  if (segment.startsWith('batch-')) {
    return true;
  }
  return false;
}

/**
 * 判断一个路径段是否是"关联资源上下文"
 * 这种情况出现在 /api/xxx/{关联资源}/{关联资源Id} 的模式中
 * 例如：/api/awards/competition/{competitionId}
 *       /api/registration-attachments/registration/{registrationId}
 *
 * 规则：如果当前段后面紧跟一个参数段（{xxxId}），则当前段是关联上下文
 */
function isRelationContextSegment(segment: string, nextSegment: string | undefined): boolean {
  if (!nextSegment) return false;

  // 检查下一段是否是参数段，且参数名包含当前段名（单数形式）
  // 例如：competition 后面是 {competitionId}
  if (nextSegment.startsWith('{') && nextSegment.endsWith('}')) {
    const paramName = nextSegment.slice(1, -1).toLowerCase(); // competitionId → competitionid
    const segmentLower = segment.toLowerCase().replace(/-/g, ''); // 移除连字符
    // 检查参数名是否以段名开头（忽略复数）
    const segmentSingular = segmentLower.endsWith('s') ? segmentLower.slice(0, -1) : segmentLower;
    return paramName.startsWith(segmentSingular);
  }
  return false;
}

/**
 * 从路径中提取主资源名（用于 operationId 前缀）
 *
 * 规则：
 * 1. 遍历路径段，遇到参数段（{id}）停止
 * 2. 跳过动作段和关联上下文段
 * 3. 最多取前2个资源段作为上下文
 *
 * 示例：
 * /api/teachers/{id} → Teacher / Teachers
 * /api/student/competitions/{id} → StudentCompetition / StudentCompetitions
 * /api/award-records/{id}/certificate → AwardRecord / AwardRecords
 * /api/registrations/batch-review → Registration / Registrations
 * /api/awards/competition/{competitionId} → Award / Awards (competition 是关联上下文)
 */
function extractResourceContext(path: string): { singular: string; plural: string } {
  // 移除 API 前缀
  const pathWithoutPrefix = removeApiPrefix(path);

  // 分割路径段
  const allSegments = pathWithoutPrefix.split('/').filter(s => s.length > 0);

  // 提取资源段（非参数、非动作、非关联上下文）
  const resourceSegments: string[] = [];
  for (let i = 0; i < allSegments.length; i++) {
    const seg = allSegments[i];
    const nextSeg = allSegments[i + 1];

    // 遇到参数段停止（参数段后面的通常是子操作）
    if (seg.startsWith('{') || seg.endsWith('}')) {
      break;
    }

    // 跳过动作段
    if (isActionSegment(seg)) {
      continue;
    }

    // 跳过关联上下文段（如 competition/{competitionId} 中的 competition）
    if (isRelationContextSegment(seg, nextSeg)) {
      continue;
    }

    resourceSegments.push(seg);

    // 最多取2层资源（父资源 + 子资源）
    if (resourceSegments.length >= 2) {
      break;
    }
  }

  // 如果没有找到资源段，返回默认值
  if (resourceSegments.length === 0) {
    return { singular: 'Default', plural: 'Defaults' };
  }

  // 将每个段转换为 PascalCase，并生成单数和复数形式
  const singularParts = resourceSegments.map(seg => toSingular(toPascalCase(seg)));
  const pluralPart = toPascalCase(resourceSegments[resourceSegments.length - 1]);

  return {
    singular: singularParts.join(''),
    plural: singularParts.slice(0, -1).join('') + pluralPart,
  };
}

// ==================== operationId 生成 ====================

/**
 * 操作类型枚举
 */
type OperationType = 'singular' | 'plural';

/**
 * 需要添加资源前缀的通用操作名
 *
 * 格式：operationName → [转换模板, 使用单数还是复数]
 * 模板中 {resource} 会被替换为资源名
 */
const GENERIC_OPERATIONS: Record<string, [string, OperationType]> = {
  // ==================== CRUD 基础操作 ====================
  getById: ['get{resource}ById', 'singular'],
  create: ['create{resource}', 'singular'],
  update: ['update{resource}', 'singular'],
  delete: ['delete{resource}', 'singular'],
  query: ['query{resource}', 'plural'],
  list: ['list{resource}', 'plural'],

  // ==================== 批量操作 ====================
  batchDelete: ['batchDelete{resource}', 'plural'],
  batchCreate: ['batchCreate{resource}', 'plural'],
  batchUpdate: ['batchUpdate{resource}', 'plural'],
  batchReview: ['batchReview{resource}', 'plural'],

  // ==================== 资源特定操作（需要加前缀避免冲突） ====================
  // 发布/审核类
  publish: ['publish{resource}', 'singular'],
  review: ['review{resource}', 'singular'],
  approve: ['approve{resource}', 'singular'],
  reject: ['reject{resource}', 'singular'],
  cancel: ['cancel{resource}', 'singular'],

  // 获取关联数据类
  getHistory: ['get{resource}History', 'singular'],
  getNavigation: ['get{resource}Navigation', 'singular'],
  getStatistics: ['get{resource}Statistics', 'singular'],
  getDetail: ['get{resource}Detail', 'singular'],

  // 导入导出类
  export: ['export{resource}', 'plural'],
  import: ['import{resource}', 'plural'],
};

/**
 * 应用转换模板
 */
function applyTemplate(template: string, resource: string): string {
  return template.replace('{resource}', resource);
}

/**
 * 生成带资源上下文的 operationId
 */
function generateOperationId(originalId: string, path: string): string {
  const { singular, plural } = extractResourceContext(path);

  // 移除后端可能添加的数字后缀（如 _1, _2, _3）
  const baseId = originalId.replace(/_\d+$/, '');

  // 检查是否是通用操作
  const operationConfig = GENERIC_OPERATIONS[baseId];
  if (operationConfig) {
    const [template, type] = operationConfig;
    const resource = type === 'singular' ? singular : plural;
    return applyTemplate(template, resource);
  }

  // 处理 listByXxx 模式（如 listByCompetitionId, listByRegistrationId）
  // 生成格式：list{主资源复数}By{关联资源}，如 listAttachmentsByRegistration
  if (baseId.startsWith('listBy')) {
    const byWhat = baseId.slice(6).replace(/Id$/, ''); // listByCompetitionId → Competition
    return `list${plural}By${byWhat}`;
  }

  // 处理 getByXxx 模式（如 getByRegistrationId）
  // 生成格式：get{主资源}By{关联资源}，如 getSubmissionByRegistration
  if (baseId.startsWith('getBy')) {
    const byWhat = baseId.slice(5).replace(/Id$/, ''); // getByRegistrationId → Registration
    return `get${singular}By${byWhat}`;
  }

  // 处理其他 batch 开头的操作
  if (baseId.startsWith('batch') && baseId.length > 5) {
    const action = baseId.slice(5); // batchXxx → Xxx
    return `batch${action}${plural}`;
  }

  // 处理其他 get 开头但不在列表中的操作（如 getPublished）
  if (baseId.startsWith('get') && baseId.length > 3) {
    const suffix = baseId.slice(3); // getPublished → Published
    // 如果 suffix 是形容词/状态词，添加资源名
    if (isAdjectiveOrState(suffix)) {
      return `get${suffix}${plural}`;
    }
  }

  // 其他操作保持原名（如 uploadCertificate, parseExcel, downloadTemplate 等）
  // 这些操作名本身已经足够语义化，不需要添加资源前缀
  return originalId;
}

/**
 * 判断一个词是否是形容词或状态词
 * 这些词通常需要和资源名组合使用
 */
function isAdjectiveOrState(word: string): boolean {
  const adjectivesAndStates = new Set([
    'Published',
    'Draft',
    'Pending',
    'Approved',
    'Rejected',
    'Active',
    'Inactive',
    'Enabled',
    'Disabled',
    'All',
    'My',
    'Current',
  ]);
  return adjectivesAndStates.has(word);
}

// ==================== 主转换函数 ====================

export default (inputSchema: OpenAPIObject): OpenAPIObject => {
  const moduleSet = new Set<string>();

  if (inputSchema.paths) {
    for (const [pathKey, pathItem] of Object.entries(inputSchema.paths)) {
      if (!pathItem) continue;

      const moduleName = extractModuleFromPath(pathKey);
      moduleSet.add(moduleName);

      const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
      for (const method of methods) {
        const operation = (pathItem as PathItemObject)[method] as OperationObject | undefined;
        if (operation) {
          // 设置 tag
          operation.tags = [moduleName];

          // 更新 operationId
          if (operation.operationId) {
            const newOperationId = generateOperationId(operation.operationId, pathKey);
            if (newOperationId !== operation.operationId) {
              console.log(`  ${operation.operationId} → ${newOperationId}`);
            }
            operation.operationId = newOperationId;
          }
        }
      }
    }
  }

  inputSchema.tags = Array.from(moduleSet).map(name => ({ name }));

  return inputSchema;
};
