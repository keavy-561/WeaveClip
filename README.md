# WeaveClip (CutPilot)

![Badge](https://img.shields.io/badge/status-Phase_0-active-green?style=flat-square)
![Badge](https://img.shields.io/badge/frontend-React_18%20%2B%20TS%20%2B%20Vite-blue?style=flat-square)
![Badge](https://img.shields.io/badge/backend-Go%20%2B%20Gin-00ADD8?style=flat-square)
![Badge](https://img.shields.io/badge/design-Morandi_Minimal-899AAB?style=flat-square)

> **Talk to your footage. Get the video you mean.**

WeaveClip（CutPilot）是一个 **AI Native 视频剪辑助手**。用自然语言描述你想要的视频效果，AI 自动从原始素材中剪辑、拼接并渲染出成片。项目采用前后端分离架构，前端基于 React + Semi Design 构建 Morandi 风格编辑器界面，后端基于 Go + Gin 提供媒体处理与 AI 编排能力。

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 🤖 AI 对话式剪辑 | 用自然语言描述意图，AI 自动生成时间线与剪辑方案 |
| 🎬 专业时间轴 | 可视化多轨道编辑：视频轨、音频轨、文字轨 |
| 📤 智能素材管理 | 自动场景检测、ASR 语音转文字、视觉内容理解 |
| 🔌 Mock 优先开发 | 后端未就绪时前端全程可用 Mock 数据跑通全流程 |
| ⚡ 实时进度推送 | WebSocket 推送渲染进度，体验流畅不卡顿 |
| 🎨 Morandi 设计语言 | 低饱和莫兰迪色板 + Slate Blue 主色，克制专业的编辑器界面 |

---

## 🛠 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| React 18 + TypeScript | 组件开发框架 |
| Vite | 构建工具与开发服务器 |
| Semi Design | 企业级组件库（Button、Modal、Table、Nav 等） |
| CSS Modules | 样式隔离，严格遵循设计系统 Token |
| Zustand | 客户端状态管理（时间轴、选中片段、播放状态） |
| TanStack Query | 服务端数据获取与缓存 |
| React Router | 页面路由与导航 |
| i18next | 国际化文案管理 |

### 后端

| 技术 | 用途 |
|------|------|
| Go 1.22+ + Gin | HTTP 服务与路由 |
| GORM + PostgreSQL | 数据持久化 |
| Redis + Asynq | 异步任务队列（渲染任务调度） |
| S3 兼容存储（MinIO） | 原始素材与成片存储 |
| FFmpeg | 视频转码、拼接、渲染导出 |
| WebSocket | 渲染进度实时推送 |

### 开发基础设施

| 技术 | 用途 |
|------|------|
| Docker Compose | PostgreSQL、Redis、MinIO 本地编排 |
| Vitest + Testing Library | 前端单元与组件测试 |
| golangci-lint + go test | 后端代码检查与测试 |
| GitHub Actions | CI 全量测试门禁 |

---

## 📁 项目结构

```
WeaveClip/
├── web/                          # React 前端（端口 3000）
│   ├── src/
│   │   ├── pages/                # 页面级组件（Home / Projects / Editor / Create / Login）
│   │   ├── components/           # 可复用 UI 组件（按功能模块拆分）
│   │   ├── stores/               # Zustand 状态管理
│   │   ├── services/             # API 请求层（TanStack Query hooks）
│   │   ├── router.tsx            # React Router 路由表
│   │   ├── locales/              # i18n 多语言文案
│   │   └── styles/               # 全局样式与 CSS 变量定义
│   ├── package.json
│   └── vite.config.ts
│
├── server/                       # Go 后端（端口 8080）
│   ├── cmd/server/               # 服务入口
│   ├── internal/                 # 业务逻辑（handler / service / model）
│   ├── migrations/               # 数据库迁移脚本
│   ├── tests/                    # 后端测试
│   ├── go.mod
│   └── Makefile
│
├── doc/                          # 项目文档
│   ├── design-system.md          # 前端唯一视觉基准（Morandi 设计规范）
│   ├── development-plan.md       # 开发阶段规划
│   └── inventory-mapping.md      # 素材映射规则
│
├── scripts/                      # 环境脚本（setup / dev / smoke test）
├── docker-compose.yml            # 本地基础设施（PostgreSQL + Redis + MinIO）
├── README.md                     # 本文件
├── CONTRIBUTING.md               # 贡献指南
├── DESIGN.md                     # 产品设计文档
└── TEST_PLAN.md                  # 测试策略
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18+ 与 **pnpm**
- **Go** 1.22+
- **Docker**（用于 PostgreSQL / Redis / MinIO）
- **FFmpeg** 6+（Phase 1+ 视频处理需要）

### 一键初始化

```bash
./scripts/setup.sh   # 环境检查 + 安装前后端依赖
```

或手动安装：

```bash
# 前端
cd web && pnpm install && cd ..

# 后端
cd server && go mod download && cd ..
```

### 启动开发环境

```bash
# 方式一：使用脚本一键启动（推荐）
./scripts/dev.sh

# 方式二：手动启动
docker-compose up -d                              # 基础设施（PostgreSQL + Redis + MinIO）
cd server && go run ./cmd/server                  # 后端服务 → http://localhost:8080
cd web && pnpm dev                                # 前端开发服务器 → http://localhost:3000
```

### 访问地址

| 服务 | 地址 | 备注 |
|------|------|------|
| 前端开发服务器 | http://localhost:3000 | 主应用入口 |
| 后端 API | http://localhost:8080 | RESTful API |
| 健康检查 | http://localhost:8080/api/health | 后端存活探测 |
| MinIO 控制台 | http://localhost:9001 | 账号 `minioadmin` / 密码 `minioadmin` |

> **💡 Phase 0 说明**：后端数据库连接失败时自动降级为 Mock 模式，前端全程可用 Mock 数据跑通全流程，无需等待后端就绪。

---

## 📅 开发阶段

| Phase | 内容 | 状态 |
|-------|------|------|
| **Phase 0** | 产品骨架 + Mock 数据 | ✅ 完成 |
| **Phase 1** | Editor 基础编辑（上传 / 时间轴 / Trim / Split） | ⬜ 待开发 |
| **Phase 2** | AI Generate（一句话生成时间线） | ⬜ 待开发 |
| **Phase 3** | AI Edit（对话式修改） | ⬜ 待开发 |
| **Phase 4** | 真实视频处理（ASR / 场景检测 / Vision） | ⬜ 待开发 |
| **Phase 5** | FFmpeg 渲染导出 MP4 | ⬜ 待开发 |
| **Phase 6** | 体验优化（Undo / 版本历史） | ⬜ 待开发 |

> 详细计划见 [doc/development-plan.md](doc/development-plan.md)

---

## 🧪 测试

本地开发不强制跑测试，push 到远程时 CI 会自动执行全量测试门禁。

### 本地运行测试（可选）

```bash
# ── 前端测试 ──
cd web
pnpm install
pnpm test:run          # 单次运行测试
pnpm test:coverage     # 带覆盖率报告

# ── 后端测试 ──
cd server
go test ./...                          # 基础测试
make test-race                         # 竞态检测
make test-coverage                     # 覆盖率报告（生成 coverage.html）
make smoke                             # 冒烟测试（需先 docker-compose up -d）
```

### CI 测试流程

向 `main` 或 `feat/**` 分支 push、或提交 PR 时，CI 会自动执行以下门禁：

1. **后端**：`go vet` → `go test -race -coverprofile` → `go build`
2. **前端**：`pnpm test:run` → `pnpm build` → `pnpm run check:i18n`
3. **Lint**：`golangci-lint` + `eslint`
4. **冒烟测试**：health → auth → assets 全流程

> 详细测试策略见 [TEST_PLAN.md](TEST_PLAN.md)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

提交代码前请确认：

- [x] `pnpm build` 和 `go build` 通过
- [x] 前端 i18n 检查通过（`pnpm run check:i18n`）
- [x] 代码符合项目工程规范（见 [AGENTS.md](./AGENTS.md)）
- [x] Commit message 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

---

## 📄 License

MIT

---

<p align="center">
  Made with ❤️ by WeaveClip Team
</p>
