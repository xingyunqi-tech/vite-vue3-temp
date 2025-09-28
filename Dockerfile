ARG BASE_IMAGE=nginx:latest
FROM $BASE_IMAGE

WORKDIR /usr/share/nginx/html

# 复制所有静态资源
COPY dist/ .
COPY version.html .

EXPOSE 80 11180 11181

CMD ["nginx", "-g", "daemon off;"]