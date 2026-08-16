# CutPilot — AI 视频剪辑助手 · 开发计划

> Talk to your footage. Get the video you mean.
> 告诉 AI 你想要什么，它帮你从原始素材剪出视频。

---

## 1. 项目概述

### 1.1 产品定位

CutPilot 是一款 AI Native 的视频剪辑助手，将传统视频编辑流程重新定义为：

**表达意图 → AI 执行 → 用户控制 → 导出**

不做"AI 版剪映"，而是让用户通过自然语言完成视频创作，AI 负责素材分析、剪辑决策和时间线生成，用户负责审美判断和最终决策。

### 1.2 核心产品原则

- AI 自动做，但用户永远能看到、理解、修改和撤销 AI 的行为
- 自然语言是主要交互方式，不是辅助
- 上下文感知：AI 理解当前选中对象、时间点和项目状态

### 1.3 目标用户（第一阶段）

- 内容创作者：留学生、个人创作者、小红书/抖音/TikTok 创作者
- 个人品牌运营者
- 拥有大量原始素材但缺少剪辑时间或专业能力的人

### 1.4 核心使用场景

用户拍摄素材后，告诉 AI：
> "帮我剪一个 45 秒的纽约旅行 vlog，节奏轻快，前 3 秒要抓人，突出时代广场和中央公园，字幕简洁一点。"

产品将这句话转化为：素材选择 → 时间线排列 → 视觉效果 → 字幕生成 → 完整视频。

---

## 2. 技术架构

### 2.1 完整技术栈

| 架构分层 | 核心技术 / 方案 | 推荐依赖库 | 核心职责与应用场景 |
|:---|:---|:---|:---|
| **前端·基础内核** | React + TypeScript | `react`, `typescript`, `vite` | 客户端工程基础，毫秒级热更新，强类型开发 |
| **前端·UI 与图标** | Semi Design | `@douyinfe/semi-ui`, `@douyinfe/semi-icons` | 字节开源企业级 UI 库，界面温和克制、无浮夸发光 |
| **前端·样式方案** | CSS Modules + SCSS | `sass` + Semi Design Tokens | 组件级样式隔离，直接复用 Semi 官方 CSS 变量，完全剔除 Tailwind |
| **前端·状态与路由** | Zustand + React Router | `zustand`, `react-router-dom` | 管理剪辑时间轴状态、片段选中、页面路由跳转 |
| **前端·请求与数据** | TanStack Query + Axios | `@tanstack/react-query`, `axios` | 处理后端 API 请求、数据缓存与静默重试 |
| **前端·表单与校验** | Semi Form + Zod | `zod` | 参数配置表单管理与强类型数据边界校验 |
| **前端·包管理工具** | pnpm | `pnpm` | 依赖快速安装与本地磁盘空间优化 |
| **后端·核心底座** | Go (Golang) | `go 1.22+` | 高并发流式 I/O、极轻的内存占用与高密度容器化部署 |
| **后端·Web 框架** | Gin Web Framework | `github.com/gin-gonic/gin` | RESTful API 路由分发、中间件鉴权、请求参数解析 |
| **后端·任务调度** | Redis + Asynq | `github.com/hibiken/asynq` | 分布式异步任务队列，解耦长时间的视频转码与渲染任务 |
| **后端·持久化存储** | PostgreSQL + GORM | `gorm.io/gorm`, `gorm.io/driver/postgres` | 存储用户信息、视频片段元数据、剪辑工程 JSON 结构 |
| **后端·对象存储** | S3 兼容对象存储 | MinIO（本地）/ 阿里云 OSS / AWS S3 | 存储原始视频素材、提取的音频轨、最终导出的成品视频 |
| **后端·实时通信** | WebSocket | `github.com/gorilla/websocket` | 实时向前端客户端推送视频渲染进度（0% ~ 100%）与错误日志 |
| **多媒体·渲染引擎** | FFmpeg | FFmpeg 6.x+（通过 Go `os/exec` 调度） | 底层音视频切片、拼接、抽帧、滤镜叠加与音频合并 |

### 2.2 系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                      Browser (React Client)                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Vite + React + TypeScript               │   │
│  │  ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │   Pages   │ │  Components  │ │  Zustand │ │  Axios │  │   │
│  │  │(React Rtr)│ │(Semi Design) │ │ (State)  │ │(HTTP/WS)│  │   │
│  │  └─────┬─────┘ └──────────────┘ └──────────┘ └───┬────┘  │   │
│  └────────┼────────────────────────────────────────────┼──────┘   │
│           │  REST API (TanStack Query)   │ WebSocket (进度推送)    │
└───────────┼────────────────────────────┼───────────────────────┘
            │                            │
┌───────────▼────────────────────────────▼───────────────────────┐
│                    Go Backend (Gin)                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │   Auth     │ │  Projects  │ │  AI Agent │ │   Assets    │  │  │
│  │ Middleware │ │    API     │ │    API    │ │   Upload    │  │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬──────┘  │  │
│        │              │              │               │          │  │
│  ┌─────▼──────┐ ┌─────▼──────┐       │        ┌─────▼──────┐  │  │
│  │  Asynq     │ │   GORM     │       │        │    S3      │  │  │
│  │  Task      │ │ PostgreSQL │       │        │  Storage   │  │  │
│  │  Queue     │ │            │       │        │ (MinIO/OSS)│  │  │
│  └─────┬──────┘ └────────────┘       │        └────────────┘  │  │
│        │                           │                          │  │
│  ┌─────▼──────┐  ┌────────────────▼───────────────┐          │  │
│  │  FFmpeg    │  │           AI Models              │          │  │
│  │  Workers   │  │  OpenAI GPT-4o / Claude API     │          │  │
│  │  (转码/渲染)│  │  Whisper ASR / Vision            │          │  │
│  └────────────┘  └──────────────────────────────────┘          │  │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 数据流

```
自然语言 → Intent Parser → Planning Agent → Asset Retrieval → Editing Agent
    → Video DSL JSON → Timeline Validator → FFmpeg Preview/Render → MP4
```

> 核心原则：LLM 只生成结构化的 Video DSL / Editing Operations，由程序验证和渲染，不让 LLM 直接生成代码。

### 2.4 前后端交互方式

| 场景 | 通信方式 | 说明 |
|------|---------|------|
| CRUD 操作 | REST API + TanStack Query | 项目/素材/版本管理 |
| 文件上传 | HTTP Multipart + S3 Presigned URL | 大文件直传 S3，后端只管元数据 |
| AI 对话 | REST API (SSE 或轮询) | 发送 prompt → 返回操作结果 |
| 渲染进度 | WebSocket | 实时推送渲染进度百分比 |
| 素材分析 | REST API 轮询 | 提交分析任务 → 轮询进度 |

---

## 3. UI / Visual 设计系统

### 3.1 设计方向

**Dark Creative Studio** — 参考 Linear 的克制、Figma 的工具感，结合创意工具的专业感和现代 AI 产品的交互方式。使用 Semi Design 提供的组件体系，保持温和克制的企业级 UI 风格。

### 3.2 深色主题（默认）

| Semi Token / CSS 变量 | 值 | 用途 |
|-----------------------|----|------|
| `--semi-color-bg-0` | `#09090B` | 全局背景 |
| `--semi-color-bg-1` | `#111113` | 一级面板 |
| `--semi-color-bg-2` | `#18181B` | 卡片 / 二级面板 |
| `--semi-color-border` | `#27272A` | 边框 / 分割线 |
| `--semi-color-primary` | `#8B5CF6` | AI 状态、CTA、Focus、Selection |
| `--semi-color-primary-hover` | `#7C3AED` | 主按钮 Hover |
| `--semi-color-text-0` | `#F4F4F5` | 主要文字 |
| `--semi-color-text-1` | `#A1A1AA` | 次级文字 |
| `--semi-color-text-2` | `#71717A` | 弱化信息 / 占位符 |
| `--semi-color-success` | `#22C55E` | 成功状态 |
| `--semi-color-warning` | `#F59E0B` | 警告状态 |
| `--semi-color-danger` | `#EF4444` | 错误状态 |
| `--color-ai-accent` | `#8B5CF6` | AI 相关强调（动画、光效等） |

### 3.3 浅色主题（切换）

| Semi Token / CSS 变量 | 值 | 用途 |
|-----------------------|----|------|
| `--semi-color-bg-0` | `#F5F5F7` | 全局背景 |
| `--semi-color-bg-1` | `#FFFFFF` | 一级面板 |
| `--semi-color-bg-2` | `#F0F0F2` | 卡片 / 二级面板 |
| `--semi-color-border` | `#E4E4E7` | 边框 / 分割线 |
| `--semi-color-primary` | `#7C3AED` | CTA 按钮、Focus、Selection |
| `--semi-color-primary-hover` | `#6D28D9` | 主按钮 Hover |
| `--semi-color-text-0` | `#18181B` | 主要文字 |
| `--semi-color-text-1` | `#52525B` | 次级文字 |
| `--semi-color-text-2` | `#A1A1AA` | 弱化信息 / 占位符 |
| `--semi-color-success` | `#16A34A` | 成功状态 |
| `--semi-color-warning` | `#D97706` | 警告状态 |
| `--semi-color-danger` | `#DC2626` | 错误状态 |
| `--color-ai-accent` | `#7C3AED` | AI 相关强调 |

### 3.4 字体

| 用途 | 字体 | 回退 |
|------|------|------|
| 英文主字体 | Inter | system-ui, sans-serif |
| 中文 | Noto Sans SC | "PingFang SC", "Microsoft YaHei", sans-serif |
| 代码/数字 | JetBrains Mono | monospace |

### 3.5 圆角

| 组件 | 圆角 | Semi Design 变量 |
|------|------|-----------------|
| Card | `12px` | `--semi-border-radius-large` |
| Button | `8px` | `--semi-border-radius-small` |
| Input / Textarea | `10px` | `--semi-border-radius-medium` |
| Dialog / Modal | `16px` | `--semi-border-radius-extra-large` |
| Tooltip / Popover | `8px` | `--semi-border-radius-small` |
| Avatar | `9999px` (圆形) | — |

### 3.6 设计原则

- 紫色仅用于 AI/Focus/CTA 强调，不要让整个页面充满紫色渐变
- 深色模式下确保足够的对比度（文字 vs 背景）
- 编辑器区域使用更大圆角，控制面板使用更小圆角
- 时间轴区域保持紧凑布局，减少视觉噪音
- AI 交互区域要有明确的视觉标识（紫色光效/呼吸动画）
- 使用 Semi Design Tokens 覆盖默认值，保持设计一致性

---

## 4. 项目目录结构

### 4.1 前端 (web/)

```
web/
├── public/
│   ├── fonts/                    # 自托管字体（Inter, Noto Sans SC）
│   └── images/                   # 静态图片资源
├── src/
│   ├── pages/                    # 页面组件（React Router 路由）
│   │   ├── Home/                  # 首页
│   │   │   └── index.tsx
│   │   ├── Projects/              # 项目列表
│   │   │   └── index.tsx
│   │   ├── Create/                # 创建流程
│   │   │   ├── Upload/            # 上传素材
│   │   │   │   └── index.tsx
│   │   │   └── Describe/          # 描述需求
│   │   │       └── index.tsx
│   │   ├── Editor/                # 编辑器
│   │   │   └── [projectId]/
│   │   │       └── index.tsx
│   │   ├── Settings/
│   │   │   └── index.tsx
│   │   └── Login/
│   │       └── index.tsx
│   ├── components/                # 组件
│   │   ├── ui/                    # 通用 UI 封装（基于 Semi Design）
│   │   │   ├── ThemeToggle/
│   │   │   ├── LoadingSpinner/
│   │   │   ├── EmptyState/
│   │   │   ├── ErrorBoundary/
│   │   │   └── Logo/
│   │   ├── editor/                # 编辑器核心组件
│   │   │   ├── VideoPlayer/
│   │   │   │   └── index.tsx
│   │   │   ├── Timeline/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── Track/
│   │   │   │   ├── Clip/
│   │   │   │   ├── Playhead/
│   │   │   │   └── Ruler/
│   │   │   ├── Assets/
│   │   │   │   ├── AssetPanel/
│   │   │   │   ├── AssetCard/
│   │   │   │   └── UploadZone/
│   │   │   ├── Inspector/
│   │   │   │   ├── InspectorPanel/
│   │   │   │   ├── ClipInspector/
│   │   │   │   └── CaptionInspector/
│   │   │   ├── AIChat/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ChatMessage/
│   │   │   │   ├── PromptInput/
│   │   │   │   └── QuickActions/
│   │   │   └── Export/
│   │   │       └── ExportDialog/
│   │   ├── home/                  # 首页组件
│   │   │   ├── HeroSection/
│   │   │   ├── ProjectCard/
│   │   │   └── ExamplePrompts/
│   │   └── create/                # 创建流程组件
│   │       ├── UploadStep/
│   │       ├── AnalyzeProgress/
│   │       ├── DescribeForm/
│   │       └── StylePicker/
│   ├── stores/                    # Zustand 状态管理
│   │   ├── timelineStore.ts        # 时间轴状态（clips/tracks/selection）
│   │   ├── editorStore.ts          # 编辑器全局状态
│   │   ├── aiChatStore.ts          # AI 对话消息状态
│   │   ├── projectStore.ts         # 当前项目状态
│   │   └── themeStore.ts           # 主题状态
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useTimeline.ts          # 时间轴操作
│   │   ├── useVideoPlayer.ts       # 播放器控制
│   │   ├── useAIChat.ts            # AI 对话
│   │   ├── useAssets.ts            # 素材管理
│   │   ├── useProject.ts           # 项目数据
│   │   ├── useHistory.ts           # Undo/Redo
│   │   └── useWebSocket.ts         # WebSocket 连接（渲染进度）
│   ├── services/                   # API 请求层
│   │   ├── api.ts                  # Axios 实例配置
│   │   ├── projectService.ts      # 项目 API
│   │   ├── assetService.ts         # 素材 API
│   │   ├── analyzeService.ts       # 分析 API
│   │   ├── generateService.ts      # AI 生成 API
│   │   ├── chatService.ts          # AI 对话 API
│   │   └── renderService.ts        # 渲染 API
│   ├── types/                      # TypeScript 类型定义
│   │   ├── project.ts
│   │   ├── asset.ts
│   │   ├── timeline.ts
│   │   ├── ai.ts
│   │   └── api.ts
│   ├── utils/                      # 工具函数
│   │   ├── format.ts              # 时间格式化等
│   │   └── validators.ts          # Zod schemas
│   ├── styles/                     # 全局样式
│   │   ├── global.scss             # 全局基础样式
│   │   ├── themes/
│   │   │   ├── dark.scss           # 深色主题变量覆盖
│   │   │   └── light.scss          # 浅色主题变量覆盖
│   │   └── variables.scss          # 公共 SCSS 变量
│   ├── router.tsx                  # React Router 路由配置
│   ├── App.tsx                     # 根组件
│   └── main.tsx                    # 入口文件
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env                            # 前端环境变量
```

### 4.2 后端 (server/)

```
server/
├── cmd/
│   └── server/
│       └── main.go                 # 程序入口
├── internal/
│   ├── config/
│   │   └── config.go               # 配置加载（YAML/环境变量）
│   ├── middleware/
│   │   ├── auth.go                 # JWT 鉴权中间件
│   │   ├── cors.go                 # CORS 中间件
│   │   └── logger.go               # 请求日志中间件
│   ├── handler/                    # Gin Handler（Controller 层）
│   │   ├── auth_handler.go         # 登录/注册
│   │   ├── project_handler.go      # 项目 CRUD
│   │   ├── asset_handler.go        # 素材上传/管理
│   │   ├── analyze_handler.go      # 素材分析
│   │   ├── generate_handler.go     # AI 生成
│   │   ├── chat_handler.go         # AI 对话编辑
│   │   ├── render_handler.go       # 渲染任务
│   │   └── ws_handler.go           # WebSocket 处理
│   ├── service/                    # 业务逻辑层
│   │   ├── auth_service.go
│   │   ├── project_service.go
│   │   ├── asset_service.go        # 含 S3 上传逻辑
│   │   ├── analyze_service.go      # 调度 FFmpeg 分析任务
│   │   ├── generate_service.go     # AI Agent Pipeline
│   │   ├── chat_service.go         # AI 对话编辑
│   │   └── render_service.go       # 调度 FFmpeg 渲染任务
│   ├── ai/                         # AI 能力层
│   │   ├── intent_parser.go        # 自然语言意图解析
│   │   ├── planning_agent.go       # 剪辑规划 Agent
│   │   ├── asset_retriever.go       # 素材检索
│   │   ├── editing_agent.go         # 编辑执行 Agent
│   │   ├── timeline_validator.go   # 时间线校验
│   │   ├── prompt_templates.go     # Prompt 模板
│   │   ├── llm_client.go          # LLM API 封装（OpenAI/Claude）
│   │   ├── asr_client.go           # Whisper ASR 封装
│   │   └── vision_client.go       # Vision API 封装
│   ├── ffmpeg/                     # FFmpeg 封装层
│   │   ├── executor.go             # FFmpeg 命令构建与执行
│   │   ├── probe.go                # ffprobe 元数据提取
│   │   ├── thumbnail.go            # 缩略图生成
│   │   ├── transcode.go            # 转码/切片
│   │   ├── concat.go               # 视频拼接
│   │   ├── scene_detect.go         # 场景检测
│   │   ├── extract_audio.go        # 音频提取
│   │   └── render.go              # 最终渲染（加字幕/滤镜/音频合并）
│   ├── worker/                     # Asynq 异步任务 Worker
│   │   ├── server.go               # Asynq Server 初始化
│   │   ├── analyze_worker.go       # 素材分析任务处理
│   │   └── render_worker.go        # 渲染任务处理
│   ├── model/                      # GORM 数据模型
│   │   ├── user.go
│   │   ├── project.go
│   │   ├── asset.go
│   │   ├── timeline.go
│   │   ├── generation.go
│   │   ├── edit.go
│   │   └── render.go
│   ├── repository/                 # 数据访问层（可选拆分）
│   │   ├── user_repo.go
│   │   ├── project_repo.go
│   │   ├── asset_repo.go
│   │   ├── timeline_repo.go
│   │   ├── generation_repo.go
│   │   ├── edit_repo.go
│   │   └── render_repo.go
│   ├── dto/                        # 请求/响应 DTO
│   │   ├── request/
│   │   │   ├── project_req.go
│   │   │   ├── asset_req.go
│   │   │   ├── generate_req.go
│   │   │   ├── chat_req.go
│   │   │   └── render_req.go
│   │   └── response/
│   │       ├── project_resp.go
│   │       ├── asset_resp.go
│   │       ├── timeline_resp.go
│   │       └── render_resp.go
│   └── pkg/                        # 公共工具包
│       ├── storage/
│       │   └── s3.go               # S3 兼容存储客户端
│       ├── jwt/
│       │   └── jwt.go              # JWT 签发/验证
│       ├── ws/
│       │   └── hub.go              # WebSocket Hub（管理连接池）
│       └── logger/
│           └── logger.go           # 结构化日志（zap）
├── migrations/                     # 数据库迁移
│   ├── 00001_init_schema.up.sql
│   └── 00001_init_schema.down.sql
├── config/
│   ├── dev.yaml                    # 开发环境配置
│   └── prod.yaml                   # 生产环境配置
├── go.mod
├── go.sum
├── Makefile
└── Dockerfile
```

### 4.3 项目根目录

```
WeaveClip/
├── web/                            # React 前端
├── server/                         # Go 后端
├── doc/                            # 文档
│   └── development-plan.md         # 本文件
├── scripts/                        # 脚本工具
│   ├── setup.sh                    # 一键初始化环境
│   └── dev.sh                      # 启动开发环境
├── docker-compose.yml               # 本地开发环境（PostgreSQL + Redis + MinIO）
├── .gitignore
└── README.md
```

---

## 5. Phase 0–6 详细开发计划

### Phase 0：产品骨架（页面流程 + Mock 数据）

**目标**：搭建完整的前后端项目骨架，页面流程跑通，全部使用 Mock 数据，不接真实后端。

**预计工期**：5–7 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 0.1 | 前端项目初始化 | `web/` 目录 | `pnpm create vite` 初始化 React + TS，安装 Semi Design、Zustand、React Router、Axios、TanStack Query、Zod、SCSS |
| 0.2 | 主题系统搭建 | `web/src/styles/themes/`, `web/src/stores/themeStore.ts`, `web/src/components/ui/ThemeToggle/` | Semi Design Tokens 覆盖实现深浅双主题，CSS 变量 + `data-theme` 属性切换，localStorage 持久化 |
| 0.3 | 全局样式与字体 | `web/src/styles/global.scss`, `web/src/styles/variables.scss` | 加载 Inter + Noto Sans SC，重置样式，定义公共 SCSS 变量 |
| 0.4 | 路由配置 | `web/src/router.tsx`, `web/src/App.tsx`, `web/src/main.tsx` | React Router v6 路由：`/` `/projects` `/projects/new` `/projects/new/describe` `/editor/:projectId` `/settings` `/login` |
| 0.5 | 首页 Home | `web/src/pages/Home/`, `web/src/components/home/` | Hero Section + "Start creating" + 项目列表（Mock 3 个），Semi `Card` + `Button` + `Input` |
| 0.6 | 项目列表页 | `web/src/pages/Projects/` | Semi `Card` 网格展示，Mock 项目数据 |
| 0.7 | 创建 - 上传素材 | `web/src/pages/Create/Upload/`, `web/src/components/create/UploadStep/` | 拖拽上传区 UI，支持 MP4/MOV/JPG/PNG 格式提示，Mock 上传成功回调 |
| 0.8 | 创建 - 素材分析进度 | `web/src/components/create/AnalyzeProgress/` | Semi `Progress` + `List`，展示分析结果（clips/speakers/transcript/scenes/moments），Mock 数据 |
| 0.9 | 创建 - 描述需求 | `web/src/pages/Create/Describe/`, `web/src/components/create/DescribeForm/`, `web/src/components/create/StylePicker/` | Semi `TextArea`（自然语言输入）、`RadioGroup`（时长 15/30/45/60s）、`RadioGroup`（格式 9:16/16:9/1:1）、`RadioGroup`（风格）、`Button`（Generate） |
| 0.10 | Editor 页面布局 | `web/src/pages/Editor/[projectId]/` | 三栏布局：左 Assets（`240px`）+ 中 Preview/Timeline（`flex: 1`）+ 右 AI Chat（`320px`），CSS Grid 或 Flexbox |
| 0.11 | Editor - Assets 面板 | `web/src/components/editor/Assets/` | Semi `Tabs`（Clips/Audio/Images），素材卡片列表，Mock 缩略图 |
| 0.12 | Editor - Preview 区域 | `web/src/components/editor/VideoPlayer/` | 静态预览占位区域，底部播放控制条 UI（Semi `Button` + 时间显示） |
| 0.13 | Editor - Timeline | `web/src/components/editor/Timeline/` | 基础时间轴 UI（刻度尺 + Mock 片段块），播放头指示器 |
| 0.14 | Editor - AI Chat | `web/src/components/editor/AIChat/` | Semi `List`（消息列表）+ `Input`（输入框）+ 快捷操作按钮组 |
| 0.15 | 后端项目初始化 | `server/` 目录 | `go mod init`，安装 Gin、GORM、Asynq、Gorilla WebSocket、zap |
| 0.16 | 后端基础骨架 | `server/cmd/server/main.go`, `server/internal/config/`, `server/internal/middleware/` | Gin 路由注册、CORS 中间件、日志中间件、配置加载 |
| 0.17 | 数据库连接 | `server/internal/model/`, `server/internal/repository/` | GORM 连接 PostgreSQL，AutoMigrate 建表，Docker Compose 启动 PostgreSQL + Redis + MinIO |
| 0.18 | Mock API 端点 | `server/internal/handler/` | `/api/projects` GET/POST（Mock JSON），前端接入 TanStack Query |
| 0.19 | 路由串联验证 | 前端全部页面 | Home → New → Upload → Analyze → Describe → Generate → Editor 全流程跑通 |

#### 验收标准

- [ ] `docker-compose up` 一键启动 PostgreSQL + Redis + MinIO
- [ ] `pnpm dev` 启动前端，`go run` 启动后端
- [ ] 从首页点击 "New Video" 进入创建流程，全流程跑通到 Editor
- [ ] Editor 三栏布局正确显示（左 Assets + 中 Preview/Timeline + 右 AI Chat）
- [ ] 深色/浅色主题可切换，所有页面配色正确
- [ ] 前端通过 TanStack Query 成功请求后端 Mock API
- [ ] 无 console 报错

---

### Phase 1：Editor 基础编辑能力

**目标**：不接 AI，实现基础视频编辑能力——真实上传素材到 S3，手动操作时间轴。

**预计工期**：10–14 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 1.1 | S3 存储客户端 | `server/internal/pkg/storage/s3.go` | 封装 S3 兼容 API（MinIO/OSS），支持上传/下载/删除/生成 Presigned URL |
| 1.2 | 素材上传 API | `server/internal/handler/asset_handler.go`, `server/internal/service/asset_service.go`, `server/internal/dto/request/asset_req.go` | Multipart 上传 → S3 存储，记录元数据到 PostgreSQL，返回 Asset 对象 |
| 1.3 | Presigned Upload（前端直传 S3） | `server/internal/service/asset_service.go` | 生成 Presigned PUT URL，前端直传大文件到 S3，减轻后端压力 |
| 1.4 | FFmpeg Probe 元数据 | `server/internal/ffmpeg/probe.go`, `server/internal/ffmpeg/executor.go` | 上传后异步调用 ffprobe 提取：时长、分辨率、帧率、编码格式 |
| 1.5 | 缩略图生成 | `server/internal/ffmpeg/thumbnail.go` | 上传后异步调用 FFmpeg 抽取关键帧缩略图，上传到 S3 |
| 1.6 | 前端素材上传组件 | `web/src/components/editor/Assets/UploadZone/`, `web/src/services/assetService.ts`, `web/src/hooks/useAssets.ts` | 拖拽/点击上传，进度条（Semi `Progress`），Presigned URL 直传 |
| 1.7 | VideoPlayer 组件 | `web/src/components/editor/VideoPlayer/`, `web/src/hooks/useVideoPlayer.ts` | HTML5 `<video>` 封装，Play/Pause/Seek/时间显示，与 Timeline 同步 |
| 1.8 | Timeline - 片段渲染 | `web/src/components/editor/Timeline/Clip/`, `web/src/stores/timelineStore.ts` | 片段可选中、拖动，显示缩略图和文件名 |
| 1.9 | Timeline - 播放头 | `web/src/components/editor/Timeline/Playhead/` | 与 VideoPlayer 时间同步，可拖动跳转 |
| 1.10 | Timeline - 时间刻度尺 | `web/src/components/editor/Timeline/Ruler/` | 自适应缩放，显示秒/帧刻度 |
| 1.11 | TimelineStore 状态管理 | `web/src/stores/timelineStore.ts` | Zustand：clips/tracks/selection/playState/currentTime/zoom |
| 1.12 | 操作：Select | `web/src/components/editor/Timeline/Clip/` | 点击选中 clip，高亮，右侧 Inspector 显示属性 |
| 1.13 | 操作：Trim | `web/src/components/editor/Timeline/Clip/` | 拖动 clip 左/右边缘调整起止时间 |
| 1.14 | 操作：Delete | `web/src/components/editor/Timeline/Clip/` | 选中后 Delete 键或右键菜单删除 |
| 1.15 | 操作：Reorder | `web/src/components/editor/Timeline/Clip/` | 拖拽调整 clip 顺序 |
| 1.16 | 操作：Split | `web/src/components/editor/Timeline/Clip/` | 在播放头位置分割 clip |
| 1.17 | Inspector 面板 | `web/src/components/editor/Inspector/` | Semi `Form`，显示选中 clip 属性（名称、起止时间、速度、音量） |
| 1.18 | VideoPlayer ↔ Timeline 联动 | `web/src/hooks/useVideoPlayer.ts`, `web/src/hooks/useTimeline.ts` | 播放时播放头移动，拖动播放头时视频跳转 |
| 1.19 | 项目持久化 API | `server/internal/handler/project_handler.go`, `server/internal/service/project_service.go` | 项目 CRUD + Timeline JSON 保存/读取 |

#### 验收标准

- [ ] 上传真实视频文件到 S3，Assets 面板展示（含缩略图）
- [ ] ffprobe 自动提取元数据并存入数据库
- [ ] 将素材拖入 Timeline 创建 clip
- [ ] Play/Pause 正常播放，播放头与视频同步
- [ ] Trim、Delete、Reorder、Split 操作正常
- [ ] Inspector 正确显示选中 clip 属性
- [ ] 项目保存到数据库，刷新后可恢复
- [ ] 不依赖任何 AI 能力

---

### Phase 2：AI Generate（一句话生成第一版）

**目标**：用户输入自然语言需求，AI 自动生成第一版时间线。

**预计工期**：7–10 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 2.1 | JWT 鉴权系统 | `server/internal/pkg/jwt/`, `server/internal/middleware/auth.go`, `server/internal/handler/auth_handler.go` | 用户注册/登录，JWT 签发，Gin 中间件校验 |
| 2.2 | 用户模型与 API | `server/internal/model/user.go`, `server/internal/repository/user_repo.go`, `server/internal/service/auth_service.go` | GORM 用户表，密码 bcrypt 加密 |
| 2.3 | LLM 客户端封装 | `server/internal/ai/llm_client.go` | 封装 OpenAI / Claude API 调用，支持流式/非流式，统一接口 |
| 2.4 | AI - Intent Parser | `server/internal/ai/intent_parser.go`, `server/internal/ai/prompt_templates.go` | 将自然语言解析为结构化参数（duration, aspect_ratio, style, pace, focus_areas） |
| 2.5 | AI - Planning Agent | `server/internal/ai/planning_agent.go` | 根据解析参数 + 素材信息，制定剪辑计划 |
| 2.6 | AI - Asset Retriever | `server/internal/ai/asset_retriever.go` | 根据计划检索匹配素材（基于元数据和基本信息） |
| 2.7 | AI - Editing Agent | `server/internal/ai/editing_agent.go` | 生成 Video DSL JSON（完整的 tracks + clips 结构） |
| 2.8 | AI - Timeline Validator | `server/internal/ai/timeline_validator.go` | 校验 DSL 合法性（无重叠、总时长匹配、clip 引用有效） |
| 2.9 | Generate API | `server/internal/handler/generate_handler.go`, `server/internal/service/generate_service.go` | POST `/api/projects/:id/generate`，串联 Agent Pipeline，写入 generations 表和 timelines 表 |
| 2.10 | 生成进度 | `web/src/components/create/AnalyzeProgress/`, `web/src/services/generateService.ts` | 前端轮询生成状态（parsing → planning → generating → completed） |
| 2.11 | DSL → Timeline 渲染 | `web/src/hooks/useTimeline.ts`, `web/src/stores/timelineStore.ts` | 将 Video DSL JSON 加载到 Timeline Store，渲染到 Timeline 组件 |
| 2.12 | AI 主动追问 | `server/internal/ai/intent_parser.go`, `web/src/components/editor/AIChat/` | 需求模糊时返回追问选项（Cinematic / Social / Storytelling） |

#### 验收标准

- [ ] 用户注册/登录流程正常，JWT 鉴权生效
- [ ] 输入 "帮我剪一个 45 秒的旅行 vlog" → 后端 Agent Pipeline 完整执行
- [ ] 返回有效的 Video DSL JSON，写入 timelines 表
- [ ] 前端 Timeline 正确渲染 AI 生成的 clips
- [ ] AI 主动追问在需求模糊时触发
- [ ] DSL 校验不通过时有错误提示

---

### Phase 3：AI Edit（对话式修改）

**目标**：通过自然语言对话持续修改已有视频。

**预计工期**：7–10 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 3.1 | AIChat Store | `web/src/stores/aiChatStore.ts` | 消息列表、加载状态、错误状态 |
| 3.2 | Chat API | `server/internal/handler/chat_handler.go`, `server/internal/service/chat_service.go` | POST `/api/projects/:id/chat`，接收 message + selectedClipId，返回 AI 响应 + operations |
| 3.3 | AI 上下文感知 | `server/internal/ai/editing_agent.go` | 接收当前选中 clip 信息 + 时间线状态，做局部修改 |
| 3.4 | 操作：Replace Clip | `server/internal/ai/editing-agent.go` | AI 返回 replace operation，替换指定 clip |
| 3.5 | 操作：Trim via Chat | `server/internal/ai/editing-agent.go` | "把这段缩短" → trim operation |
| 3.6 | 操作：Delete via Chat | `server/internal/ai/editing-agent.go` | "删掉这段" → delete operation |
| 3.7 | 操作：Reorder via Chat | `server/internal/ai/editing-agent.go` | "把这两段换一下顺序" → reorder operation |
| 3.8 | 操作：Add Caption | `server/internal/ai/editing-agent.go` | "加字幕" → add_caption operation |
| 3.9 | 操作：Change Music | `server/internal/ai/editing-agent.go` | "换个背景音乐" → change_music operation |
| 3.10 | Operations → Timeline 应用 | `web/src/stores/timelineStore.ts` | 将 AI 返回的 operations 数组应用到当前时间线 |
| 3.11 | Edit 记录 | `server/internal/model/edit.go`, `server/internal/repository/edit_repo.go` | 每次 AI 编辑写入 edits 表（message, operation, before_json, after_json） |
| 3.12 | 快捷 AI 操作 | `web/src/components/editor/AIChat/QuickActions/` | Semi `ButtonGroup`：Make shorter / Change style / Add captions / Improve hook / Change music |
| 3.13 | AI 响应展示 | `web/src/components/editor/AIChat/ChatMessage/` | 区分用户消息和 AI 消息，AI 消息显示操作摘要 |

#### 验收标准

- [ ] "把前 5 秒改得更有冲击力" → AI 替换开头 clip 并更新 Timeline
- [ ] "把第二段缩短" → AI 返回 trim 操作并显示时间变化
- [ ] 选中 clip 后说 "把这个换掉" → AI 只修改选中的 clip（上下文感知）
- [ ] 每次编辑都记录到 edits 表
- [ ] 快捷操作按钮可用，预填 prompt 到输入框

---

### Phase 4：真实视频处理

**目标**：接入真实 AI 能力处理视频素材（ASR、场景检测、画面理解），使用 Asynq 异步任务队列。

**预计工期**：7–10 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 4.1 | Asynq 任务队列搭建 | `server/internal/worker/server.go`, `docker-compose.yml` | Redis + Asynq Server 初始化，任务类型注册，Docker Compose 添加 Redis |
| 4.2 | ASR 集成 (Whisper) | `server/internal/ai/asr_client.go`, `server/internal/worker/analyze_worker.go` | Asynq 异步任务调用 Whisper API 生成 transcript |
| 4.3 | 场景检测 | `server/internal/ffmpeg/scene_detect.go` | FFmpeg 场景检测命令，输出场景切换点时间戳 |
| 4.4 | Vision 分析 | `server/internal/ai/vision_client.go`, `server/internal/worker/analyze_worker.go` | GPT-4o Vision 分析视频关键帧（场景类型、人物、情绪） |
| 4.5 | 分析结果存储 | `server/internal/model/asset.go` | 将 transcript、场景分段、Vision 分析结果写入 assets.analysis JSONB 字段 |
| 4.6 | Analyze API | `server/internal/handler/analyze_handler.go`, `server/internal/service/analyze_service.go` | POST `/api/projects/:id/analyze` → 创建 Asynq 任务，GET 轮询进度 |
| 4.7 | 分析进度追踪 | `server/internal/worker/analyze_worker.go` | Asynq 任务更新进度，前端轮询显示 |
| 4.8 | 素材检索增强 | `server/internal/ai/asset_retriever.go` | 基于分析结果（场景/人物/情绪/时间点）进行语义检索 |
| 4.9 | 分析结果 UI | `web/src/components/create/AnalyzeProgress/` | 展示分析结果：strong moments / talking-head / B-roll / duplicate scenes |
| 4.10 | Transcript 面板 | `web/src/components/editor/Inspector/CaptionInspector/` | 查看和编辑自动生成的字幕文本 |

#### 验收标准

- [ ] 上传视频后自动创建 Asynq 分析任务
- [ ] Asynq Worker 执行：FFmpeg 场景检测 + Whisper ASR + Vision 分析
- [ ] 分析结果存入数据库，前端可查看
- [ ] AI Generate 能基于真实素材分析结果做更好的剪辑决策
- [ ] Redis 中可查看 Asynq 任务队列状态

---

### Phase 5：Render（FFmpeg 渲染导出）

**目标**：使用 FFmpeg 将 Timeline 渲染为真实 MP4 视频，通过 WebSocket 推送进度。

**预计工期**：7–10 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 5.1 | Video DSL → FFmpeg 命令 | `server/internal/ffmpeg/render.go` | 将 Video DSL JSON 转换为 FFmpeg 复杂滤镜链（concat + overlay 字幕 + amix 音频） |
| 5.2 | 转码/切片 | `server/internal/ffmpeg/transcode.go` | 统一输入素材格式，按 DSL 要求裁剪片段 |
| 5.3 | 视频拼接 | `server/internal/ffmpeg/concat.go` | FFmpeg concat demuxer 或 concat filter 拼接片段 |
| 5.4 | 字幕叠加 | `server/internal/ffmpeg/render.go` | FFmpeg drawtext/ass 滤镜叠加字幕，支持位置、字体、颜色、动画 |
| 5.5 | 音频混合 | `server/internal/ffmpeg/extract_audio.go`, `server/internal/ffmpeg/render.go` | 背景音乐音量调节 + 原始音频混合 |
| 5.6 | 转场效果 | `server/internal/ffmpeg/render.go` | xfade 滤镜实现片段间转场（淡入淡出、滑动等） |
| 5.7 | Render Worker | `server/internal/worker/render_worker.go` | Asynq 任务类型，执行 FFmpeg 渲染，更新进度 |
| 5.8 | WebSocket Hub | `server/internal/pkg/ws/hub.go`, `server/internal/handler/ws_handler.go` | Gorilla WebSocket，管理客户端连接池，按 projectId 推送进度 |
| 5.9 | Render API | `server/internal/handler/render_handler.go`, `server/internal/service/render_service.go` | POST 启动渲染任务，GET 查询状态 |
| 5.10 | 前端 WebSocket 接入 | `web/src/hooks/useWebSocket.ts`, `web/src/components/editor/Export/ExportDialog/` | 连接 WebSocket，实时显示渲染进度（Semi `Progress`），完成时显示下载链接 |
| 5.11 | 导出设置 | `web/src/components/editor/Export/ExportDialog/` | Semi `Select`（分辨率 1080p/720p）、帧率（24/30/60）、格式（MP4） |
| 5.12 | 渲染结果存储 | `server/internal/ffmpeg/render.go`, `server/internal/pkg/storage/s3.go` | 渲染完成 → 上传 MP4 到 S3 → 记录到 renders 表 |

#### 验收标准

- [ ] Editor 点击 Export → 后端创建 Asynq 渲染任务
- [ ] WebSocket 实时推送渲染进度（0% ~ 100%）
- [ ] FFmpeg 正确拼接视频片段 + 叠加字幕 + 混合音频
- [ ] 渲染完成，MP4 上传到 S3，前端可下载
- [ ] MP4 视频内容与 Editor Timeline 一致

---

### Phase 6：体验优化

**目标**：打磨产品体验，完善边界情况处理。

**预计工期**：7–10 天

#### 任务清单

| # | 任务 | 涉及文件 | 技术要点 |
|---|------|---------|---------|
| 6.1 | Version History | `server/internal/repository/timeline_repo.go`, `web/src/components/editor/` | 基于 timelines 表实现版本列表，Semi `SideSheet` 展示，可切换查看 |
| 6.2 | Undo / Redo | `web/src/hooks/useHistory.ts`, `web/src/stores/timelineStore.ts` | Ctrl+Z / Ctrl+Shift+Z，基于操作栈实现（前端内存，可选持久化到 edits 表） |
| 6.3 | Loading States | 前端全局 | Semi `Spin` + Skeleton 占位，按钮 loading 态 |
| 6.4 | Error States | 前端全局 | Semi `Toast` 网络错误、AI 调用失败、上传失败的友好提示 |
| 6.5 | Empty States | 前端全局 | 无项目、无素材、AI 无响应的引导界面 |
| 6.6 | Keyboard Shortcuts | `web/src/hooks/` | Space=Play/Pause, Delete=删除, Ctrl+Z=Undo, Ctrl+S=Save |
| 6.7 | Toast 通知 | 前端全局 | Semi `Toast` 操作成功/失败的即时反馈 |
| 6.8 | 响应式优化 | 前端全局 | 最小支持 1280px 宽度，< 1280px 显示提示 |
| 6.9 | 性能优化 | 前端全局 | 大量 clips 时的 Timeline 虚拟滚动，视频懒加载 |
| 6.10 | Landing Page | `web/src/pages/Home/` | 产品介绍、功能亮点、CTA（可选） |

#### 验收标准

- [ ] Undo/Redo 在所有编辑操作后可用
- [ ] Version History 显示所有 AI 编辑版本
- [ ] 所有 Loading/Error/Empty 状态有友好 UI
- [ ] 键盘快捷键正常工作
- [ ] 100+ clips 时 Timeline 不卡顿

---

## 6. 核心组件功能规格

### 6.1 VideoPlayer

| 功能 | 说明 |
|------|------|
| Play / Pause | 点击播放器或按空格键切换 |
| Seek | 拖动进度条或点击跳转 |
| 时间显示 | 当前时间 / 总时长 |
| 与 Timeline 同步 | 播放时播放头跟随，拖动播放头时视频跳转 |
| 音量控制 | 静音/音量滑块 |

**使用的 Semi 组件**：`Button`（播放/暂停）、`Slider`（进度条/音量）

### 6.2 Timeline

| 功能 | 说明 |
|------|------|
| 多轨道显示 | Video Track + Caption Track + Audio Track |
| Clip 渲染 | 缩略图 + 文件名 + 时长 |
| Playhead | 可拖动的播放头指示器 |
| 时间刻度尺 | 自适应缩放 |
| Clip 操作 | Select、Trim（拖拽边缘）、Delete、Reorder（拖拽）、Split |

**自定义组件**（不依赖 Semi，用 CSS Modules 精细控制）

### 6.3 AIChat

| 功能 | 说明 |
|------|------|
| 消息列表 | 用户消息 + AI 响应 |
| Prompt 输入框 | 多行文本输入，Enter 发送 |
| 快捷操作 | Make shorter / Change style / Add captions / Improve hook / Change music |
| 上下文感知 | 自动传入当前选中的 clipId |
| 操作反馈 | AI 消息中显示具体操作摘要 |

**使用的 Semi 组件**：`Input`、`List`、`Button`、`Avatar`、`Spin`

### 6.4 AssetPanel

| 功能 | 说明 |
|------|------|
| 分类标签 | Clips / Audio / Images 切换 |
| 素材卡片 | 缩略图 + 文件名 + 时长 |
| 拖拽上传 | 支持 MP4/MOV/JPG/PNG |
| 拖入 Timeline | 从 Asset 拖入 Timeline 创建 clip |
| 删除素材 | 右键或按钮删除 |

**使用的 Semi 组件**：`Tabs`、`Card`、`Upload`、`Progress`、`Dropdown`

### 6.5 Inspector

| 功能 | 说明 |
|------|------|
| Clip 属性 | 名称、起止时间、速度、音量 |
| Caption 属性 | 文本内容、字体、大小、位置、颜色 |
| 实时预览 | 修改属性时 Preview 实时更新 |

**使用的 Semi 组件**：`Form`、`InputNumber`、`Slider`、`Select`、`ColorPicker`

---

## 7. API 接口设计

### 7.1 认证

```
POST   /api/auth/register       → { token, user }
POST   /api/auth/login          → { token, user }
GET    /api/auth/me             → { user }          (需鉴权)
```

**POST /api/auth/register Body:**
```json
{ "email": "user@example.com", "password": "xxx", "name": "CutPilot User" }
```

### 7.2 Projects

```
GET    /api/projects             → { projects: Project[] }
POST   /api/projects             → { project: Project }
GET    /api/projects/:id         → { project: Project }
PUT    /api/projects/:id         → { project: Project }
DELETE /api/projects/:id         → { success: true }
```

**POST /api/projects Body:**
```json
{ "name": "NYC Travel Vlog" }
```

### 7.3 Assets

```
POST   /api/projects/:id/assets/presign   → { uploadUrl, assetId }  (生成预签名 URL)
POST   /api/projects/:id/assets/confirm   → { asset }               (确认上传完成)
GET    /api/projects/:id/assets           → { assets: Asset[] }
DELETE /api/assets/:id                    → { success: true }
```

**POST /api/projects/:id/assets/presign Body:**
```json
{ "fileName": "travel_clip.mp4", "fileSize": 52428800, "type": "video" }
```

**POST /api/projects/:id/assets/confirm Body:**
```json
{ "assetId": "xxx", "storagePath": "projects/xxx/travel_clip.mp4" }
```

### 7.4 Analyze

```
POST   /api/projects/:id/analyze   → { analysisId, status }
GET    /api/projects/:id/analysis   → { status, progress, results }
```

**POST /api/projects/:id/analyze Body:**
```json
{ "assetIds": ["asset_01", "asset_02", "..."] }
```

**GET Response (completed):**
```json
{
  "status": "completed",
  "results": {
    "clipsAnalyzed": 24,
    "speakersDetected": 18,
    "transcriptGenerated": true,
    "scenesIdentified": true,
    "bestMomentsFound": true,
    "summary": {
      "strongMoments": 8,
      "talkingHead": 5,
      "bRoll": 12,
      "duplicates": 3
    }
  }
}
```

### 7.5 Generate

```
POST   /api/projects/:id/generate   → { generationId, status }
GET    /api/generations/:id        → { status, timeline }
```

**POST /api/projects/:id/generate Body:**
```json
{ "prompt": "Create a 45-second energetic NYC travel vlog" }
```

**GET Response (completed):**
```json
{
  "status": "completed",
  "timeline": { "duration": 45, "fps": 30, "width": 1080, "height": 1920, "tracks": [...] }
}
```

### 7.6 AI Chat

```
POST   /api/projects/:id/chat      → { message, operations, timeline }
```

**Request:**
```json
{ "message": "Make the first five seconds more energetic", "selectedClipId": null }
```

**Response:**
```json
{
  "message": "I replaced the opening with a faster sequence. Shortened from 12.4s to 7.8s. Removed: 00:21 'Basically...', 00:23 'I think...'",
  "operations": [
    { "type": "replace_clip", "target": "clip_01", "source": "clip_08" },
    { "type": "trim", "clipId": "clip_02", "start": 0, "end": 7.8 }
  ],
  "timeline": { /* Updated Video DSL JSON */ }
}
```

### 7.7 Render

```
POST   /api/projects/:id/render     → { renderId, status }
GET    /api/renders/:id             → { status, progress, downloadUrl }
```

**POST /api/projects/:id/render Body:**
```json
{ "format": "mp4", "resolution": "1080x1920", "fps": 30 }
```

**WebSocket 进度推送（`/ws/render/:renderId`）:**
```json
{ "type": "progress", "data": { "percent": 45, "stage": "concatenating clips" } }
{ "type": "completed", "data": { "downloadUrl": "https://s3.../render/xxx.mp4", "fileSize": 15728640 } }
{ "type": "error", "data": { "message": "FFmpeg error: ..." } }
```

### 7.8 WebSocket

```
GET    /ws/render/:projectId        → WebSocket 连接（渲染进度推送）
```

---

## 8. 数据库 Schema（GORM 模型 + SQL）

### 8.1 SQL DDL

```sql
-- 用户表
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  avatar        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 项目表
CREATE TABLE projects (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  duration      INTEGER,
  aspect_ratio  TEXT DEFAULT '9:16',
  style         TEXT DEFAULT 'cinematic',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 素材表
CREATE TABLE assets (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  duration        FLOAT,
  width           INTEGER,
  height          INTEGER,
  thumbnail_url   TEXT,
  fps             FLOAT,
  codec           TEXT,
  transcript      JSONB,
  metadata        JSONB,
  analysis        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 时间线版本表
CREATE TABLE timelines (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  timeline_json   JSONB NOT NULL,
  label           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 生成记录表
CREATE TABLE generations (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  result          JSONB,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 编辑操作记录表
CREATE TABLE edits (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  operation       JSONB NOT NULL,
  before_json     JSONB,
  after_json      JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 渲染记录表
CREATE TABLE renders (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format          TEXT NOT NULL DEFAULT 'mp4',
  resolution      TEXT NOT NULL DEFAULT '1080x1920',
  fps             INTEGER NOT NULL DEFAULT 30,
  status          TEXT NOT NULL DEFAULT 'pending',
  progress        INTEGER DEFAULT 0,
  download_url    TEXT,
  file_size       BIGINT,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- Asynq 任务结果（可选，用于追踪异步任务状态）
CREATE TABLE task_results (
  id              BIGSERIAL PRIMARY KEY,
  task_type       TEXT NOT NULL,
  task_id         TEXT NOT NULL UNIQUE,
  project_id      BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  progress        INTEGER DEFAULT 0,
  result          JSONB,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_timelines_project ON timelines(project_id);
CREATE INDEX idx_timelines_project_version ON timelines(project_id, version DESC);
CREATE INDEX idx_generations_project ON generations(project_id);
CREATE INDEX idx_edits_project ON edits(project_id);
CREATE INDEX idx_edits_project_created ON edits(project_id, created_at DESC);
CREATE INDEX idx_renders_project ON renders(project_id);
CREATE INDEX idx_task_results_task_id ON task_results(task_id);
CREATE INDEX idx_task_results_project ON task_results(project_id);
```

### 8.2 GORM 模型（Go struct）

```go
// server/internal/model/user.go
type User struct {
    ID           uint      `gorm:"primaryKey" json:"id"`
    Email        string    `gorm:"uniqueIndex;not null" json:"email"`
    PasswordHash string    `gorm:"not null" json:"-"`
    Name         string    `json:"name"`
    Avatar       string    `json:"avatar"`
    CreatedAt    time.Time `json:"createdAt"`
    UpdatedAt    time.Time `json:"updatedAt"`
}

// server/internal/model/project.go
type Project struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    UserID      uint      `gorm:"not null;index" json:"userId"`
    Name        string    `gorm:"not null" json:"name"`
    Status      string    `gorm:"default:'draft'" json:"status"`
    Duration    int       `json:"duration"`
    AspectRatio string    `gorm:"default:'9:16'" json:"aspectRatio"`
    Style       string    `gorm:"default:'cinematic'" json:"style"`
    User        User      `gorm:"foreignKey:UserID" json:"-"`
    Assets      []Asset   `json:"-"`
    Timelines   []Timeline `json:"-"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

// server/internal/model/asset.go
type Asset struct {
    ID            uint           `gorm:"primaryKey" json:"id"`
    ProjectID     uint           `gorm:"not null;index" json:"projectId"`
    Type          string         `gorm:"not null" json:"type"` // video | audio | image
    StoragePath   string         `gorm:"not null" json:"storagePath"`
    FileName      string         `gorm:"not null" json:"fileName"`
    FileSize      int64          `json:"fileSize"`
    Duration      float64        `json:"duration"`
    Width         int            `json:"width"`
    Height        int            `json:"height"`
    ThumbnailURL  string         `json:"thumbnailUrl"`
    FPS           float64        `json:"fps"`
    Codec         string         `json:"codec"`
    Transcript    datatypes.JSON `gorm:"type:jsonb" json:"transcript"`
    Metadata      datatypes.JSON `gorm:"type:jsonb" json:"metadata"`
    Analysis      datatypes.JSON `gorm:"type:jsonb" json:"analysis"`
    CreatedAt     time.Time      `json:"createdAt"`
}
```

---

## 9. AI Agent Pipeline

### 9.1 架构

```
User Request (自然语言)
       │
       ▼
┌─────────────────┐
│  Intent Parser   │  LLM 解析用户意图
│  - duration      │  → 结构化参数
│  - style         │
│  - pace          │
│  - focus_areas   │
│  - music_mood    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Planning Agent  │  LLM 制定剪辑计划
│  - 素材选择      │  → 哪些素材、什么顺序
│  - 结构规划      │
│  - 节奏设计      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Asset Retriever  │  检索匹配素材
│  - 语义匹配      │  → 基于 analysis 语义检索
│  - 时长筛选      │
│  - 质量过滤      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Editing Agent   │  生成 Video DSL
│  - track 排布    │  → 完整的 JSON 时间线
│  - clip 裁剪     │
│  - 字幕生成      │
│  - 音乐匹配      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Timeline Validator│  校验 DSL
│  - 无重叠检查    │  → 合法性验证
│  - 时长匹配      │
│  - 引用完整性    │
└────────┬────────┘
         │
         ▼
   Video DSL JSON
         │
         ▼
┌─────────────────┐
│   FFmpeg        │  渲染引擎
│  - 切片/拼接     │  → 预览 / 导出
│  - 字幕叠加     │
│  - 音频混合      │
│  - 转场效果      │
└─────────────────┘
```

### 9.2 Prompt 模板设计

**Intent Parser:**
```
你是一个视频剪辑意图解析器。用户会描述他们想要的视频，你需要提取以下结构化参数：
- duration: 目标时长（秒）
- aspect_ratio: 画面比例（9:16 竖屏 / 16:9 横屏 / 1:1 方形）
- style: 风格（cinematic 电影感 / energetic 活力 / minimal 极简 / storytelling 叙事）
- pace: 节奏（fast 快 / medium 中 / slow 慢）
- focus_areas: 重点内容（用户特别提到要突出的部分）
- music_mood: 音乐氛围
- subtitle_style: 字幕风格

如果用户没有明确提到某项，设为 null。
输出 JSON 格式。
```

**Planning Agent:**
```
你是一个视频剪辑规划师。给定以下信息：
- 用户需求：{intent}
- 可用素材：{assets_with_analysis}

请制定剪辑计划：
1. 选择哪些素材
2. 按什么顺序排列
3. 每段素材使用多长时间
4. 需要添加什么字幕
5. 需要什么背景音乐氛围

注意：
- 视频开头 3 秒必须有吸引力（hook）
- 总时长必须匹配目标 duration
- 优先使用分析中标记为 strong moments 的素材
```

### 9.3 AI 能力分层

| 优先级 | 能力 | 阶段 |
|--------|------|------|
| **P0** | 自动选素材、自动排序、自动剪切、自动生成 Timeline、ASR 字幕、对话修改 | Phase 2–3 |
| **P1** | 智能重构、多个版本、风格转换、平台适配 | Phase 4–5 |
| **P2** | AI Voiceover、AI Avatar、Text-to-Video、AI Music、多人协作 | 后续迭代 |

---

## 10. Video DSL 与编辑操作

### 10.1 Video DSL 定义

```typescript
// web/src/types/timeline.ts

interface VideoDSL {
  version: string;
  duration: number;        // 总时长(秒)
  fps: number;
  width: number;
  height: number;
  tracks: Track[];
}

interface Track {
  id: string;
  type: 'video' | 'caption' | 'audio' | 'effect';
  clips: Clip[];
}

interface Clip {
  id: string;
  assetId?: string;        // 引用 assets 表
  start: number;           // 在时间线上的起始时间
  duration: number;        // 在时间线上的持续时间
  sourceStart?: number;    // 原始素材中的起始偏移
  sourceDuration?: number; // 使用原始素材的时长
  speed?: number;          // 播放速度 (1 = 正常)
  volume?: number;         // 音量 (0-1)
  // Caption 特有
  text?: string;
  style?: CaptionStyle;
  // Effect 特有
  effectType?: string;
  params?: Record<string, unknown>;
}

interface CaptionStyle {
  font: string;
  size: number;
  color: string;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'fadeIn' | 'typewriter' | 'pop';
}
```

```go
// server/internal/dto/timeline.go

type VideoDSL struct {
    Version  string  `json:"version"`
    Duration float64 `json:"duration"`
    FPS      int     `json:"fps"`
    Width    int     `json:"width"`
    Height   int     `json:"height"`
    Tracks   []Track `json:"tracks"`
}

type Track struct {
    ID    string `json:"id"`
    Type  string `json:"type"`  // video | caption | audio | effect
    Clips []Clip `json:"clips"`
}

type Clip struct {
    ID             string            `json:"id"`
    AssetID        *string           `json:"assetId,omitempty"`
    Start          float64           `json:"start"`
    Duration       float64           `json:"duration"`
    SourceStart    *float64          `json:"sourceStart,omitempty"`
    SourceDuration *float64          `json:"sourceDuration,omitempty"`
    Speed          *float64          `json:"speed,omitempty"`
    Volume         *float64          `json:"volume,omitempty"`
    Text           *string           `json:"text,omitempty"`
    Style          *CaptionStyle     `json:"style,omitempty"`
    EffectType     *string           `json:"effectType,omitempty"`
    Params         map[string]any    `json:"params,omitempty"`
}
```

### 10.2 Editing Operations

```typescript
// web/src/types/timeline.ts

type EditingOperation =
  | { operation: 'trim'; clipId: string; start: number; end: number }
  | { operation: 'replace'; clipId: string; assetId: string }
  | { operation: 'delete'; clipId: string }
  | { operation: 'reorder'; clipIds: string[] }
  | { operation: 'split'; clipId: string; splitPoint: number }
  | { operation: 'add_clip'; trackId: string; assetId: string; start: number; duration: number }
  | { operation: 'add_caption'; text: string; start: number; end: number; style?: CaptionStyle }
  | { operation: 'change_music'; assetId: string }
  | { operation: 'change_speed'; clipId: string; speed: number }
  | { operation: 'change_volume'; clipId: string; volume: number }
  | { operation: 'batch'; operations: EditingOperation[] };
```

```go
// server/internal/dto/editing_ops.go

type EditingOperation struct {
    Operation string         `json:"operation"`
    ClipID    string         `json:"clipId,omitempty"`
    AssetID   string         `json:"assetId,omitempty"`
    TrackID   string         `json:"trackId,omitempty"`
    Start     *float64      `json:"start,omitempty"`
    End       *float64      `json:"end,omitempty"`
    Duration  *float64      `json:"duration,omitempty"`
    Speed     *float64      `json:"speed,omitempty"`
    Volume    *float64      `json:"volume,omitempty"`
    Text      *string        `json:"text,omitempty"`
    ClipIDs   []string      `json:"clipIds,omitempty"`
    Style     *CaptionStyle `json:"style,omitempty"`
    SplitPoint *float64     `json:"splitPoint,omitempty"`
    Operations []EditingOperation `json:"operations,omitempty"` // batch
}
```

---

## 11. 里程碑与排期

```
Week  1-2  ████░░░░░░░░░░░░░  Phase 0: 产品骨架 (Mock)
Week  3-4  ████████░░░░░░░░░  Phase 1: Editor 基础编辑
Week  5-6  ████████████░░░░░  Phase 2: AI Generate
Week  7-8  ████████████████░░  Phase 3: AI Edit
Week  9-10 ██████████████████  Phase 4: 真实视频处理
Week 11-12 ██████████████████  Phase 5: Render
Week 13-14 ██████████████████  Phase 6: 体验优化
```

### 依赖关系

```
Phase 0 (骨架)
    │
    ├──→ Phase 1 (Editor)    ← 不依赖 AI，可并行开发后端 S3/FFmpeg
    │         │
    │         └──→ Phase 5 (Render) ← 依赖 Editor DSL + Asynq + FFmpeg
    │
    └──→ Phase 2 (AI Generate)
              │
              └──→ Phase 3 (AI Edit) ← 依赖 Phase 2 的 Agent 架构
                        │
                        └──→ Phase 4 (真实视频处理) ← 依赖 Asynq + FFmpeg
                                  │
                                  └──→ Phase 6 (体验优化) ← 依赖所有 Phase
```

### 关键里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| **M1: 页面流程跑通** | Week 2 | 完整 Mock 流程：Home → Upload → Analyze → Describe → Editor |
| **M2: 可手动编辑** | Week 4 | 真实视频上传至 S3、Timeline 编辑、Inspector 属性调整 |
| **M3: AI 第一次生成** | Week 6 | 一句话自然语言 → Go 后端 Agent Pipeline → 前端 Timeline 渲染 |
| **M4: 对话式修改** | Week 8 | AI Chat 可持续修改视频，上下文感知编辑 |
| **M5: 真实素材分析** | Week 10 | Asynq + FFmpeg + Whisper + Vision 全部接入 |
| **M6: 首个可导出视频** | Week 12 | FFmpeg 渲染出真实 MP4，WebSocket 推送进度 |
| **M7: 产品级体验** | Week 14 | Undo/Redo、Version History、完整错误处理 |

---

## 12. MVP 明确不做（第一版排除）

| 功能 | 原因 |
|------|------|
| Keyframe 动画 | 复杂度过高，MVP 不需要 |
| Mask 遮罩 | 专业功能，后续迭代 |
| Blend Mode 混合模式 | 非核心需求 |
| Curve Editor 曲线编辑 | 专业调色工具，后续 |
| 高级音频多轨 | MVP 只需单轨背景音乐 |
| LUT / 专业调色 | P2 优先级 |
| AI Avatar | P2 优先级 |
| Text-to-Video | P2 优先级 |
| 多人协作 | 架构复杂度太高 |
| 复杂模板市场 | MVP 阶段专注 AI 编辑 |
| 移动端适配 | 先专注桌面端 |

---

## 13. 环境变量

### 前端 (.env)

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_BASE_URL=ws://localhost:8080/ws
```

### 后端 (config/dev.yaml)

```yaml
server:
  port: 8080
  mode: debug  # debug | release

database:
  host: localhost
  port: 5432
  user: weaveclip
  password: weaveclip_dev
  dbname: weaveclip
  sslmode: disable

redis:
  addr: localhost:6379
  db: 0
  password: ""

storage:
  provider: minio  # minio | aliyun_oss | aws_s3
  endpoint: localhost:9000
  access_key: minioadmin
  secret_key: minioadmin
  bucket: weaveclip
  region: ""

jwt:
  secret: your_jwt_secret_key
  expiry: 72h

ai:
  openai_api_key: your_openai_api_key
  anthropic_api_key: your_anthropic_api_key  # 可选

ffmpeg:
  binary_path: ffmpeg  # 或绝对路径
  ffprobe_path: ffprobe
```

### Docker Compose

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: weaveclip
      POSTGRES_PASSWORD: weaveclip_dev
      POSTGRES_DB: weaveclip
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

---

## 附录：Demo 核心路径

面试/展示时应重点演示的完整闭环：

```
首页
  ↓ 点击 "New Video"
上传素材（拖入 10+ 视频/图片） → S3 存储
  ↓ 自动分析（Asynq 异步 + FFmpeg + Whisper + Vision）
查看分析结果（scenes detected, best moments）
  ↓ "Describe what you want"
输入: "45s NYC travel vlog, energetic, Times Square & Central Park"
  ↓ 点击 Generate
Go 后端 Agent Pipeline → Video DSL JSON
  ↓ 在 Editor 预览
"前 3 秒改成更有冲击力的镜头" (AI Chat)
  ↓ AI 替换开头
选中某个 clip → "把这个镜头换成日落" (上下文编辑)
  ↓ AI 局部修改
Ctrl+Z (Undo)
  ↓ 回退操作
查看 Version History
  ↓ 点击 Export
选择 1080x1920 / 30fps / MP4
  ↓ Asynq 渲染任务 + WebSocket 推送进度
下载 MP4（S3）
```

> 要证明的不是"AI 会剪视频"，而是：你能把一个复杂的专业工作流重新设计成一个普通用户能通过自然语言完成的 AI Native 产品。
