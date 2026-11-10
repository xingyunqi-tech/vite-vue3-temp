# 部署指南

部署方式：Nginx 静态容器。`pnpm build` 产出 `dist/`，`Dockerfile` 以 `nginx:alpine` 为基础镜像打包静态资源与 `deploy/nginx.conf`，部署包中的 `deploy/manage.sh` 负责在服务器上加载镜像并管理容器。

## 相关文件

| 文件 | 说明 |
|---|---|
| `Dockerfile` | 镜像构建：内置 `deploy/nginx.conf`，拷贝 `dist/` 与 `version.html`，带 HEALTHCHECK |
| `.dockerignore` | 构建上下文只保留镜像需要的文件 |
| `package.sh` | 本地打包：构建前端、构建镜像、生成部署包 |
| `deploy/nginx.conf` | Nginx 配置（缓存策略、SPA 回退、版本页、gzip_static、接口代理模板） |
| `deploy/manage.sh` | 容器管理：start / stop / restart / remove / status / logs / build |
| `deploy/README.md` | 部署包使用说明（随部署包分发） |
| `.github/workflows/check-quality.yml` | PR / push 时跑 lint、checkCssVars、type-check、test |
| `.github/workflows/build-deploy.yml` | 质量检查通过后构建、打包，并通过 SSH 部署到服务器 |

## 构建产物

```
dist/
├── index.html
├── assets/        # public/assets 原样拷贝（theme.css、loading.css、logo.png）
├── locale/        # public/locale 远程语言包
└── static/
    ├── js/        # [name].[hash].js
    ├── css/       # [name].[hash].css
    ├── img/       # 图片资源
    ├── fonts/     # 字体（有字体资源时）
    └── assets/    # 其他静态资源（有时）
```

- 大于 10KB 的文件额外生成 `.gz` 与 `.br`；`deploy/nginx.conf` 开启了 `gzip_static`，直接返回 `.gz`（`nginx:alpine` 不带 brotli 模块，`.br` 不会被使用）。
- 非根路径部署时设置 `VITE_BASE_PATH`（如 `/admin/`），它同时决定静态资源前缀与 vue-router base；`deploy/nginx.conf` 中的 `location` 需同步加上该前缀。
- 需要给较老浏览器补 core-js 时使用 `VITE_LEGACY=true pnpm build`。

## 运行环境要求

- 构建机：Node.js >= 22.18（见 `.nvmrc`）、pnpm 11（见 `package.json` 的 `packageManager`）、Docker
- 服务器：Docker

## 本地打包：package.sh

```bash
./package.sh          # 构建前端 + Docker 镜像 + 部署包
./package.sh --full   # 额外生成静态资源热更新包 static_assets_<hash>.tar.gz
```

执行过程：

1. 检查 `docker`、`git`、`pnpm` 是否可用。
2. 生成构建信息 `node_build_info.sh` 与 `version.html`（git hash、构建时间、分支、镜像名）。
3. 执行 `pnpm build`。
4. 构建镜像 `docker-local/vite-vue3/web:<hash>`。
5. 把 `deploy/nginx.conf`、`deploy/manage.sh`、`deploy/README.md` 拷到 `vite_vue3_web/`，镜像另存为 `vite-vue3-web_<hash>.tar`，并在构建信息中追加镜像 MD5。
6. 打包为 `vite-vue3-web_<hash>_<时间>.tar.gz`，临时文件在退出时清理。

可用环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BASE_IMAGE` | `nginx:alpine` | 基础镜像 |
| `REGISTRY` / `REPO_PREFIX` | `docker-local` / `vite-vue3/web` | 镜像名前缀 |
| `DOCKER_PLATFORM` | 空（与构建机一致） | 目标平台，如 `linux/amd64`、`linux/arm64` |
| `UPLOAD_TO_SENTRY` | 空 | 为 `true` 时构建阶段上传 sourcemap，见下方 Sentry |

## 服务器部署

把部署包拷到服务器后：

```bash
tar -xzf vite-vue3-web_<hash>_<时间>.tar.gz
cd vite_vue3_web
./manage.sh remove
./manage.sh start          # 默认端口 8080，PORT=8081 ./manage.sh start 可改端口
```

访问 `http://<host>:8080`，版本信息见 `http://<host>:8080/web/version`。热更新、回滚、Nginx 配置调整见 [deploy/README.md](../deploy/README.md)。

本地验证镜像（源码仓库中）：

```bash
pnpm build
./deploy/manage.sh start   # 没有镜像 tar 时用 dist/ 现场构建 vite-vue3-web:local
```

## CI/CD：GitHub Actions

```
push / PR ──► Check Quality（lint、checkCssVars、type-check、test）
                    │ main / master / release/** 上成功
                    ▼
              Build and Deploy：build ──► deploy（SSH，aliyun / tencent / all）──► cleanup ──► notify
```

- `build`：安装依赖、生成构建信息、`pnpm build`，构建 Nginx 镜像推送到 GHCR；部署时同时推送到腾讯云 TCR 个人版 `<命名空间>/vite-vue3-temp`。配置了 `SENTRY_AUTH_TOKEN` 时以 `UPLOAD_TO_SENTRY=true` 构建并上传 sourcemap。
- `deploy`：同步 `manage.sh` 与 `nginx.conf` 到服务器部署目录，登录 TCR 后执行 `manage.sh deploy <镜像>` 拉取镜像并重建容器，服务器保留最近 3 个镜像。阿里云使用 `production` environment，腾讯云使用 `tencent-production`，可在仓库设置中加审批。
- `cleanup`：调用 `cleanup-registry.yml`，GHCR 与 TCR 各保留最近 2 个镜像；该工作流也每周定时执行。
- 手动触发（Actions → Build and Deploy → Run workflow）时可选择部署目标，或只构建推送 GHCR、不部署。

需要配置的 Secrets（Settings → Secrets and variables → Actions，`<PREFIX>` 为 `ALIYUN` 或 `TENCENT`）：

| Secret | 必填 | 说明 |
|---|---|---|
| `<PREFIX>_HOST` | 部署对应目标时必填 | 服务器 IP 或域名 |
| `<PREFIX>_USER` | 部署对应目标时必填 | SSH 用户名（需在 docker 组中） |
| `<PREFIX>_PATH` | 部署对应目标时必填 | 部署目录 |
| `<PREFIX>_SSH_KEY` | 部署对应目标时必填 | SSH 私钥（完整内容，包括 BEGIN/END） |
| `<PREFIX>_PORT` | 否 | SSH 端口，默认 22 |
| `TENCENT_TCR_PASSWORD` | 部署时必填 | TCR 个人版登录密码 |
| `TENCENTCLOUD_SECRET_ID` / `TENCENTCLOUD_SECRET_KEY` | 否 | 清理 TCR 旧镜像，未配置时跳过 |
| `VITE_BASEURL` | 否 | 生产环境接口地址，留空则请求同源 |
| `SENTRY_AUTH_TOKEN` | 否 | 配置后构建时上传 sourcemap |

需要配置的 Variables：

| Variable | 必填 | 说明 |
|---|---|---|
| `TENCENT_TCR_REGISTRY` | 部署时必填 | TCR 地址，如 `ccr.ccs.tencentyun.com` |
| `TENCENT_TCR_NAMESPACE` | 部署时必填 | TCR 命名空间，需先在 TCR 控制台创建 |
| `TENCENT_TCR_USERNAME` | 部署时必填 | 腾讯云账号 UIN |
| `TENCENT_TCR_REGION` | 否 | TCR 地域，默认 `ap-guangzhou` |

## Sentry

- 运行时：`VITE_SENTRY_DSN` 非空时启用，留空则不加载 SDK。
- 上传 sourcemap：在 `.env.local`（或环境变量）配置 `SENTRY_AUTH_TOKEN`，执行 `pnpm uploadToSentry`；配合打包脚本时执行 `UPLOAD_TO_SENTRY=true ./package.sh`；CI 中配置 `SENTRY_AUTH_TOKEN` secret 即自动上传。未配置 token 而开启上传时构建直接失败。
- 上传时生成 hidden sourcemap，上传后从 `dist/` 删除，不随部署产物发布。
- org / project 取 `.env.production` 的 `SENTRY_ORG`、`SENTRY_PROJECT`；release 为 `package.json` 的 `version` 加 git 短 hash，构建插件与运行时一致。
