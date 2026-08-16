# WeaveClip (CutPilot)

AI Native 视频剪辑助手 —— 告诉 AI 你想要什么，它帮你从原始素材剪出视频。

> Talk to your footage. Get the video you mean.

## 技术栈

- **前端**：React + TypeScript + Vite + Semi Design + CSS Modules + Zustand + React Router + TanStack Query
- **后端**：Go + Gin + GORM + PostgreSQL + Redis + Asynq + S3 兼容存储（MinIO）
- **多媒体**：FFmpeg（转码/拼接/渲染）
- **实时通信**：WebSocket（渲染进度推送）

## 项目结构

```
WeaveClip/
├── web/              # React 前端（端口 3000）
├── server/           # Go 后端（端口 8080）
├── doc/              # 产品与开发文档
├── scripts/          # 环境脚本
└── docker-compose.yml # 本地基础设施（PostgreSQL + Redis + MinIO）
```

## 快速开始

### 1. 环境要求

- Node.js 18+ 与 pnpm
- Go 1.22+
- Docker（用于 PostgreSQL / Redis / MinIO）
- FFmpeg 6+（Phase 1+ 需要）

### 2. 初始化

```bash
./scripts/setup.sh   # 环境检查 + 安装依赖
```

或手动安装：

```bash
cd web && pnpm install && cd ..
cd server && go mod download && cd ..
```

### 3. 启动开发环境

```bash
./scripts/dev.sh
# 或手动：
docker-compose up -d           # 基础设施
cd server && go run ./cmd/server  # 后端 :8080
cd web && pnpm dev                # 前端 :3000
```

- 前端：http://localhost:3000
- 后端健康检查：http://localhost:8080/api/health
- MinIO 控制台：http://localhost:9001（minioadmin/minioadmin）

> Phase 0 说明：后端数据库连接失败时自动降级为 Mock 模式，前端全程可用 Mock 数据跑通流程。

## 开发阶段

| Phase | 内容 | 状态 |
|-------|------|------|
| 0 | 产品骨架 + Mock 数据 | ✅ 完成 |
| 1 | Editor 基础编辑（上传/时间轴/Trim/Split） | ⬜ |
| 2 | AI Generate（一句话生成时间线） | ⬜ |
| 3 | AI Edit（对话式修改） | ⬜ |
| 4 | 真实视频处理（ASR/场景检测/Vision） | ⬜ |
| 5 | FFmpeg 渲染导出 MP4 | ⬜ |
| 6 | 体验优化（Undo/版本历史） | ⬜ |

详细计划见 [doc/development-plan.md](doc/development-plan.md)。
