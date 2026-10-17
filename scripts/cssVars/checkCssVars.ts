import fs from 'fs';
import chalk from 'chalk';
import { glob } from 'glob';

// 忽略的文件或目录（检测目标聚焦业务组件/视图样式，排除变量定义源、配置层与三方产物）
const ignorePatterns: string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  'public/**',
  'scripts/**', // 构建脚本（如主题导出）允许定义 seed 品牌色等源头颜色
  'src/constants/**', // 常量/配置层允许定义颜色默认值（如 site-config schema 默认值）
  'src/styles/theme.scss', // CSS 变量定义源头：品牌色以 hex 字面量定义为变量是其职责
  'src/styles/element.scss', // Element 设计系统覆盖层
  'src/assets/**', // 第三方/生成产物（iconfont 等）
  'tests/**', // 测试需要颜色字面量作为输入与断言
  '**/*.css', // .css 视为三方/生成产物，业务样式统一用 .scss/.vue
];

// 颜色模式检测
// hex 只认 3/4/6/8 位，且后面不能再跟标识符字符——否则 `#default` 这类插槽简写会被截成 `#defa`
const colorPattern =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])|\b(?:rgb|rgba|hsl|hsla)\([^)]+\)/g;

// 主函数
async function checkCssVars() {
  try {
    // 查找所有样式文件和 JavaScript/TypeScript 文件
    const files = glob.sync('**/*.{css,scss,less,js,ts,jsx,tsx,vue}', {
      ignore: ignorePatterns,
      nodir: true,
    });

    const fileIssues = files.reduce(
      (acc, file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const issues = Array.from(content.matchAll(colorPattern))
          .map(match => ({ value: match[0], ...locate(content, match.index ?? 0) }))
          .filter(({ lineText, column }) => !isColorInComment(lineText, column))
          .map(({ value, line, column }) => ({ value, line, column }));

        if (issues.length) acc.push({ file, issues });
        return acc;
      },
      [] as { file: string; issues: { value: string; line: number; column: number }[] }[],
    );

    const totalIssues = fileIssues.reduce((sum, { issues }) => sum + issues.length, 0);

    if (totalIssues > 0) {
      console.log(chalk.bold('\n🔍 样式检查结果:\n'));
      fileIssues.forEach(({ file, issues }) => {
        issues.forEach(({ value, line, column }) => {
          console.log(
            `${chalk.cyan(`${file}:${line}:${column}`)}`,
            `\n  ${chalk.red('✖')} ${chalk.gray('硬编码颜色值:')} ${chalk.yellow(value)}\n`,
          );
        });
      });
      console.log(chalk.red(`\n✖ 发现 ${totalIssues} 个问题，请使用 CSS 变量替代硬编码的颜色值\n`));
      process.exit(1);
    }

    console.log(chalk.green('\n✓ 没有发现硬编码的颜色值\n'));
  } catch (error) {
    console.error(chalk.red('\n✖ 验证过程中发生错误：'), chalk.red((error as Error).message), '\n');
    process.exit(1);
  }
}

/** 注释检查逻辑：整行注释，或注释起始符排在颜色之前 */
function isColorInComment(lineText: string, column: number): boolean {
  const trimmedLine = lineText.trim();

  if (
    trimmedLine.startsWith('//') ||
    trimmedLine.startsWith('/*') ||
    trimmedLine.startsWith('*') ||
    trimmedLine.startsWith('<!--')
  ) {
    return true;
  }

  const starts = ['//', '/*', '<!--']
    .map(mark => lineText.indexOf(mark))
    .filter(index => index !== -1)
    .map(index => index + 1); // 转换为 1-based，与 column 同一坐标系

  return starts.length > 0 && column > Math.min(...starts);
}

/** 按字符下标定位行号、列号（均为 1-based）并取出所在行原文 */
function locate(content: string, index: number): { line: number; column: number; lineText: string } {
  const before = content.slice(0, index);
  const lineStart = before.lastIndexOf('\n') + 1;
  const lineEnd = content.indexOf('\n', index);

  return {
    line: before.split('\n').length,
    column: index - lineStart + 1,
    lineText: content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd),
  };
}

checkCssVars();
