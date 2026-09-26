# WeaveClip server/worker 镜像（工单 WO11-01）。
# 构建上下文 = 仓库根目录：docker build -f deploy/server.Dockerfile .
FROM golang:1.23-alpine AS build
WORKDIR /src/server
RUN apk add --no-cache git
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server \
 && CGO_ENABLED=0 go build -o /out/worker ./cmd/worker

# 运行层：渲染需要 ffmpeg/ffprobe
FROM alpine:3.20
RUN apk add --no-cache ffmpeg ca-certificates tzdata
COPY --from=build /out/server /usr/local/bin/server
COPY --from=build /out/worker /usr/local/bin/worker
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/server"]
