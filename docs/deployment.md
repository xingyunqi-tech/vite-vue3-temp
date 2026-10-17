# 部署指南

## 构建产物

`pnpm build` 输出到 `dist/`：

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

- 大于 10KB 的文件额外生成 `.gz` 与 `.br`。`deploy/` 里的 Nginx 配置用的是动态 `gzip on`，未启用 `gzip_static`；要直接使用预压缩文件需自行开启（`brotli_static` 另需 ngx_brotli 模块）。
- 非根路径部署时设置 `VITE_BASE_PATH`（如 `/admin/`），它同时决定静态资源前缀与 vue-router base。
- 需要给较老浏览器补 core-js 时使用 `VITE_LEGACY=true pnpm build`。

## 运行环境要求

- Node.js >= 22.18（见 `.nvmrc`）
- pnpm 11（见 `package.json` 的 `packageManager`）

## 一键打包：package.sh

```bash
./package.sh          # 构建前端 + Docker 镜像 + Helm 部署包
./package.sh --full   # 额外生成静态资源热更新包 static_assets_<hash>.tar.gz
```

执行过程：

1. 检查 `docker`、`git`、`pnpm`、`perl` 是否可用，交互选择目标平台（amd64 / arm64），平台决定基础镜像。
2. 生成构建信息 `node_build_info.sh` 与 `version.html`（git hash、构建时间、分支、镜像名）。
3. 执行 `pnpm build`。
4. 用 `Dockerfile` 构建镜像：以 Nginx 镜像为基础，把 `dist/` 与 `version.html` 拷到 `/usr/share/nginx/html`。
5. 把 `deploy/` 下的 Helm Chart 与 `deploy/k8s/` 下的清单拷到 `txwl_web/`，`docker save` 镜像到同目录，并把 `values.yaml` 里的镜像名替换为本次构建的镜像。
6. 打包为 `txwl-website_<hash>-<arch>_<时间>.tar.gz`，临时文件在退出时清理。

## Helm Chart：deploy/

| 文件 | 说明 |
|---|---|
| `Chart.yaml` | Chart 元信息 |
| `values.yaml` | 副本数、后端服务地址（opod / fp / vpp / middleRepo）、协议、镜像等部署参数 |
| `k8s/website-deploy.yaml`、`k8s/website-service.yaml` | 前端 Nginx 的 Deployment 与 Service |
| `k8s/server-deploy.yaml`、`k8s/server-service.yaml` | 配置服务的 Deployment 与 Service |
| `k8s/configmap-nginx-{http,https,http_https}.yaml` | Nginx 主配置，按 `protocolType` 选用 |
| `k8s/configmap-nginx-common.yaml` | SPA 回退 `try_files $uri $uri/ /index.html` 与各后端代理 |
| `k8s/configmap-nginx-opod.yaml` | `/txwl/l5/`、`/l1server/`、`/l5server/` 等代理 |
| `k8s/configmap-nginx-inject.yaml` | `/status` 等附加 location |
| `k8s/configmap-cert.yaml` | HTTPS 证书 |

## Sentry

- 运行时：`VITE_SENTRY_DSN` 非空时启用，留空则不加载 SDK。
- 上传 sourcemap：在 `.env.local`（或环境变量）配置 `SENTRY_AUTH_TOKEN`，执行 `pnpm uploadToSentry`；配合打包脚本时执行 `UPLOAD_TO_SENTRY=true ./package.sh`。未配置 token 时构建直接失败。
- 上传时生成 hidden sourcemap，上传后从 `dist/` 删除，不随部署产物发布。
- org / project 取 `.env.production` 的 `SENTRY_ORG`、`SENTRY_PROJECT`；release 为 `package.json` 的 `version` 加 git 短 hash，构建插件与运行时一致。
