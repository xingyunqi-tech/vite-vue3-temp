#!/bin/bash

# 打包脚本：构建前端 → 构建 Docker 镜像 → 生成部署包
# 用法: ./package.sh [--full]

set -euo pipefail

log_info() { echo -e "\033[0;32m[INFO]\033[0m $*"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; }

APP_NAME="vite-vue3-web"
PACKAGE_DIR="vite_vue3_web"
DOCKERFILE_PATH="./Dockerfile"
BASE_IMAGE="${BASE_IMAGE:-nginx:alpine}"
REGISTRY="${REGISTRY:-docker-local}"
REPO_PREFIX="${REPO_PREFIX:-vite-vue3/web}"
# 目标平台，如 linux/amd64、linux/arm64；留空则与构建机一致
DOCKER_PLATFORM="${DOCKER_PLATFORM:-}"

cleanup() {
    rm -rf "$PACKAGE_DIR" version.html node_build_info.sh
}

handle_error() {
    log_error "An error occurred on line $1"
    exit 1
}

trap 'handle_error $LINENO' ERR
trap cleanup EXIT

check_requirements() {
    local tool
    for tool in docker git pnpm; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
}

file_md5() {
    if command -v md5sum >/dev/null 2>&1; then
        md5sum "$1" | awk '{ print $1 }'
    else
        md5 -q "$1"
    fi
}

create_build_info() {
    log_info "Creating build info..."
    {
        echo "hash=${gitHash}"
        echo "build_at=${dateTime}"
        echo "branch=${gitBranch}"
        echo "website_docker_name=${imageName}"
    } > node_build_info.sh
    awk 'BEGIN { ORS = "<br>" } { print }' node_build_info.sh > version.html
}

build_frontend() {
    log_info "Building frontend assets..."
    pnpm build
}

# 静态资源包：只替换 dist/ 与 version.html 的热更新使用
create_static_assets() {
    log_info "Creating static assets package for hot update..."
    tar -czf "static_assets_${gitHash}.tar.gz" dist version.html
}

build_docker_image() {
    log_info "Building Docker image ${imageName}..."
    local platform_args=()
    if [ -n "$DOCKER_PLATFORM" ]; then
        platform_args=(--platform "$DOCKER_PLATFORM")
    fi
    docker build ${platform_args[@]+"${platform_args[@]}"} -f "$DOCKERFILE_PATH" -t "$imageName" --build-arg BASE_IMAGE="$BASE_IMAGE" .
}

prepare_deployment_files() {
    log_info "Preparing deployment files..."
    mkdir -p "$PACKAGE_DIR"
    cp deploy/nginx.conf deploy/manage.sh deploy/README.md "$PACKAGE_DIR/"

    local image_tar="${PACKAGE_DIR}/${APP_NAME}_${gitHash}.tar"
    docker tag "$imageName" "$imageTagName"
    docker save "$imageTagName" -o "$image_tar"

    echo "web_docker_md5=$(file_md5 "$image_tar")" >> node_build_info.sh
    cp node_build_info.sh "$PACKAGE_DIR/"
}

main() {
    local start_time full_build=false
    start_time=$(date +%s)

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --full)
                full_build=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                echo "用法: $0 [--full]"
                echo "  --full    额外生成静态资源热更新包 static_assets_<hash>.tar.gz"
                exit 1
                ;;
        esac
    done

    check_requirements

    gitBranch=$(git rev-parse --abbrev-ref HEAD)
    gitHash=$(git rev-parse --short HEAD)
    dateTime=$(date "+%Y-%m-%d_%H-%M-%S")
    imageName="${REGISTRY}/${REPO_PREFIX}:${gitHash}"
    imageTagName="${APP_NAME}:${gitHash}"
    packageName="${APP_NAME}_${gitHash}_${dateTime}.tar.gz"

    create_build_info
    build_frontend
    if [ "$full_build" = true ]; then
        create_static_assets
    fi
    build_docker_image
    prepare_deployment_files

    log_info "Creating deployment package..."
    tar -czf "$packageName" "$PACKAGE_DIR"

    log_info "Successfully completed in $(($(date +%s) - start_time)) seconds!"
    log_info "Deployment package created: ${packageName}"
}

main "$@"
