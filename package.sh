#!/bin/bash

# 在出现错误、未定义变量和管道故障时退出
set -euo pipefail

# 日志函数
log_info() { echo -e "\033[0;32m[INFO]\033[0m $*"; }
log_warn() { echo -e "\033[0;33m[WARN]\033[0m $*"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; }

# 清理函数
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf txwl_web version.html node_build_info.sh
}

# 错误处理
handle_error() {
    log_error "An error occurred on line $1"
    cleanup
    exit 1
}

# 设置错误处理
trap 'handle_error $LINENO' ERR
trap cleanup EXIT

# 检查必需工具
check_requirements() {
    local required_tools="docker git pnpm perl"
    for tool in $required_tools; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
}

# 创建构建信息
create_build_info() {
    log_info "Creating build info..."
    
    {
        echo "hash=${gitHash}"
        echo "build_at=${dateTime}"
        echo "branch=${gitBranch}"
        echo "website_docker_name=${websitImageName}"
    } > node_build_info.sh

    cp node_build_info.sh version.html
    perl -p -i -e 's/\n/<br>/g' version.html
}

# 构建前端资源
build_frontend() {
    log_info "Building frontend assets..."
    export defaultLanguage=zh-CN
    pnpm build
}

# 创建前端静态资源包
create_static_assets() {
    log_info "Creating static assets package for hot update..."
    local static_assets_name="static_assets_${gitHash}.tar.gz"
    tar -czf "${static_assets_name}" dist version.html
}

# 构建Docker镜像
build_docker_image() {
    log_info "Building Docker image for $platformArch..."
    local build_cmd="docker build"

    if [ "$platformArch" = "arm64" ]; then
        build_cmd+=" --platform linux/arm64"
    elif [ "$platformArch" = "amd64" ]; then
        build_cmd+=" --platform linux/amd64"
    fi

    $build_cmd -f "$DOCKERFILE_PATH" -t "${websitImageName}" \
        --build-arg BASE_IMAGE="${BASE_IMAGE}" .
}

# 准备部署文件
prepare_deployment_files() {
    log_info "Preparing deployment files..."
    mkdir -p txwl_web
    cp -r deploy/* txwl_web/
    cp -r deploy/k8s/* txwl_web/
    rm -rf txwl_web/k8s

    # 打标签并保存镜像
    local saved_image_name="${imageTagName}.tar"
    docker tag "${websitImageName}" "${imageTagName}"
    docker save "${imageTagName}" -o "txwl_web/${saved_image_name}"

    # 更新 values.yaml 中的镜像名称
    perl -p -i -e "s|image: nginx_vts:1.22.1|image: ${websitImageName}|g" txwl_web/values.yaml

    # 计算 MD5 并更新构建信息
    local md5=$(md5sum "txwl_web/${saved_image_name}" | awk '{ print $1 }')
    echo "web_docker_md5=${md5}" >> node_build_info.sh
    cp node_build_info.sh txwl_web/
}

# 主函数
main() {
    local start_time=$(date +%s)
    local full_build=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --full)
                full_build=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                echo "用法: $0 [--full]"
                echo "参数:"
                echo "  --full    执行完整构建，包括静态资源包"
                exit 1
                ;;
        esac
    done

    # 检查依赖
    check_requirements

    # 平台选择
    echo "请选择目标运行平台:"
    echo "1) amd64 (默认)"
    echo "2) arm64"
    read -p "请输入选项 [1]: " platform_choice
    platform_choice=${platform_choice:-1}

    case "$platform_choice" in
        1)
            platformArch="amd64"
            BASE_IMAGE="it-artifactory.yitu-inc.com/docker-local/ai-center-web/nginx-builder:dba226d"
            ;;
        2)
            platformArch="arm64"
            BASE_IMAGE="it-artifactory.yitu-inc.com/docker-local/txwl-web/arm64v8/nginx:1.21.1-alpine"
            ;;
        *)
            log_error "无效的选项: $platform_choice"
            log_error "请选择 1(amd64) 或 2(arm64)"
            exit 1
            ;;
    esac

    # 定义变量
    DOCKERFILE_PATH="./Dockerfile"
    ARTDOCKER_REGISTRY_LOCAL='it-artifactory.yitu-inc.com/docker-local'
    REPO_PREFIX='txwl-web/website'
    gitBranch=$(git rev-parse --abbrev-ref HEAD)
    gitHash=$(git rev-parse --short HEAD)
    dateTime=$(date "+%Y-%m-%d_%H-%M-%S")
    packagePrefix='txwl-website'
    imagePrefix='website'
    imageTag="${gitHash}-${platformArch}"
    websitImageName="${ARTDOCKER_REGISTRY_LOCAL}/${REPO_PREFIX}:${imageTag}"
    imageTagName="${imagePrefix}:${imageTag}"
    packageName="${packagePrefix}_${imageTag}_${dateTime}.tar.gz"

    # 执行构建步骤
    create_build_info
    build_frontend
    if [ "$full_build" = true ]; then
        log_info "执行完整构建，包括静态资源包..."
        create_static_assets
    fi
    build_docker_image
    prepare_deployment_files

    # 创建部署包
    log_info "Creating deployment package..."
    tar -czf "${packageName}" txwl_web

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_info "Successfully completed in ${duration} seconds!"
    log_info "Deployment package created: ${packageName}"
    log_info "Docker image saved in deployment package"
}

# 执行主函数
main "$@"