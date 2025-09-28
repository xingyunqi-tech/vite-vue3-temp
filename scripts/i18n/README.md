# i18n 国际化脚本工具

## 概述

这是一个完整的前端国际化(i18n)自动化工具集，用于自动化处理React项目中的国际化需求。该工具集支持从代码自动提取中文文本、生成语义化ID、自动翻译、合并语言包等全流程操作。

## 主要特性

- 🤖 **智能文本提取**：基于AST分析，精确提取需要国际化的文本
- 🎯 **语义化ID生成**：使用Dify API生成有意义的语义化ID
- 🔄 **代码自动转换**：将中文文本自动替换为国际化调用
- 🌐 **自动翻译**：集成Dify翻译API，自动生成英文翻译
- 📦 **语言包管理**：支持主目录和定制目录的语言包合并
- 🔧 **还原功能**：支持将国际化代码还原为原始文本
- 📊 **完整统计**：提供详细的处理统计信息

## 目录结构

```md
scripts/i18n/
├── index.ts           # 主入口文件，命令行接口
├── utils.ts           # 核心工具类和基础设施
├── generate.ts        # 代码生成处理器
├── pick.ts            # 待翻译文件生成器
├── translate.ts       # 翻译处理器
├── merge.ts           # 翻译文件合并器
├── restore.ts         # 代码还原处理器
├── exportLocale.ts    # 语言包导出器
└── README.md          # 文档说明
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 交互式使用

```bash
# 交互式操作（推荐）
npm run i18n

# 或者直接使用脚本
npx tsx scripts/i18n/index.ts --interactive
```

### 3. 命令行使用

```bash
# 提取多语言组件
npm run i18n -- --mode generate

# 生成待翻译文件
npm run i18n -- --mode pick

# 翻译待翻译文件
npm run i18n -- --mode translate

# 合并翻译文件
npm run i18n -- --mode merge

# 导出语言包
npm run i18n -- --mode export

# 还原多语言组件
npm run i18n -- --mode restore
```

## 详细使用指南

### 1. 代码生成 (generate)

自动从React文件中提取中文文本并提取多语言组件。

```bash
# 主目录生成
npm run i18n -- --mode generate

# 定制目录生成
npm run i18n -- --mode generate --custom

# 指定文件或目录
npm run i18n -- --mode generate --interactive
```

**功能特点：**

- 支持JSX文本、属性值、JS代码中的字符串
- 自动生成语义化ID
- 支持模板字符串处理
- 自动添加必要的import语句
- 支持React函数组件和类组件
- 自动处理hooks依赖项

**处理示例：**

```typescript
// 处理前
const message = "用户登录成功";
<div>欢迎访问系统</div>

// 处理后
const intl = getIntl();
const message = intl.formatMessage({ id: 'user__login_success' });
<div>{intl.formatMessage({ id: 'common__welcome_system' })}</div>
```

### 2. 生成待翻译文件 (pick)

分析语言包，生成待翻译文件。

```bash
# 主目录pick
npm run i18n -- --mode pick

# 定制目录pick
npm run i18n -- --mode pick --custom
```

**功能特点：**

- 自动分析zh-CN和en-US语言包
- 识别未翻译和已翻译的条目
- 生成untranslated.json（待翻译）和translations.json（已翻译）
- 智能判断英文翻译的有效性

**输出文件：**

- `untranslated.json`: 待翻译的条目
- `translations.json`: 已翻译的条目

### 3. 翻译处理 (translate)

使用Dify API自动翻译待翻译文件。

```bash
# 主目录翻译
npm run i18n -- --mode translate

# 定制目录翻译
npm run i18n -- --mode translate --custom
```

**功能特点：**

- 批量翻译处理（默认50条/批次）
- 支持自定义批次大小和延时
- 断点续传，跳过已翻译条目
- 详细的翻译进度和统计信息
- 错误处理和重试机制

**配置选项：**

- 批次大小：默认50条
- 批次延时：默认1000ms
- 超时时间：默认60秒

### 4. 合并翻译文件 (merge)

将翻译好的内容合并到主语言包中。

```bash
# 主目录合并
npm run i18n -- --mode merge

# 定制目录合并
npm run i18n -- --mode merge --custom
```

**功能特点：**

- 自动检测新完成的翻译
- 更新语言包文件（zh-CN.json, en-US.json）
- 保留已有翻译，只添加新翻译
- 清理待翻译文件中已完成的条目

### 5. 导出语言包 (export)

合并主目录和定制目录的语言包，生成最终的语言包文件。

```bash
# 导出到public/locale
npm run i18n -- --mode export

# 或者使用npm脚本
npm run i18n:exportLocale
```

**功能特点：**

- 合并基础语言包和自定义语言包
- 检查语言包冲突
- 生成统计信息
- 自定义语言包优先级
- 输出到指定目录

**输出位置：**

- `public/locale/zh-CN.json`
- `public/locale/en-US.json`

### 6. 还原代码 (restore)

将国际化代码还原为原始的中文文本。

```bash
# 主目录还原
npm run i18n -- --mode restore

# 定制目录还原
npm run i18n -- --mode restore --custom
```

**功能特点：**

- 支持formatMessage调用还原
- 支持FormattedMessage组件还原
- 支持defineMessages定义还原
- 保留代码结构和格式
- 安全的还原操作

## 配置说明

### 目录配置

```typescript
export const PROJECT_CONFIG = {
  MAIN_LOCALE_DIR: 'src/locale',      // 主目录路径
  CUSTOM_LOCALE_DIR: 'src/overrides/locale', // 定制目录路径
  OUTPUT_DIR: 'public/locale',         // 输出目录路径
};
```

### Dify API配置

```typescript
// ID生成API
const ID_GENERATION_CONFIG = {
  url: 'http://10.12.21.85/v1/workflows/run',
  apiKey: 'app-Dz20JIP9l4q4BwPK1X0r5spP',
  timeout: 30000,
};

// 翻译API
const TRANSLATION_CONFIG = {
  url: 'http://10.12.21.85/v1/workflows/run',
  apiKey: 'app-1bjAbkQLugXSMPLp23iv9mC4',
  timeout: 60000,
};
```

### 文件类型配置

```typescript
const SUPPORTED_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
```

## 工作流程

### 典型的国际化工作流程

1. **代码生成阶段**

   ```bash
   npm run i18n -- --mode generate
   ```

   - 提取中文文本
   - 生成语义化ID
   - 转换代码为国际化调用

2. **翻译准备阶段**

   ```bash
   npm run i18n -- --mode pick
   ```

   - 分析语言包状态
   - 生成待翻译文件

3. **翻译执行阶段**

   ```bash
   npm run i18n -- --mode translate
   ```

   - 调用API自动翻译
   - 生成英文翻译

4. **合并更新阶段**

   ```bash
   npm run i18n -- --mode merge
   ```

   - 合并翻译结果
   - 更新语言包文件

5. **导出发布阶段**

   ```bash
   npm run i18n -- --mode export
   ```

   - 合并所有语言包
   - 生成最终语言包

### 定制目录工作流程

对于定制目录，只需要在每个命令后添加`--custom`参数：

```bash
npm run i18n -- --mode generate --custom
npm run i18n -- --mode pick --custom
npm run i18n -- --mode translate --custom
npm run i18n -- --mode merge --custom
```

## 高级特性

### 1. 语义化ID生成

系统会根据文件路径和文本内容生成有意义的ID：

```typescript
// 文件：src/components/UserProfile/index.tsx
// 文本：用户信息
// 生成ID：components__UserProfile__user_info
```

### 2. 模板字符串支持

```typescript
// 处理前
const message = `用户${userName}登录成功`;

// 处理后
const message = intl.formatMessage(
  { id: 'user__login_success' },
  { var1: userName }
);
```

### 3. React组件支持

**函数组件：**

```typescript
const MyComponent = () => {
  const intl = useIntl();
  return <div>{intl.formatMessage({ id: 'common__welcome' })}</div>;
};
```

**类组件：**

```typescript
class MyComponent extends Component<WrappedComponentProps> {
  render() {
    const { intl } = this.props;
    return <div>{intl.formatMessage({ id: 'common__welcome' })}</div>;
  }
}
export default injectIntl(MyComponent);
```

### 4. 批量处理

支持大批量文件和文本的处理：

- 自动分批处理API调用
- 进度显示和状态跟踪
- 错误处理和重试机制

### 5. 增量处理

- 跳过已处理的文件和文本
- 只处理新增或修改的内容
- 保留现有的翻译

## 错误处理

### 常见错误及解决方案

1. **API调用失败**
   - 检查网络连接
   - 验证API密钥
   - 检查API服务状态

2. **文件权限错误**
   - 确保有文件读写权限
   - 检查目录是否存在

3. **JSON格式错误**
   - 验证JSON文件格式
   - 检查编码格式

4. **TypeScript编译错误**
   - 检查依赖安装
   - 验证tsconfig配置

## 性能优化

### 1. 批处理优化

- 合理设置批次大小
- 控制API调用频率
- 内存使用优化

### 2. 文件处理优化

- 增量处理策略
- 缓存机制
- 并行处理

### 3. 错误恢复

- 断点续传
- 失败重试
- 优雅降级

## 最佳实践

### 1. 项目结构

```md
src/
├── locale/           # 主语言包
│   ├── zh-CN.json
│   └── en-US.json
├── overrides/        # 定制语言包
│   └── locale/
│       ├── zh-CN.json
│       └── en-US.json
└── components/       # 组件代码
```

### 2. 命名规范

- 语义化ID：`module__component__action`
- 文件命名：使用kebab-case
- 变量命名：使用camelCase

### 3. 翻译质量

- 定期审查自动翻译结果
- 人工校对重要文本
- 建立翻译术语库

### 4. 版本控制

- 分别管理源代码和语言包
- 使用分支管理不同语言版本
- 建立翻译审查流程

## 故障排除

### 常见问题

1. **命令执行失败**

   ```bash
   # 检查Node.js版本
   node --version  # 需要 >= 22
   
   # 重新安装依赖
   npm install
   ```

2. **API调用超时**

   ```bash
   # 检查网络连接
   ping 10.12.21.85
   
   # 增加超时时间（修改utils.ts中的配置）
   ```

3. **文件格式错误**

   ```bash
   # 验证JSON格式
   npx eslint src/locale/*.json
   
   # 格式化JSON文件
   npx prettier src/locale/*.json --write
   ```

### 日志分析

脚本会输出详细的日志信息，包括：

- 操作进度
- 错误信息
- 统计数据
- 性能指标

## 扩展开发

### 自定义处理器

```typescript
class CustomProcessor extends BaseI18nProcessor {
  async execute(): Promise<void> {
    // 自定义逻辑
  }
}
```

### 自定义翻译API

```typescript
class CustomTranslationAPI {
  async translate(text: string): Promise<string> {
    // 自定义翻译逻辑
  }
}
```
