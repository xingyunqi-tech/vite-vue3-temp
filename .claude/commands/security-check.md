---
description: 安全检查清单，覆盖OWASP Top 10和前端常见安全问题
---

# 前端安全检查清单

确保应用符合安全最佳实践，防范常见安全漏洞。

## 🔒 OWASP Top 10 安全检查

### 1. 注入攻击 (Injection)

#### XSS (跨站脚本攻击)

**检查项:**
- [ ] **禁止使用 `v-html` 渲染用户输入**
- [ ] 如果必须使用 `v-html`，需确保内容已在后端净化

```vue
<!-- ❌ 危险：直接渲染用户输入 -->
<div v-html="userInput"></div>

<!-- ✅ 安全：使用文本插值 -->
<div>{{ userInput }}</div>
```

- [ ] **避免动态执行代码**

```typescript
// ❌ 危险：动态执行代码
eval(userInput);
new Function(userInput)();
setTimeout(userInput, 1000);

// ✅ 安全：不使用动态代码执行
// 使用安全的替代方案
```

- [ ] **转义 URL 参数**

```typescript
// ✅ 安全：转义 URL 参数
const searchQuery = encodeURIComponent(userInput);
router.push(`/search?q=${searchQuery}`);
```

#### SQL 注入

**检查项:**
- [ ] **前端不直接拼接 SQL**（应由后端处理）
- [ ] 使用参数化查询（后端）

---

### 2. 身份验证失效 (Broken Authentication)

**检查项:**
- [ ] **Token 存储在 HttpOnly Cookie**（不在 localStorage）
- [ ] Session 超时后自动登出
- [ ] 敏感操作需要重新验证（如修改密码）
- [ ] 密码不在前端明文传输（使用 HTTPS）

```typescript
// ❌ 危险：Token 存储在 localStorage
localStorage.setItem('token', token);

// ✅ 安全：Token 存储在 HttpOnly Cookie（后端设置）
// Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

---

### 3. 敏感数据泄露 (Sensitive Data Exposure)

**检查项:**
- [ ] **禁止在前端存储敏感数据**（密码、信用卡号等）
- [ ] **禁止在日志中输出敏感数据**
- [ ] **禁止在 URL 中传递敏感数据**
- [ ] 使用 HTTPS 加密传输

```typescript
// ❌ 危险：敏感数据存储
localStorage.setItem('password', password);
console.log('User password:', password);

// ✅ 安全：不存储敏感数据
// 只存储 Token，由后端管理密码
```

- [ ] **前端代码中禁止硬编码密钥/Token**

```typescript
// ❌ 危险：硬编码 API Key
const API_KEY = 'sk-1234567890abcdef';

// ✅ 安全：使用环境变量
const API_KEY = import.meta.env.VITE_API_KEY;
```

---

### 4. XXE (XML 外部实体攻击)

**检查项:**
- [ ] 避免解析不受信任的 XML
- [ ] 使用 JSON 代替 XML（推荐）

---

### 5. 访问控制失效 (Broken Access Control)

**检查项:**
- [ ] **前端路由权限控制**（参考 `@router-development`）
- [ ] **敏感操作需要后端验证**（前端验证只是 UX）
- [ ] **禁止通过修改前端代码绕过权限**

```typescript
// ✅ 路由级权限在注册阶段完成：声明表按 meta.roles 过滤后才 addRoute（src/router/guards.ts），
//    无权限的路径在 router 里根本不存在，落到兜底路由（routes/fallback.ts）后由异常页判定为 403
//    数据源必须是 resolveDeclaredRoutes()：它先应用租户覆盖再交给过滤，
//    这样租户放宽的 meta.roles 才生效、租户追加的 children 才同样受角色约束
const accessRoutes = permissionStore.generateRoutes(resolveDeclaredRoutes(), [role]);
accessRoutes.forEach(route => router.addRoute(route));
router.addRoute(fallbackRoute);

// ❌ 不要在守卫里按 to.meta.roles 二次判断并 next('/403')——守卫已统一处理，另起一套只会漂移
```

---

### 6. 安全配置错误 (Security Misconfiguration)

**检查项:**
- [ ] **生产环境禁用 Vue DevTools**
- [ ] **生产环境删除 console 和 debugger**
- [ ] **设置安全的 HTTP 响应头**

```nginx
# nginx.conf 安全响应头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

- [ ] **禁用目录列表**

```nginx
autoindex off;
```

- [ ] **移除不必要的文件**（如 .map 文件）

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false, // 生产环境禁用 sourcemap
  },
});
```

---

### 7. XSS (跨站脚本攻击) - 详细检查

**存储型 XSS:**
- [ ] 用户输入存储到数据库前，后端清理
- [ ] 渲染时使用 Vue 的文本插值 `{{ }}` 而非 `v-html`

**反射型 XSS:**
- [ ] URL 参数清理和转义
- [ ] 不使用 `dangerouslySetInnerHTML`（React）或 `v-html`（Vue）

**DOM 型 XSS:**
- [ ] 避免直接操作 DOM
- [ ] 使用 Vue 的响应式系统

```typescript
// ❌ 危险：直接操作 DOM
document.getElementById('output').innerHTML = userInput;

// ✅ 安全：使用 Vue 响应式
<template>
  <div>{{ userInput }}</div>
</template>
```

---

### 8. 不安全的反序列化 (Insecure Deserialization)

**检查项:**
- [ ] 不信任来自客户端的序列化数据
- [ ] 使用 JSON.parse 而非 eval

```typescript
// ❌ 危险：使用 eval
const data = eval('(' + userInput + ')');

// ✅ 安全：使用 JSON.parse
try {
  const data = JSON.parse(userInput);
} catch (error) {
  console.error('Invalid JSON');
}
```

---

### 9. 使用含有已知漏洞的组件

**检查项:**
- [ ] **定期更新依赖**（`pnpm update`）
- [ ] **运行安全审计**（`pnpm audit`）
- [ ] **检查 GitHub Security Alerts**

```bash
# 检查已知漏洞
pnpm audit

# 修复漏洞
pnpm audit --fix

# 查看过时的依赖
pnpm outdated
```

---

### 10. 日志记录和监控不足

**检查项:**
- [ ] **关键操作记录日志**（登录、修改密码等）
- [ ] **禁止日志中包含敏感信息**

```typescript
// ❌ 危险：日志包含敏感信息
console.log('User password:', password);

// ✅ 安全：只记录必要信息
console.log('User login attempt:', { userId, timestamp });
```

---

## 🛡️ 前端特定安全检查

### 1. CSRF (跨站请求伪造)

**检查项:**
- [ ] **使用 CSRF Token**（后端生成）
- [ ] **SameSite Cookie 属性**

```nginx
# Cookie 设置
Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

---

### 2. Clickjacking (点击劫持)

**检查项:**
- [ ] **设置 X-Frame-Options 响应头**

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
```

---

### 3. CORS (跨域资源共享)

**检查项:**
- [ ] **限制允许的域名**（不使用 `*`）

```typescript
// ❌ 危险：允许所有域名
Access-Control-Allow-Origin: *

// ✅ 安全：只允许特定域名
Access-Control-Allow-Origin: https://example.com
```

---

### 4. 依赖安全

**检查项:**
- [ ] **只安装必要的依赖**
- [ ] **使用 pnpm audit 检查漏洞**
- [ ] **定期更新依赖**

```bash
# 检查依赖安全
pnpm audit

# 修复漏洞
pnpm audit --fix

# 更新依赖
pnpm update
```

---

### 5. 环境变量安全

**检查项:**
- [ ] **密钥文件 `.env` 不提交到 Git**（`.gitignore` 已忽略）
  - ⚠️ 注意 `.gitignore` 里的 `.env` **不匹配** `.env.development` / `.env.production`——
    这两个是**有意提交**的配置模板（只放 baseURL、部署路径等非敏感项，密钥位留空）。
    往它们里填真实 key 会直接进仓库；真实 key 一律放本地 `.env`
- [ ] **敏感信息不在前端代码中**
- [ ] **使用 VITE_ 前缀的环境变量**

```bash
# .env.production（提交到 Git）
VITE_API_BASE_URL=

# .env.local（不提交到 Git）
VITE_API_BASE_URL=https://api.example.com
```

---

### 6. 内容安全策略 (CSP)

**检查项:**
- [ ] **设置 Content-Security-Policy 响应头**

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'self';
" always;
```

---

### 7. Subresource Integrity (SRI)

**检查项:**
- [ ] **CDN 资源使用 SRI**

```html
<!-- ✅ 使用 SRI -->
<script
  src="https://cdn.jsdelivr.net/npm/vue@3"
  integrity="sha384-xxx"
  crossorigin="anonymous"
></script>
```

---

## 🔍 安全检查清单（提交前）

### 代码审查

```bash
# 1. 搜索危险的 API 调用
grep -r "v-html" src/
grep -r "eval(" src/
grep -r "innerHTML" src/
grep -r "dangerouslySetInnerHTML" src/

# 2. 搜索敏感信息
grep -r "password" src/ | grep -i "console.log"
grep -r "token" src/ | grep -i "localStorage"
grep -r "api_key" src/
grep -r "secret" src/

# 3. 检查依赖安全
pnpm audit

# 4. 检查环境变量
cat .env.production
cat .env.local
```

### 自动化检查

```bash
# ESLint 常规检查（项目当前未接入专门的安全规则插件，只是常规代码质量检查）
pnpm lint

# TypeScript 类型检查
pnpm type-check
```

---

## 🚨 常见安全漏洞示例

### 漏洞 1: XSS 攻击

```typescript
// ❌ 危险代码
<template>
  <div v-html="userComment"></div>
</template>

// 攻击示例
userComment = '<img src=x onerror="alert(document.cookie)">';

// ✅ 修复
<template>
  <div>{{ userComment }}</div>
</template>
```

### 漏洞 2: Token 泄露

```typescript
// ❌ 危险代码
localStorage.setItem('token', token);
console.log('User token:', token);

// 攻击示例
// 任何脚本都可以读取 localStorage
const stolenToken = localStorage.getItem('token');

// ✅ 修复
// 使用 HttpOnly Cookie（后端设置）
// 不在日志中输出 Token
```

### 漏洞 3: CSRF 攻击

```typescript
// ❌ 危险代码
// 没有 CSRF Token 的表单提交
fetch('/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ to: 'attacker', amount: 1000 }),
});

// 攻击示例
// 攻击者网站自动提交表单
<form action="https://victim.com/api/transfer" method="POST">
  <input name="to" value="attacker" />
  <input name="amount" value="1000" />
</form>

// ✅ 修复
// 添加 CSRF Token（后端生成）
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ to: 'attacker', amount: 1000 }),
});
```

---

## 🛠️ 安全工具推荐

### 静态分析
- **ESLint Security Plugin** - 检测常见安全问题
- **npm audit / pnpm audit** - 检测依赖漏洞
- **Snyk** - 自动依赖安全扫描

### 动态分析
- **OWASP ZAP** - 自动化安全扫描
- **Burp Suite** - 渗透测试工具

### 监控
- **CSP Report** - CSP 违规报告

---

## 📚 安全资源

### 官方文档
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vue Security Guide](https://vuejs.org/guide/best-practices/security.html)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

### 安全清单
- [Frontend Security Checklist](https://github.com/FallibleInc/security-guide-for-developers)
- [Web Security Checklist](https://github.com/OWASP/CheatSheetSeries)

---

## ⚠️ 重要提醒

### 安全原则
1. **永远不要信任用户输入** - 所有输入都要验证和清理
2. **纵深防御** - 多层安全防护
3. **最小权限原则** - 只授予必要的权限
4. **安全默认值** - 默认安全，而非默认方便

### 前端安全误区
- ❌ **前端验证 = 安全**（前端验证只是 UX，后端必须验证）
- ❌ **隐藏 = 安全**（前端代码可见，不能隐藏秘密）
- ❌ **混淆 = 加密**（代码混淆不是安全措施）

---

**安全是持续的过程，不是一次性的任务。定期审查，及时更新！**
