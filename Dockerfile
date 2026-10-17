ARG BASE_IMAGE=nginx:alpine
FROM $BASE_IMAGE

WORKDIR /usr/share/nginx/html

# 默认 Nginx 配置，可通过 volume 挂载覆盖
COPY deploy/nginx.conf /etc/nginx/nginx.conf

# 预构建的静态资源与版本信息
COPY dist/ .
COPY version.html .

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
