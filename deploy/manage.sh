#!/bin/bash

# Docker 容器管理脚本
# 用法: ./manage.sh [start|stop|restart|remove|status|logs|build|help]

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="vite-vue3-web"
CONTAINER_NAME="${CONTAINER_NAME:-${APP_NAME}}"
IMAGE_NAME="${APP_NAME}:local"
PORT="${PORT:-31190}"
NGINX_PORT=80

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_blue() { echo -e "${BLUE}[INFO]${NC} $*"; }

check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
}

container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

image_exists() {
    docker image inspect "$IMAGE_NAME" >/dev/null 2>&1
}

# 从部署包中的镜像 tar 加载，并打上 local 标签
load_image() {
    local tar_file
    tar_file=$(find "$SCRIPT_DIR" -maxdepth 1 -name "${APP_NAME}_*.tar" -type f | head -1)
    if [ -z "$tar_file" ]; then
        return 1
    fi

    log_info "Loading Docker image from $(basename "$tar_file")..."
    local loaded_image
    loaded_image=$(docker load -i "$tar_file" | sed -n 's/^Loaded image: //p' | head -1)
    if [ -n "$loaded_image" ] && [ "$loaded_image" != "$IMAGE_NAME" ]; then
        log_info "Tagging ${loaded_image} as ${IMAGE_NAME}"
        docker tag "$loaded_image" "$IMAGE_NAME"
    fi
}

# 在源码仓库中用已构建的 dist/ 构建镜像
build_image() {
    local repo_dir
    repo_dir="$(cd "$SCRIPT_DIR/.." && pwd)"

    if [ ! -d "$repo_dir/dist" ]; then
        log_error "dist directory not found. Please run 'pnpm build' first."
        exit 1
    fi

    log_info "Building Docker image..."
    local git_hash build_at branch
    git_hash=$(git -C "$repo_dir" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    build_at=$(date "+%Y-%m-%d_%H-%M-%S")
    branch=$(git -C "$repo_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    echo "hash=${git_hash}<br>build_at=${build_at}<br>branch=${branch}" > "$repo_dir/version.html"

    docker build -f "$repo_dir/Dockerfile" -t "$IMAGE_NAME" "$repo_dir"
    rm -f "$repo_dir/version.html"
    log_info "Docker image built successfully: $IMAGE_NAME"
}

start_container() {
    if container_running; then
        log_warn "Container '$CONTAINER_NAME' is already running"
        show_status
        return 0
    fi

    if container_exists; then
        log_info "Starting existing container '$CONTAINER_NAME'..."
        docker start "$CONTAINER_NAME"
    else
        # 部署包目录里的镜像 tar 优先，保证重新部署时用的是本次打包的镜像
        if load_image; then
            log_info "Image loaded successfully"
        elif ! image_exists; then
            log_info "No image tar found. Building image from source..."
            build_image
        fi

        log_info "Creating and starting container '$CONTAINER_NAME'..."
        log_blue "Mapping port: ${PORT} -> ${NGINX_PORT}"
        docker run -d \
            --name "$CONTAINER_NAME" \
            -p "${PORT}:${NGINX_PORT}" \
            --add-host host.docker.internal:host-gateway \
            -v "${SCRIPT_DIR}/nginx.conf:/etc/nginx/nginx.conf:ro" \
            --restart unless-stopped \
            "$IMAGE_NAME"
    fi

    sleep 2
    if container_running; then
        log_info "Container started successfully!"
        show_status
    else
        log_error "Failed to start container"
        exit 1
    fi
}

stop_container() {
    if ! container_running; then
        log_warn "Container '$CONTAINER_NAME' is not running"
        return 0
    fi
    log_info "Stopping container '$CONTAINER_NAME'..."
    docker stop "$CONTAINER_NAME"
    log_info "Container stopped successfully"
}

restart_container() {
    if container_exists; then
        log_info "Restarting container '$CONTAINER_NAME'..."
        docker restart "$CONTAINER_NAME"
        sleep 2
        show_status
    else
        log_warn "Container does not exist. Starting new container..."
        start_container
    fi
}

remove_container() {
    if ! container_exists; then
        log_warn "Container '$CONTAINER_NAME' does not exist"
        return 0
    fi
    if container_running; then
        log_info "Stopping container first..."
        docker stop "$CONTAINER_NAME"
    fi
    log_info "Removing container '$CONTAINER_NAME'..."
    docker rm "$CONTAINER_NAME"
    log_info "Container removed successfully"
}

show_status() {
    if ! container_exists; then
        log_warn "Container '$CONTAINER_NAME' does not exist"
        return 0
    fi
    log_blue "Container Status:"
    docker ps -a --filter "name=^${CONTAINER_NAME}$" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
    if container_running; then
        echo ""
        log_blue "Quick Links:"
        echo "  Application: http://localhost:${PORT}"
        echo "  Version:     http://localhost:${PORT}/web/version"
    fi
}

show_logs() {
    if ! container_exists; then
        log_error "Container '$CONTAINER_NAME' does not exist"
        exit 1
    fi
    log_info "Showing logs for '$CONTAINER_NAME' (press Ctrl+C to exit)..."
    docker logs -f "$CONTAINER_NAME"
}

show_help() {
    echo -e "$(cat <<EOF
${BLUE}Docker Container Management Script${NC}

Usage: $0 [COMMAND]

${GREEN}Commands:${NC}
  start       Start the container (load image tar or build if needed)
  stop        Stop the running container
  restart     Restart the container
  remove      Remove the container
  status      Show container status
  logs        Show and follow container logs
  build       Build Docker image from source (requires dist/)
  help        Show this help message

${GREEN}Environment Variables:${NC}
  PORT            Host port to bind (default: 31190)
  CONTAINER_NAME  Container name (default: ${APP_NAME})

${GREEN}Configuration:${NC}
  Container name: ${CONTAINER_NAME}
  Image name:     ${IMAGE_NAME}
  Nginx config:   ${SCRIPT_DIR}/nginx.conf (mounted read-only)
EOF
)"
}

main() {
    local command="${1:-help}"

    case "$command" in
        help | --help | -h)
            show_help
            return 0
            ;;
    esac

    check_docker
    case "$command" in
        start) start_container ;;
        stop) stop_container ;;
        restart) restart_container ;;
        remove | rm) remove_container ;;
        status) show_status ;;
        logs) show_logs ;;
        build) build_image ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
