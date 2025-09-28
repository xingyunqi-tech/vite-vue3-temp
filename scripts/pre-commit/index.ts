import { execSync } from 'child_process';
import chalk from 'chalk';

try {
  // Lint-staged 检查
  console.log(chalk.blue('正在执行 lint-staged...'));
  execSync('npm exec lint-staged', { stdio: 'inherit' });
  console.log(chalk.green('✓ Lint-staged 检查通过'));

  // TypeScript 类型检查
  console.log(chalk.blue('正在进行 TypeScript 类型检查...'));
  execSync('npm run type-check', { stdio: 'inherit' });
  console.log(chalk.green('✓ TypeScript 类型检查通过'));

  // 单元测试检查
  console.log(chalk.blue('正在进行单元测试...'));
  execSync('npm run test', { stdio: 'inherit' });
  console.log(chalk.green('✓ 单元测试通过'));

  process.exit(0);
} catch (error) {
  console.error(chalk.red('× 检查失败'));
  if (error instanceof Error) {
    console.error(chalk.red(error.message));
  }
  process.exit(1);
}
