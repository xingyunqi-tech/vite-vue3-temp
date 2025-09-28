# 部署指导 Agent

## 职责
专门负责应用部署、运维监控、性能优化和环境管理，为AI提供完整的部署和运维解决方案指导。

## 🎯 部署策略

### 1. 部署环境分类
- **开发环境 (Development)**: 本地开发和调试
- **测试环境 (Testing)**: 功能测试和集成测试
- **预发布环境 (Staging)**: 生产前验证
- **生产环境 (Production)**: 正式对外服务

### 2. 部署方式选择
- **静态部署**: 适用于纯前端应用
- **容器化部署**: 使用Docker进行标准化部署
- **云原生部署**: 使用Kubernetes进行弹性扩展
- **CDN部署**: 全球内容分发加速

### 3. 部署原则
- **自动化**: 减少人工干预，提高部署效率
- **可回滚**: 支持快速回滚到上一版本
- **零停机**: 确保服务连续性
- **监控告警**: 实时监控部署状态

## 🐳 Docker容器化部署

### Dockerfile配置
```dockerfile
# 多阶段构建Dockerfile
# 构建阶段
FROM node:22-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json pnpm-lock.yaml ./

# 安装pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 生产阶段
FROM nginx:alpine AS production

# 安装必要工具
RUN apk add --no-cache curl

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /usr/share/nginx/html && \
    chown -R nextjs:nodejs /var/cache/nginx && \
    chown -R nextjs:nodejs /var/log/nginx && \
    chown -R nextjs:nodejs /etc/nginx/conf.d

# 切换到非root用户
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx配置
```nginx
# nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 性能优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 16M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html index.htm;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # HTML文件不缓存
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # SPA路由支持
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API代理
        location /api/ {
            proxy_pass http://backend-service:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # 超时设置
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # 健康检查端点
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # 错误页面
        error_page 404 /index.html;
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
```

### Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端应用
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: vite-vue3-frontend
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/var/log/nginx
    networks:
      - app-network
    restart: unless-stopped
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 后端服务（示例）
  backend:
    image: node:22-alpine
    container_name: vite-vue3-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/app
    networks:
      - app-network
    restart: unless-stopped

  # 数据库（示例）
  postgres:
    image: postgres:15-alpine
    container_name: vite-vue3-postgres
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

  # Redis缓存（示例）
  redis:
    image: redis:7-alpine
    container_name: vite-vue3-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## ☸️ Kubernetes部署

### 部署清单
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vite-vue3-app
  labels:
    name: vite-vue3-app

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: vite-vue3-app
data:
  nginx.conf: |
    # Nginx配置内容（同上）

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: vite-vue3-app
type: Opaque
data:
  # base64编码的敏感信息
  database-url: cG9zdGdyZXNxbDovL3VzZXI6cGFzc3dvcmRAcG9zdGdyZXM6NTQzMi9hcHA=

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
  namespace: vite-vue3-app
  labels:
    app: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: vite-vue3-app:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: nginx-config
        configMap:
          name: app-config

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: vite-vue3-app
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend-ingress
  namespace: vite-vue3-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: frontend-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: vite-vue3-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 🚀 CI/CD流水线

### GitHub Actions配置
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码质量检查
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint check
        run: pnpm lint

      - name: Unit tests
        run: pnpm test:unit

      - name: Build application
        run: pnpm build

  # 安全扫描
  security-scan:
    runs-on: ubuntu-latest
    needs: quality-check
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # 构建Docker镜像
  build-image:
    runs-on: ubuntu-latest
    needs: [quality-check, security-scan]
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image
        id: image
        run: |
          echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  # 部署到测试环境
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-image
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ needs.build-image.outputs.image }} to staging"
          # 这里添加实际的部署脚本

  # 部署到生产环境
  deploy-production:
    runs-on: ubuntu-latest
    needs: build-image
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build-image.outputs.image }} to production"
          # 这里添加实际的部署脚本

  # E2E测试
  e2e-tests:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: https://staging.example.com

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📊 监控和日志

### Prometheus监控配置
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'frontend-app'
    static_configs:
      - targets: ['frontend-service:80']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana仪表板配置
```json
{
  "dashboard": {
    "title": "Vue3 Frontend Monitoring",
    "panels": [
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(nginx_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(nginx_http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(nginx_http_requests_total{status=~\"5..\"}[5m]) / rate(nginx_http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      }
    ]
  }
}
```

### 日志收集配置
```yaml
# logging/fluentd.conf
<source>
  @type tail
  path /var/log/nginx/access.log
  pos_file /var/log/fluentd/nginx-access.log.pos
  tag nginx.access
  format nginx
</source>

<source>
  @type tail
  path /var/log/nginx/error.log
  pos_file /var/log/fluentd/nginx-error.log.pos
  tag nginx.error
  format /^(?<time>[^ ]* [^ ]*) \[(?<level>[^\]]*)\] (?<message>.*)$/
</source>

<filter nginx.**>
  @type record_transformer
  <record>
    hostname ${hostname}
    service frontend
  </record>
</filter>

<match nginx.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name nginx-logs
  type_name _doc
</match>
```

## 🔧 部署脚本

### 自动化部署脚本
```bash
#!/bin/bash
# deploy.sh

set -e

# 配置变量
APP_NAME="vite-vue3-app"
REGISTRY="ghcr.io/username"
IMAGE_TAG=${1:-latest}
ENVIRONMENT=${2:-production}

echo "🚀 开始部署 $APP_NAME 到 $ENVIRONMENT 环境"

# 检查必要的工具
check_requirements() {
    echo "📋 检查部署要求..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker 未安装"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl 未安装"
        exit 1
    fi
    
    echo "✅ 部署要求检查通过"
}

# 构建Docker镜像
build_image() {
    echo "🔨 构建Docker镜像..."
    
    docker build -t $REGISTRY/$APP_NAME:$IMAGE_TAG .
    
    if [ $? -eq 0 ]; then
        echo "✅ 镜像构建成功"
    else
        echo "❌ 镜像构建失败"
        exit 1
    fi
}

# 推送镜像到仓库
push_image() {
    echo "📤 推送镜像到仓库..."
    
    docker push $REGISTRY/$APP_NAME:$IMAGE_TAG
    
    if [ $? -eq 0 ]; then
        echo "✅ 镜像推送成功"
    else
        echo "❌ 镜像推送失败"
        exit 1
    fi
}

# 部署到Kubernetes
deploy_to_k8s() {
    echo "☸️ 部署到Kubernetes..."
    
    # 更新镜像标签
    kubectl set image deployment/frontend-deployment \
        frontend=$REGISTRY/$APP_NAME:$IMAGE_TAG \
        -n $APP_NAME
    
    # 等待部署完成
    kubectl rollout status deployment/frontend-deployment -n $APP_NAME
    
    if [ $? -eq 0 ]; then
        echo "✅ Kubernetes部署成功"
    else
        echo "❌ Kubernetes部署失败"
        kubectl rollout undo deployment/frontend-deployment -n $APP_NAME
        exit 1
    fi
}

# 健康检查
health_check() {
    echo "🏥 执行健康检查..."
    
    # 获取服务地址
    SERVICE_URL=$(kubectl get ingress frontend-ingress -n $APP_NAME -o jsonpath='{.spec.rules[0].host}')
    
    # 等待服务就绪
    for i in {1..30}; do
        if curl -f -s "https://$SERVICE_URL/health" > /dev/null; then
            echo "✅ 健康检查通过"
            return 0
        fi
        echo "⏳ 等待服务就绪... ($i/30)"
        sleep 10
    done
    
    echo "❌ 健康检查失败"
    exit 1
}

# 清理旧镜像
cleanup() {
    echo "🧹 清理旧镜像..."
    
    # 保留最近5个版本
    docker images $REGISTRY/$APP_NAME --format "table {{.Tag}}\t{{.CreatedAt}}" | \
    tail -n +2 | sort -k2 -r | tail -n +6 | awk '{print $1}' | \
    xargs -I {} docker rmi $REGISTRY/$APP_NAME:{} 2>/dev/null || true
    
    echo "✅ 清理完成"
}

# 发送通知
send_notification() {
    local status=$1
    local message="$APP_NAME 部署到 $ENVIRONMENT 环境 $status"
    
    # 发送到Slack（示例）
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            $SLACK_WEBHOOK_URL
    fi
    
    echo "📢 通知已发送: $message"
}

# 主执行流程
main() {
    trap 'send_notification "失败"' ERR
    
    check_requirements
    build_image
    push_image
    deploy_to_k8s
    health_check
    cleanup
    
    send_notification "成功"
    echo "🎉 部署完成！"
}

# 执行主流程
main
```

### 回滚脚本
```bash
#!/bin/bash
# rollback.sh

set -e

APP_NAME="vite-vue3-app"
ENVIRONMENT=${1:-production}

echo "⏪ 开始回滚 $APP_NAME 在 $ENVIRONMENT 环境"

# 回滚到上一版本
rollback_deployment() {
    echo "🔄 执行回滚..."
    
    kubectl rollout undo deployment/frontend-deployment -n $APP_NAME
    
    # 等待回滚完成
    kubectl rollout status deployment/frontend-deployment -n $APP_NAME
    
    if [ $? -eq 0 ]; then
        echo "✅ 回滚成功"
    else
        echo "❌ 回滚失败"
        exit 1
    fi
}

# 验证回滚
verify_rollback() {
    echo "🔍 验证回滚..."
    
    # 获取当前版本
    CURRENT_IMAGE=$(kubectl get deployment frontend-deployment -n $APP_NAME -o jsonpath='{.spec.template.spec.containers[0].image}')
    echo "当前镜像: $CURRENT_IMAGE"
    
    # 健康检查
    SERVICE_URL=$(kubectl get ingress frontend-ingress -n $APP_NAME -o jsonpath='{.spec.rules[0].host}')
    
    for i in {1..10}; do
        if curl -f -s "https://$SERVICE_URL/health" > /dev/null; then
            echo "✅ 回滚验证成功"
            return 0
        fi
        echo "⏳ 等待服务恢复... ($i/10)"
        sleep 5
    done
    
    echo "❌ 回滚验证失败"
    exit 1
}

# 主执行流程
main() {
    rollback_deployment
    verify_rollback
    echo "🎉 回滚完成！"
}

main
```

## 📈 性能优化

### 构建优化
```typescript
// vite.config.ts - 生产优化配置
export default defineConfig({
  build: {
    // 启用源码映射（生产环境可选）
    sourcemap: false,
    
    // 资源内联限制
    assetsInlineLimit: 4096,
    
    // 代码分割
    rollupOptions: {
      output: {
        // 手动分包
        manualChunks: {
          // 第三方库分包
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
          utils: ['lodash-es', 'dayjs'],
        },
        // 文件命名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // 预构建优化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus'],
  },
});
```

### CDN配置
```typescript
// 使用CDN加速静态资源
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vue', 'vue-router', 'element-plus'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          'element-plus': 'ElementPlus',
        },
      },
    },
  },
});
```

通过遵循这些部署指导和最佳实践，可以构建出稳定、高效、可扩展的部署体系，确保应用的高可用性和优秀的用户体验。
