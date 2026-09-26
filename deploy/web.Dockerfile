# WeaveClip Web 镜像（工单 WO11-02）：构建静态资源后由 nginx 托管并反代 API/WS。
# 构建上下文 = 仓库根目录：docker build -f deploy/web.Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ .
RUN pnpm build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
