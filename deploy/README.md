# 部署包使用说明

本目录随 `package.sh` 打包进部署包 `vite-vue3-web_<hash>_<时间>.tar.gz`，解压后得到 `vite_vue3_web/`：

| 文件 | 说明 |
|---|---|
| `vite-vue3-web_<hash>.tar` | Docker 镜像（`docker save` 产物） |
| `manage.sh` | 容器管理脚本 |
| `nginx.conf` | Nginx 配置，启动时以只读方式挂载进容器 |
| `node_build_info.sh` | 构建信息：git hash、构建时间、分支、镜像名、镜像 MD5 |

## 部署

```bash
tar -xzf vite-vue3-web_<hash>_<时间>.tar.gz
cd vite_vue3_web
./manage.sh remove   # 首次部署可省略
./manage.sh start    # 自动加载目录中的镜像 tar 并启动
```

默认端口 `8080`，自定义端口：`PORT=8081 ./manage.sh start`。

- 应用：`http://<host>:8080`
- 版本信息：`http://<host>:8080/web/version`

## 管理命令

| 命令 | 说明 |
|---|---|
| `start` | 启动容器；目录中有镜像 tar 时先加载并标记为 `vite-vue3-web:local` |
| `stop` | 停止容器 |
| `restart` | 重启容器（修改 `nginx.conf` 后执行即可生效） |
| `remove` | 停止并删除容器 |
| `status` | 查看容器状态与访问地址 |
| `logs` | 跟随查看容器日志 |
| `build` | 在源码仓库中用已构建的 `dist/` 构建镜像 |
| `deploy <镜像>` | 从镜像仓库拉取镜像、标记为 `vite-vue3-web:local` 并重建容器，保留该仓库最近 3 个镜像（CI 部署使用） |

环境变量：`PORT`（宿主机端口，默认 `8080`）、`CONTAINER_NAME`（默认 `vite-vue3-web`）。

## Nginx 配置

镜像内置同一份 `nginx.conf`，`manage.sh start` 会把本目录的 `nginx.conf` 挂载覆盖，改完执行 `./manage.sh restart`。

- `/static/`：带 hash 的构建产物，缓存一年
- `/assets/`、`/locale/`：主题、loading 样式、Logo 与远程语言包，`no-cache` 协商缓存，替换文件即生效
- `/web/version`：版本信息，不缓存
- 其余路径回退到 `index.html`（SPA 路由），`index.html` 不缓存
- 预压缩的 `.gz` 由 `gzip_static` 直接返回
- 后端接口代理默认关闭，按需取消 `location /api/` 的注释并填写后端地址

校验配置：`docker exec vite-vue3-web nginx -t`。

## 热更新静态资源

`package.sh --full` 会生成 `static_assets_<hash>.tar.gz`（只含 `dist/` 与 `version.html`），用于不重建容器的更新：

```bash
tar -xzf static_assets_<hash>.tar.gz
docker cp dist/. vite-vue3-web:/usr/share/nginx/html/
docker cp version.html vite-vue3-web:/usr/share/nginx/html/
docker exec vite-vue3-web nginx -s reload
rm -rf dist version.html
```

## 回滚

```bash
tar -xzf vite-vue3-web_<旧hash>_<时间>.tar.gz
cd vite_vue3_web
./manage.sh remove
./manage.sh start
```

## 故障排查

| 现象 | 处理 |
|---|---|
| 端口被占用 | `lsof -i :8080`，或 `PORT=<其他端口> ./manage.sh start` |
| 容器起不来 | `./manage.sh logs` 查看日志，`docker exec vite-vue3-web nginx -t` 校验配置 |
| 页面仍是旧版本 | 确认 `/web/version` 的 hash 是否为新版本；`index.html` 不缓存，刷新页面即可加载新版本 |
