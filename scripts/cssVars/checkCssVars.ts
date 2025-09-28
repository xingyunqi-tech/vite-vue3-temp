import fs from 'fs';
import chalk from 'chalk';
import { glob } from 'glob';

// 忽略的文件或目录
const ignorePatterns: (string | RegExp)[] = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'public/**',
  'deploy/**',
  '*.css',
];

// 颜色模式检测
const colorPattern = /#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla)\([^)]+\)/g;

// 主函数
async function checkCssVars() {
  try {
    // 查找所有样式文件和 JavaScript/TypeScript 文件
    const files = glob.sync('**/*.{css,scss,less,js,ts,jsx,tsx}', {
      ignore: ignorePatterns.map(pattern =>
        pattern instanceof RegExp
          ? pattern.source.replace(/^\/|\/$/g, '')
          : !pattern.includes('*')
            ? `${pattern}/**`
            : pattern,
      ),
      nodir: true,
    });

    const fileIssues = files.reduce(
      (acc, file) => {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.matchAll(colorPattern);
        const issues = Array.from(matches)
          .filter(match => !isColorInComment(content, match[0]))
          .map(match => ({
            value: match[0],
            line: getLineAndColumn(content, match[0]).line,
            column: getLineAndColumn(content, match[0]).column,
          }));

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

// 注释检查逻辑
function isColorInComment(content: string, match: string): boolean {
  const lines = content.split('\n');
  const line = lines.find(line => line.includes(match)) || '';
  const trimmedLine = line.trim();

  if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
    return true;
  }

  const matchIndex = line.indexOf(match);
  const commentIndex = Math.min(
    line.indexOf('//') === -1 ? Infinity : line.indexOf('//'),
    line.indexOf('/*') === -1 ? Infinity : line.indexOf('/*'),
  );

  return commentIndex !== Infinity && matchIndex > commentIndex;
}

// 获取颜色值所在的行号和列号
function getLineAndColumn(content: string, match: string): { line: number; column: number } {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i];
    const column = lineContent.indexOf(match);
    if (column !== -1) {
      return {
        line: i + 1,
        column: column + 1, // 转换为1-based索引
      };
    }
  }
  return { line: 0, column: 0 };
}

checkCssVars();
