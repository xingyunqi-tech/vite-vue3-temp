---
description: Git 工作流最佳实践，包括分支管理、提交规范、PR 流程
---

# Git 工作流最佳实践

快速查看 Git 工作流规范，确保团队协作顺畅。

## 🌳 分支策略

### 分支类型

| 分支 | 用途 | 命名规范 | 示例 |
|------|------|---------|------|
| **main/master** | 主分支（生产环境） | `main` | `main` |
| **develop** | 开发分支（可选） | `develop` | `develop` |
| **feature** | 新功能开发 | `feature/功能名` | `feature/user-login` |
| **fix** | Bug 修复 | `fix/问题描述` | `fix/login-error` |
| **refactor** | 代码重构 | `refactor/模块名` | `refactor/user-store` |
| **hotfix** | 紧急修复 | `hotfix/问题描述` | `hotfix/security-patch` |

### 分支创建

```bash
# 创建功能分支
git checkout -b feature/user-profile

# 创建修复分支
git checkout -b fix/api-timeout

# 创建重构分支
git checkout -b refactor/optimize-routing
```

---

## 📝 提交规范 (Conventional Commits)

### 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **feat** | 新功能 | `feat: 添加用户登录功能` |
| **fix** | Bug 修复 | `fix: 修复登录超时问题` |
| **docs** | 文档更新 | `docs: 更新 API 文档` |
| **style** | 代码格式（不影响功能） | `style: 格式化代码` |
| **refactor** | 代码重构 | `refactor: 优化路由守卫逻辑` |
| **perf** | 性能优化 | `perf: 优化列表渲染性能` |
| **test** | 测试相关 | `test: 添加用户登录测试` |
| **chore** | 构建/工具相关 | `chore: 更新依赖版本` |
| **ci** | CI/CD 相关 | `ci: 优化构建流程` |
| **build** | 打包相关 | `build: 调整 vite 分包策略` |
| **revert** | 回退提交 | `revert: 回退 xxx` |

> 以上 11 种是 `commitlint.config.ts` 的 `type-enum` 全集，**用别的 type 会被 commit-msg hook 拒绝**。

### 提交格式

```bash
# 基本格式
<type>(<scope>): <subject>

# 示例
feat(auth): 添加用户登录功能
fix(api): 修复接口超时问题
docs(readme): 更新项目文档
style(components): 格式化组件代码
refactor(store): 重构用户状态管理
perf(list): 优化长列表渲染性能
test(user): 添加用户模块测试
chore(deps): 更新依赖到最新版本
```

### commitlint 硬约束（`commit-msg` hook 会拦截）

| 规则 | 要求 |
|---|---|
| `type-empty` / `subject-empty` | type 和 subject 都不能为空 |
| `type-case` / `scope-case` | 必须全小写（`Feat:` 会被拒） |
| `subject-full-stop` | 结尾**不能有句号** |
| `header-max-length` | 首行 **≤ 72 字符**（中文按字符数算，容易超） |
| `scope-empty` | 已关闭，scope 可省略 |

`feat!:` 这种 breaking change 标记、以及 git 自动生成的 `Merge` / `Revert` 消息由 commitlint 原生放行。

### AI 标识

AI 生成的提交，**不要加 `Co-Authored-By` 签名**，改为在 commit message 末尾追加一行：

```text
🤖 Generated with AI
```

（与 [CLAUDE.md](../../CLAUDE.md) 的「Git 提交规则」一致。）

### 提交最佳实践

```bash
# ✅ 推荐：使用项目的交互式提交工具（czg，会引导选 type / 填 subject）
pnpm commit

# ✅ 推荐：单一职责提交
git commit -m "feat: 添加用户登录表单"
git commit -m "feat: 添加登录 API 调用"
git commit -m "feat: 添加登录错误处理"

# ❌ 避免：多个功能混合提交
git commit -m "添加登录、注册、修复 bug"

# ✅ 推荐：清晰的提交信息
git commit -m "fix: 修复登录时 token 未保存的问题"

# ❌ 避免：模糊的提交信息
git commit -m "fix bug"
git commit -m "update"
```

---

## 🔄 完整工作流程

### 场景 1: 开发新功能

```bash
# 1. 创建功能分支
git checkout main
git pull origin main
git checkout -b feature/user-profile

# 2. 开发功能
# - 编写代码
# - 运行测试: pnpm test
# - 运行检查: pnpm lint

# 3. 提交代码（小步快跑）
git add .
pnpm commit
# 或手动提交
git commit -m "feat(user): 添加用户资料页面"

# 4. 推送到远程
git push origin feature/user-profile

# 5. 创建 Pull Request
# - 填写 PR 描述
# - 运行 /review-pr 检查清单
# - 请求代码审查

# 6. 合并后删除分支
git checkout main
git pull origin main
git branch -d feature/user-profile
```

---

### 场景 2: 修复 Bug

```bash
# 1. 创建修复分支
git checkout main
git pull origin main
git checkout -b fix/api-error

# 2. 修复 Bug
# - 定位问题
# - 编写修复代码
# - 添加测试避免回归

# 3. 提交代码
git add .
git commit -m "fix(api): 修复接口超时重试逻辑"

# 4. 推送并创建 PR
git push origin fix/api-error

# 5. 合并后删除分支
git checkout main
git pull origin main
git branch -d fix/api-error
```

---

### 场景 3: 代码重构

```bash
# 1. 创建重构分支
git checkout -b refactor/user-store

# 2. 重构代码（参考 /refactor）
# - 确保测试通过
# - 小步快跑，频繁提交
# - 每次改动后运行测试

# 3. 提交代码
git add .
git commit -m "refactor(store): 提取用户状态管理公共逻辑"

# 4. 重构完成后检查
pnpm test
pnpm type-check
pnpm build

# 5. 推送并创建 PR
git push origin refactor/user-store
```

---

### ⏱️ 提交会触发什么

`pre-commit` 钩子（`scripts/husky/pre-commit.ts`）按顺序跑：

1. `lint-staged` —— 对暂存文件跑 eslint / stylelint / prettier
2. `pnpm check:template` —— 仅当 `.template/config.ts` 存在（即模板真源仓库）
3. **改动含 `.ts` / `.tsx` / `.vue` 时**：`pnpm type-check` + `pnpm test`

所以改了源码的提交会明显慢一些，且**类型错误或测试失败会直接阻断提交**。
只改 `.md` / 配置文件时会跳过第 3 步。

---

## 🔀 Pull Request 流程

### 创建 PR 前检查

```bash
# 1. 运行完整检查
/review-pr

# 2. 确保代码符合规范
pnpm lint
pnpm type-check

# 3. 运行测试
pnpm test

# 4. 构建检查
pnpm build

# 5. 查看变更
git diff main...HEAD
```

### PR 描述模板

```markdown
## 📋 变更类型
- [ ] 新功能 (feat)
- [ ] Bug 修复 (fix)
- [ ] 代码重构 (refactor)
- [ ] 文档更新 (docs)
- [ ] 性能优化 (perf)
- [ ] 测试 (test)

## 📝 变更说明
<!-- 简要描述这次变更的内容和原因 -->

## 🧪 测试计划
- [ ] 单元测试通过
- [ ] 手动测试通过
- [ ] 回归测试通过

## 📸 截图（如有）
<!-- 添加截图或 GIF 演示 -->

## 🔗 相关 Issue
<!-- 关联 Issue 编号 -->
Closes #123
```

### Code Review 清单

使用 `/review-pr` 查看完整的审查清单。

---

## 🚨 紧急修复流程 (Hotfix)

```bash
# 1. 从主分支创建 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/security-patch

# 2. 快速修复问题
# - 定位问题
# - 编写修复代码
# - 最小化改动

# 3. 提交代码
git add .
git commit -m "hotfix: 修复安全漏洞 CVE-2024-xxxx"

# 4. 立即创建 PR 并合并
git push origin hotfix/security-patch

# 5. 合并后立即部署
# - 运行 CI/CD 流程
# - 监控生产环境
```

---

## 🛠️ 常用 Git 命令

### 分支管理

```bash
# 查看所有分支
git branch -a

# 删除本地分支
git branch -d feature/user-profile

# 删除远程分支
git push origin --delete feature/user-profile

# 重命名分支
git branch -m old-name new-name
```

### 提交管理

```bash
# 修改最后一次提交
git commit --amend

# 查看提交历史
git log --oneline --graph

# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 撤销最后一次提交（丢弃修改）
git reset --hard HEAD~1
```

### 同步和合并

```bash
# 同步远程分支
git fetch origin
git pull origin main

# 合并分支
git merge feature/user-profile

# 变基（保持线性历史）
git rebase main

# 解决冲突后继续
git add .
git rebase --continue
```

### 暂存和恢复

```bash
# 暂存当前修改
git stash

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop

# 丢弃暂存
git stash drop
```

---

## 🔍 代码审查要点

### 审查者检查清单

- [ ] 代码符合项目规范（参考 `@coding-standards`）
- [ ] 提交信息清晰规范
- [ ] 测试覆盖完整
- [ ] 无明显性能问题
- [ ] 无安全漏洞
- [ ] 文档更新完整

### 提交者注意事项

- [ ] PR 描述清晰
- [ ] 变更范围合理（不过大）
- [ ] 自测完成
- [ ] 响应审查意见及时

---

## ⚠️ 常见问题和解决方案

### 问题 1: 提交到错误的分支

```bash
# 撤销提交（保留修改）
git reset --soft HEAD~1

# 切换到正确的分支
git checkout correct-branch

# 重新提交
git add .
git commit -m "feat: 正确的提交"
```

### 问题 2: 合并冲突

```bash
# 1. 查看冲突文件
git status

# 2. 手动解决冲突
# 编辑冲突文件，删除冲突标记

# 3. 标记为已解决
git add .

# 4. 继续合并
git merge --continue
# 或
git rebase --continue
```

### 问题 3: 误删分支

```bash
# 查看最近的提交记录
git reflog

# 恢复删除的分支
git checkout -b recovered-branch <commit-hash>
```

---

## 📚 相关资源

### Commands
- `/review-pr` - PR 审查清单
- `/refactor` - 重构最佳实践
- `/quick-fix` - 快速问题修复

### 外部资源
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

---

**开始使用 Git 工作流吧！记得小步快跑，频繁提交，保持代码仓库整洁。**
