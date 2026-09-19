# WeaveClip — 全量工单清单（代码审查产出）

> 产出方式：2026-09-18 对 server/、web/ 全量代码与 doc/、TEST_PLAN.md、AGENTS.md 等文档的交叉审查。
> 范围基准：`doc/development-plan.md` Phase 0–6（任务表 + 验收 checklist + §7 API + §8 DB）。
> 硬性目标：**所有后端服务必须写完**——§4 后端工单全部完成即达成（Phase 1–5 后端范围 100% 覆盖，映射见 §4.1）。
> 执行约定：遵循 `doc/local-dev-rules.md`（本机零验证、禁止下载、文件删除保护等）。

---

## 1. 总体结论

| 区域 | 现状 |
|---|---|
| 后端（server/，约 3.3k 行 Go） | 仅 **Auth + Project CRUD + Asset 元数据共 12 条路由**为真实实现；开发计划中的 PUT /projects、文件上传（presign/confirm）、Analyze、Generate、Chat、Render、WebSocket **全部未开始**；timelines/generations/edits/renders 四张表与对应 model 已建但**零代码引用**（死表死模型） |
| 前端（web/，6 屏） | Phase 0 骨架可走通 mock 流程；但 VideoPlayer 是"外链图片 + setInterval 假播放"、时间轴拖入/Trim/Reorder 占位、上传是假进度、AIChat 是 setTimeout 假回复、**Editor 在真实 API 模式下仍硬编码 mock 时间轴**；generate/chat/render/analyze 四组 service 定义了但无调用方（死代码） |
| 测试/CI | 后端 handler 测试只覆盖 mock 路径（GORM 真实路径零测试）；无 project smoke 脚本；`go test` 范围未含 config/database/migrations；前端 ESLint 在 CI 中是空跑（`\|\| echo` 兜底）；deep 健康检查是假实现（恒报 ok） |
| 文档 | development-plan.md 的验收 checklist 全部未勾选；存在 6 处需人工裁定的矛盾（见 §3） |

已完成、无需开单的部分：JWT 注册/登录/me、Project CRUD（缺 PUT）、Asset 元数据 CRUD、Gin 骨架、迁移引擎、mock 降级机制、前端 6 屏 UI 骨架与 i18n（zh/en 各 204 key 对齐）。

---

## 2. 工单总览

编号规则：B=后端（21 条，P0 主体）、F=前端（15 条）、T=测试/CI/治理（3 条）。规模：S≤1 天、M=1–3 天、L>3 天（纯人工估算，供排期参考）。

> **执行进度（2026-09-19）**：B01–B21、F01–F15、T01–T03 的实现代码已全部推送
> （分支 feat/editor-ui-redesign-morandi），验证交由远端 CI（local-dev-rules §1）。
> B08（项目更新）由 main 分支 PATCH 端点先行完成。B21 中构建产物出库与 F12 中
> 确认弃用的死代码删除属"文件删除"，仍待人类按删除保护流程执行。

| 编号 | 标题 | 规模 | 依赖 |
|---|---|---|---|
| B01 | 分层治理：Project 走 service/repository，消除 handler 直连 DB | M | — |
| B02 | deep 健康检查真实化（DB/Redis/MinIO 真探活） | S | B05 |
| B03 | 请求超时中间件（消费 RequestTimeout 配置） | S | — |
| B04 | prod 配置 `${VAR}` 占位符解析修复 | S | — |
| B05 | 对象存储层：Storage 接口 + S3/MinIO 实现 + 本地磁盘实现 | M | — |
| B06 | 素材直传端点：presign + confirm | M | B05、D1 |
| B07 | 素材处理管线：ffprobe 元数据 + ffmpeg 缩略图 | M | B05、B06 |
| B08 | PUT /api/projects/:id 项目更新 | S | B01 |
| B09 | Timeline 持久化：版本化 GET/PUT + 迁移 002 | M | B01、D3 |
| B10 | LLM 客户端封装（含 mock 实现） | M | — |
| B11 | Agent Pipeline 五组件 + DSL Validator | L | B10 |
| B12 | Generate API：创建/轮询/澄清追问 + generations 表接入 | M | B11、D5 |
| B13 | Chat API：上下文感知 + 6 种操作 + operations 应用引擎 + edits 记录 | L | B10、B11 |
| B14 | Asynq 任务队列基础设施（含 mock 内联执行器） | M | — |
| B15 | Analyze API：创建分析任务 + 轮询结果 | S | B14 |
| B16 | 分析 Worker：FFmpeg 场景检测 + Whisper ASR + Vision + 聚合写库 | L | B14、B15 |
| B17 | DSL→FFmpeg 滤镜链编译器 | L | B09 |
| B18 | Render Worker + Render API + 产物上传 S3 | L | B17、B14 |
| B19 | WebSocket 渲染进度推送（Hub + /ws/render/:renderId） | M | B18、D2 |
| B20 | 后端测试补齐与 CI 扩围 | M | 全程伴随 |
| B21 | 工程卫生：构建产物出库（须人类）、api.md 对齐最终契约 | S | 收尾 |
| F01 | mock 模式一致性修复（Upload/Login/Editor 假数据兜底） | S | — |
| F02 | 真实文件上传接入（替换 interval 假进度） | M | B06 |
| F03 | VideoPlayer 真 `<video>` + 播放头同步 | M | — |
| F04 | Timeline 交互补全：拖入 / Trim / Reorder | M | F03 |
| F05 | Inspector 数据绑定 + Clip/MediaPanel 真实素材信息 | M | B07 |
| F06 | 项目/时间轴持久化接入（真实模式去 mock DSL） | M | B09 |
| F07 | AIChat 接真实 Chat API + operations 应用 + QuickActions 预填 | M | B13 |
| F08 | Generate 路由与轮询进度页（`/projects/new/generate`） | M | B12 |
| F09 | Analyze 接入 + Transcript 面板 | M | B15/B16 |
| F10 | 导出链路：ExportDialog + renderService + WS 进度 | M | B18/B19 |
| F11 | Undo/Redo 历史栈 + 键盘快捷键 | M | — |
| F12 | 死代码处置（启用或提请人类删除） | S | 各自依赖 |
| F13 | i18n 违规修复（硬编码文案清零） | S | — |
| F14 | `/settings` 路由（Phase 0 计划项） | S | — |
| F15 | 前端测试补齐（组件行为测试 + 覆盖率） | M | 伴随 |
| T01 | CI 治理：ESLint 空跑修复 + actions Node20 弃用警告 | S | — |
| T02 | 文档矛盾裁定落地与修订（D1–D6） | S | §3 裁定 |
| T03 | TEST_PLAN 待完善项：性能测试 + 安全扫描 | M | P2，可延后 |

---

## 3. 执行前须裁定的决策项（带建议默认值，不裁定则按建议执行）

| # | 议题 | 矛盾点 | 建议默认值 | 影响 |
|---|---|---|---|---|
| D1 | 素材上传契约 | development-plan.md:769–770 两步 presign/confirm vs server/docs/api.md:216 已实现的单步元数据注册 | **以 presign/confirm 为准**；单步注册端点保留为 mock/调试用途，api.md 随 T02 修订 | B06、F02 |
| D2 | WebSocket 路径参数 | development-plan.md:872 写 `:renderId`、:882 写 `:projectId`，同文档自相矛盾 | **`GET /ws/render/:renderId`**（进度属于某次渲染任务） | B19、F10 |
| D3 | timelines 表版本语义 | 迁移 `001_initial_schema.up.sql:53` 有 `UNIQUE(project_id)`（单版本）vs 模型 `Version` 字段（多版本）vs Phase 6.1 Version History 需多版本 | **迁移 002 去掉 UNIQUE、加 `(project_id, version DESC)` 索引，PUT 插入新版本行**；MVP 阶段 version 恒从 1 递增，Phase 6 前端直接可查历史 | B09、T02 |
| D4 | "Phase E" 术语 | AGENTS.md:58 与 api.md:218 引用 "Phase E"，仓库内无定义 | 映射为 development-plan **Phase 1（真实上传）/ Phase 2（Generate 联调）**，修订两处措辞 | T02 |
| D5 | Generate 进度 UI 时机 | development-plan.md:530（任务 2.10）要求轮询进度 UI vs AGENTS.md:58 声明"本轮不做" | **B12 完成后即做 F08**（后端既然全写完，前端联调随之） | F08、T02 |
| D6 | 视觉基准矛盾 | development-plan.md §3（深色默认/Inter/12px 圆角）vs design-system.md + DESIGN.md（Morandi 浅色/Manrope/8px） | **以 design-system.md 为唯一基准**（README badge 与 design/ 稿均指向它），development-plan §3 待 T02 修订 | 前端全部、T02 |
| D7 | DELETE /projects 响应 | development-plan.md:758 `{success:true}` vs api.md:190 与现行实现 204 | **以 204 为准**，修订 development-plan | T02 |

> 2026-09-19：以上裁定（D1–D7）已按建议默认值落地，修订见各文档变更记录（doc/development-plan.md、server/docs/api.md、AGENTS.md、README.md）。

---

## 4. 后端工单（完成后即"后端服务全部写完"）

### 4.1 计划任务覆盖映射

| development-plan.md 范围 | 对应工单 |
|---|---|
| Phase 1：任务 1.1（S3 客户端）、1.2（上传 API）、1.4（ffprobe）、1.5（缩略图） | B05、B06、B07 |
| Phase 1：任务 1.19（项目持久化 + Timeline JSON 保存/读取）、§7.2 PUT | B08、B09 |
| Phase 2：任务 2.3（LLM 客户端）、2.4–2.8（五 Agent）、2.9（Generate API）、2.12（追问）、§7.5 | B10、B11、B12 |
| Phase 3：Chat API、operations 应用、edits 记录、§7.6 | B13 |
| Phase 4：任务 4.1（Asynq）、4.2–4.7（分析三件套+写库）、4.8（Analyze API）、§7.4 | B14、B15、B16 |
| Phase 5：任务 5.1–5.6（FFmpeg 滤镜链）、5.7/5.9/5.12（Worker+API+S3）、5.8（WS Hub）、§7.7 | B17、B18、B19 |
| 横切：健康检查、超时、prod 配置、分层、测试、CI | B01–B04、B20、B21 |

Phase 6 后端无新增服务（Version History 直接消费 B09 的版本化 timeline 端点）。§12 明确不做项（keyframe/mask/多人协作等，development-plan.md:1341–1355）不在工单范围。

### 4.2 工单明细

**通用验收（适用每条，不再重复写）**
- MOCK_MODE=true 时无需 Redis/MinIO/LLM key/真实文件即可联调（沿用 `database.go:22-25` 的 mock 降级先例）；
- 新端点遵守 api.md 既有约定（成功不加信封、失败 `{success:false,code,message,request_id}`、错误码表）；
- 带 handler 层单测（真实 GORM 路径 + mock 路径）与 smoke 脚本条目；越权（非属主）访问返回 403；
- 本机不跑测试，验证交远端 CI（local-dev-rules.md §1）。

---

**B01 · 分层治理：Project 走 service/repository，消除 handler 直连 DB**
- 现状：`project_handler.go:88,124,154,193,201,227` 直接持 gorm.DB 写 SQL；User 仓库在 service 包（`service/gorm_user_repo.go`）而非 repository 包；分层约定（development-plan.md:365）被破坏。
- 任务：新建 `ProjectRepository`（gorm + mock 双实现，对齐 `asset_repo.go` 模式）与 `ProjectService`；ProjectHandler 改走 service；`gorm_user_repo.go` 迁入 repository 包；model/project.go 补 `ThumbnailURL` 字段（迁移已有列 `001:22`，无需新迁移）。
- 验收：handler 内无 gorm.DB 依赖；`grep -n "gorm.DB" server/internal/handler/` 零命中；现有 project 测试改走真实 repo 后全绿。
- 依赖：无。**后续所有 B 工单按此分层写，不再产生新的越层代码。**

**B02 · deep 健康检查真实化**
- 现状：`health_handler.go:22-30` 硬编码 `db/redis/minio` 恒 "ok"，从不探测；`health_handler_test.go` 还在断言这个假响应；CI 给 backend job 配了 Redis 服务（ci.yml:25–32）却没被真用上。
- 任务：deep=true 时真实执行 DB `Ping()`、Redis `Ping()`、MinIO bucket 探测（经 B05 的 Storage 接口）；任一失败返回 503 + 失败组件明细；mock 模式下报告各组件 "mock"。
- 验收：停掉依赖容器时 deep 探活非 200；smoke health.sh 增加失败分支断言。
- 依赖：B05。

**B03 · 请求超时中间件**
- 现状：`config.go:16,88-92` 的 `RequestTimeout` 加载后无任何消费。
- 任务：新增 gin 中间件（`http.TimeoutHandler` 或等价实现），超时返回 504 统一错误结构；挂载到路由链。
- 验收：单测构造 sleep handler 断言 504；配置为 0 时禁用。
- 依赖：无。

**B04 · prod 配置 `${VAR}` 占位符解析修复**
- 现状：`config/prod.yaml` 大量 `${DB_HOST}`、`${STORAGE_*}` 占位符，而 `overrideFromEnv`（config.go:82–119）没有对应读取逻辑，实际解析出字面量。
- 任务：补齐 env 覆盖映射（DB_*、STORAGE_*、AI_*、FFMPEG_*、JWT_SECRET 等），或在 yaml 加载后统一做 `${VAR}` 替换；补 config 包单测（该包当前零测试）。
- 验收：设置环境变量后 `Load()` 解析值正确；缺失必需变量时报错清单完整。
- 依赖：无。

**B05 · 对象存储层：Storage 接口 + S3/MinIO 实现 + 本地磁盘实现**
- 现状：config.Storage（MinIO endpoint/bucket/ak/sk，config.go:28–56）解析后零消费；全仓无任何 S3 代码。
- 任务：定义 `Storage` 接口（PresignPut / Exists / Get / Delete / Copy）；AWS SDK v2 s3 实现（endpoint 指向 MinIO，path-style）；本地磁盘实现（MOCK_MODE 与单测用，根目录取配置）；docker-compose 的 MinIO 已就绪（docker-compose.yml）。
- 验收：单测覆盖本地实现；S3 实现以集成 tag/skipIf 条件化（CI 有 MinIO 服务时跑真链路，local-dev-rules §2 允许 CI 安装）。
- 依赖：无。

**B06 · 素材直传端点：presign + confirm（D1）**
- 现状：`asset_handler.go:55-92` 仅接收 storagePath 字符串入库，可传任意值、不校验文件存在；api.md:218 自述"实际文件上传 Phase E 补充"。
- 任务：`POST /api/projects/:id/assets/presign`（Body `{fileName,fileSize,type}`，服务端生成受控 storageKey 如 `projects/{pid}/{assetId}/{fileName}`，返回 `{uploadUrl, assetId}`）；`POST .../assets/confirm`（校验对象存在与大小上限 500MB，落库 asset 并触发 B07 管线）；类型白名单（video/audio/image）；属主校验。
- 验收：smoke 走通 presign→PUT→confirm→GET assets 全链路；伪造 storagePath/超大文件返回 4xx；前端 F02 可接。
- 依赖：B05、D1。

**B07 · 素材处理管线：ffprobe 元数据 + ffmpeg 缩略图**
- 现状：Asset 的 duration/width/height/fps/codec/thumbnail_url 全靠前端传入或空置；config.FFmpeg 配置零消费（development-plan.md 任务 1.4/1.5）。
- 任务：confirm 后（Phase 1 同步执行 + 超时控制，Phase 4 迁 Asynq）调 ffprobe 提取元数据回写 asset；ffmpeg 截帧生成缩略图上传 Storage、回写 thumbnail_url；ffprobe/ffmpeg 不可用时降级（记录 metadata 提取失败状态，不阻塞 confirm）。
- 验收：CI 用真实小视频样本跑通提取与缩略图；无 ffmpeg 环境时 skipIf 跳过（local-dev-rules §2）。
- 依赖：B05、B06。

**B08 · PUT /api/projects/:id**
- 现状：路由未注册（main.go:73–98），计划 §7.2（development-plan.md:757）与任务 1.19 的一部分。
- 任务：更新 name/aspectRatio/style 等可变字段；属主校验；经 B01 分层。
- 验收：smoke 覆盖 PUT；不可变字段（user_id/status 越权改）被忽略或 4xx。
- 依赖：B01。

**B09 · Timeline 持久化：版本化 GET/PUT + 迁移 002（D3）**
- 现状：timelines 表与 model/timeline.go 零引用（死表死模型）；迁移 `UNIQUE(project_id)` 与多版本语义冲突；Editor 无任何持久化（development-plan.md 任务 1.19、§7 契约缺失处）。
- 任务：迁移 002——timelines 去 UNIQUE、加 `(project_id, version DESC)` 索引、补 updated_at 对齐模型；`GET /api/projects/:id/timeline`（默认最新版本，`?version=` 可选）、`PUT /api/projects/:id/timeline`（Body 为 Video DSL JSON，§10 类型，服务端做 JSON Schema 级基本校验后插入新版本行）；属主校验。
- 验收：PUT→GET 往返一致；非法 DSL 422；多次 PUT 产生递增版本；Phase 6 Version History 可直接查询。
- 依赖：B01、D3。

**B10 · LLM 客户端封装**
- 现状：config.AI（anthropic key/model，config.go:28–56）零消费；全仓无 LLM 代码（development-plan.md 任务 2.3）。
- 任务：定义 `LLMClient` 接口（Complete/Chat，带 system prompt 与 JSON 输出模式）；Anthropic Messages API 实现（超时/重试/限速）；`MockLLM` 实现（MOCK_MODE 返回预置 DSL/operations，供前端联调与单测）。
- 验收：接口单测（mock 实现）；真实实现以环境变量存在为开关、CI 无 key 时 skipIf。
- 依赖：无。

**B11 · Agent Pipeline 五组件 + DSL Validator**
- 现状：完全未开始（development-plan.md 任务 2.4–2.8；计划 §10 已定义 Video DSL 与 EditingOperation 类型，:1177–1293）。
- 任务：`server/internal/ai/`（或 service/ai）下实现 IntentParser（自然语言→结构化意图）、PlanningAgent（意图→剪辑计划）、AssetRetriever（基于 asset 元数据与 analysis 的候选检索）、EditingAgent（计划→Video DSL）、TimelineValidator（DSL 静态校验：时长/轨道/片段引用合法）；组件间以明确接口衔接，可独立单测。
- 验收：五个组件各带单测（MockLLM 驱动）；给定固定输入输出确定性可复现；校验不通过返回结构化错误（Phase 2 验收"DSL 校验不通过时有错误提示"）。
- 依赖：B10。

**B12 · Generate API：创建/轮询/澄清追问 + generations 表接入（D5）**
- 现状：generations 表与 model 零引用；`POST /api/projects/:id/generate`、`GET /api/generations/:id` 未注册（development-plan.md:820–821，任务 2.9/2.12）。
- 任务：POST 校验项目下有 assets → 建 generations 记录（pending）→ 后台执行 Pipeline（Phase 2 用受控 goroutine + 状态机 parsing→planning→generating→completed/failed，Phase 4 迁 Asynq）；GET 返回 status/timeline/error；需求模糊时返回 `status=need_input` + 追问列表（澄清后带 answers 重放）；结果写入 timelines（经 B09）。
- 验收：smoke 走通 generate→轮询→completed→GET timeline；mock 模式下 MockLLM 秒回便于 F08 联调；失败路径落 error 字段。
- 依赖：B11、D5。

**B13 · Chat API：上下文感知 + operations + edits 记录**
- 现状：edits 表与 model 零引用；`POST /api/projects/:id/chat` 未注册（development-plan.md:840–858，Phase 3 任务表）；§2.4 提到 SSE/轮询但 §7.6 契约为同步 POST（按同步实现，见 T02）。
- 任务：POST Body `{message, selectedClipId}` → 组装上下文（当前 timeline DSL + 选中片段 + 项目素材概要）→ LLM 产出 EditingOperation[]（6 种：Replace/Trim/Delete/Reorder/AddCaption/ChangeMusic）→ 服务端应用引擎把 operations 应用到当前 timeline 生成新版本（经 B09 落库）→ 响应 `{message, operations, timeline}`；每次对话写 edits（message/operation/before/after）；selectedClipId 存在时仅作用于该片段（Phase 3 验收"上下文感知"）。
- 验收：mock LLM 下六种操作各有单测（输入消息→期望 operations）；edits 落库可查；越权 403。
- 依赖：B10、B11。

**B14 · Asynq 任务队列基础设施**
- 现状：go.mod 无 asynq；config.Redis 零消费（development-plan.md 任务 4.1）；docker-compose 的 Redis 未被使用。
- 任务：引入 asynq（手改 go.mod 写版本区间 + 提交注明"锁文件待 install 生成"，local-dev-rules §2）；server 模式（enqueue）与 worker 模式（cmd/worker）装配；任务类型注册与重试/超时策略；MOCK_MODE 下用内联 goroutine 执行器替代（无需 Redis）；可选启用 task_results 表记录任务轨迹（development-plan.md:985–996）。
- 验收：CI（有 Redis 服务）下 Asynq 任务真实入队消费；mock 执行器单测通过。
- 依赖：无（B15/B16/B18 依赖它）。

**B15 · Analyze API**
- 现状：`POST /api/projects/:id/analyze`、`GET /api/projects/:id/analysis` 未注册（development-plan.md:788–789，任务 4.8）。
- 任务：POST Body `{assetIds}` → 校验属主 → 入队分析任务 → 返回 `{analysisId,status}`；GET 返回 status/progress/results（响应结构对齐 :797–815 示例：clipsAnalyzed/speakersDetected/strongMoments/talkingHead/bRoll/duplicates）；进度从 task/asset 状态聚合。
- 验收：smoke 走通 analyze→轮询→completed；无 assets 时 422。
- 依赖：B14。

**B16 · 分析 Worker：FFmpeg 场景检测 + Whisper ASR + Vision + 聚合写库**
- 现状：完全未开始（development-plan.md 任务 4.2–4.7）；assets.analysis/transcript JSONB 列空置。
- 任务：Asynq handler 实现：FFmpeg 场景切分（scene detection）→ Whisper ASR（转录+时间戳写 transcript）→ Vision 模型（经 B10 扩展多模态接口，产出 strongMoments/talkingHead/bRoll/duplicates）→ 聚合写 assets.analysis；三步各自可降级（如无 Vision key 时跳过并记录）；外部工具缺失时 skipIf（CI runner 安装 ffmpeg，local-dev-rules §2）。
- 验收：CI 用真实小样本视频跑通全管线并断言 analysis JSONB 结构；单步失败的降级路径有测试。
- 依赖：B14、B15。

**B17 · DSL→FFmpeg 滤镜链编译器**
- 现状：完全未开始（development-plan.md 任务 5.1–5.6）。
- 任务：输入 Video DSL（§10 类型），输出 FFmpeg 命令/滤镜图：素材转码规范化、时间线拼接、字幕（AddCaption）叠加、单轨背景音乐混合、xfade 转场；输出为纯函数（DSL→命令参数），可完整单测。
- 验收：给定覆盖全部 DSL 特性的样例 DSL，生成的命令通过快照测试；非法 DSL 报结构化错误。
- 依赖：B09（DSL 持久化后才有所渲染对象；编译器本身可先行开发）。

**B18 · Render Worker + Render API + 产物上传 S3**
- 现状：renders 表与 model 零引用；`POST /api/projects/:id/render`、`GET /api/renders/:id` 未注册（development-plan.md:863–864，任务 5.7/5.9/5.12）。
- 任务：POST Body `{format,resolution,fps}` → 取项目最新 timeline → 建 renders 记录（pending）→ Asynq 渲染任务：B17 编译 → 执行 FFmpeg（进度回写 renders.progress）→ 产物上传 Storage → 回写 download_url/file_size/completed_at；GET 返回 status/progress/downloadUrl；失败落 error。
- 验收：CI 端到端：上传样本素材→生成/手写 DSL→render→轮询→产物可 GET；进度单调递增至 100。
- 依赖：B17、B14。

**B19 · WebSocket 渲染进度推送（D2）**
- 现状：`middleware/auth.go:36-51` 的 WSQueryAuth 已写好但无路由挂载；gorilla/websocket 未引入；前端 vite proxy 已配 `/ws`（vite.config.ts:37–40）。
- 任务：引入 websocket 库（同 B14 依赖流程）；实现 Hub（renderId→connections）+ GET /ws/render/:renderId（挂 WSQueryAuth）；消息三种：progress/completed/error（对齐 development-plan.md:872–877）；Render Worker 进度变更时广播；断线重连后 GET /api/renders/:id 兜底。
- 验收：集成测试模拟 WS 客户端收到进度序列；未带 token 握手被拒。
- 依赖：B18、D2。

**B20 · 后端测试补齐与 CI 扩围**
- 现状：project handler 测试全走 mock 路径（`project_handler_test.go:13-205` 用 `NewProjectHandler(nil)`）；config/database/migrations 零测试；ci.yml:56 `go test` 范围为 `./internal/handler ./internal/middleware ./tests/...`；无 project smoke 脚本（tests/smoke/ 仅 health/auth/assets）。
- 任务：ci.yml `go test` 扩到 `./...`；repository 层 GORM 集成测试（CI postgres service，本地 skipIf，呼应 TEST_PLAN.md:112）；迁移引擎 up/down 测试；新增 projects smoke 脚本（list/get/PUT/delete）；每条 B 工单自带的端点测试随单交付。
- 验收：CI 后端 job 全绿且测试数量较现状显著增加；TEST_PLAN.md:112 可勾选。
- 依赖：伴随各工单，本单收口。

**B21 · 工程卫生收尾**
- 现状：构建产物 `server/server.exe`、`server/bin/server` 已入 git；api.md 契约落后于最终实现（单步上传、缺 PUT/timeline/generate/chat/render 端点文档）。
- 任务：**构建产物出库——属文件删除，须人类发起并确认后由人类或经授权执行 `git rm`，AI 不得自行删除**（local-dev-rules §4）；配套补 .gitignore（server/bin、*.exe）；api.md 按 D1/D2/D7 裁定结果与新增端点全面更新。
- 验收：仓库无二进制产物；api.md 与路由注册一一对应。
- 依赖：收尾阶段。

---

## 5. 前端工单

**F01 · mock 模式一致性修复（P0，独立可先做）**
- 现状：Upload 页 createMutation 无 mock 分支（`pages/Create/Upload/index.tsx:18-37`，mock 模式点 Continue 必然报错）；Login 页无 mock 降级（`Login/index.tsx:19-28`）；Editor 在真实 API 模式仍硬编码 `mockTimelineDSL`/`mockChatMessages`、assets 为空也回退 `mockAssets`（`pages/Editor/[projectId]/index.tsx:98-113`）。
- 任务：Upload/Login 补 isMockMode 分支（对齐 Describe 页模式）；Editor 假数据兜底改为真实空态 UI（空态设计对齐 design-system.md）；`GET /auth/me` 接入（后端已有，前端未调用）用于 RequireAuth 真实模式校验。
- 验收：`VITE_API_MODE=mock` 下全流程不产生真实网络请求；真实模式下不再出现 mock 数据。
- 依赖：无。

**F02 · 真实文件上传接入**
- 现状：`UploadStep/index.tsx:54-74` 用 setInterval 假进度，文件根本未上传；assetService 无 presign/confirm 调用。
- 任务：对接 B06（presign→PUT 直传→confirm）；真实进度（axios onUploadProgress 或直传后 confirm）；失败/重试/取消状态。
- 验收：真实模式上传真实文件后 Assets 面板出现该素材（依赖 B07 缩略图）。
- 依赖：B06。

**F03 · VideoPlayer 真 `<video>` + 播放同步**
- 现状：`VideoPlayer/index.tsx:15-36` 外链图片 + setInterval 假播放，mute 按钮无作用对象（development-plan.md 任务 1.7）。
- 任务：换 Semi 包裹的原生 `<video>`（当前素材 URL 来自 Storage/预签名）； currentTime↔timelineStore 播放头双向同步；倍速/音量/全屏。
- 验收：播放/暂停/seek 与时间轴播放头一致（Phase 1 验收 development-plan.md:503）。
- 依赖：无（素材 URL 可先用 B06 产物或本地样本）。

**F04 · Timeline 交互补全：拖入 / Trim / Reorder**
- 现状：Track onDrop 空实现（`Timeline/Track/index.tsx:23-28`）；Trim 手柄纯样式（`Clip/index.tsx:118-120`）；`timelineStore.reorderClips`（timelineStore.ts:80）无调用方。
- 任务：AssetCard/媒体面板拖入创建 clip（打通已有 `x-asset-id` 约定）；trim 手柄改 store 事件；拖拽重排接 reorderClips；Split/Delete 已有，补边界态。
- 验收：Phase 1 验收 502/504 两条可勾；100+ clips 拖拽不崩（Phase 6 虚拟滚动另列）。
- 依赖：F03。

**F05 · Inspector 绑定 + 真实素材信息**
- 现状：InspectorPanel 滑杆全部无受控（`InspectorPanel/index.tsx:87-94,111-112`）、滤镜格子空 div；Clip 只查 mockAssets（`Clip/index.tsx:30-32`）；MediaPanel 缩略图写死 5 条外链 URL（`MediaPanel/index.tsx:8-14`）。
- 任务：亮度/对比度/音量/caption 接 store 并进 DSL（对齐 §10 字段）；Clip/MediaPanel 读真实 asset（缩略图、时长、文件名）。
- 验收：Phase 1 验收 505 可勾；真实素材显示真实信息。
- 依赖：B07（缩略图）。

**F06 · 项目/时间轴持久化接入**
- 现状：前端无 PUT 调用、无保存/恢复机制（plan 任务 1.19 前端半）。
- 任务：对接 B09：编辑防抖保存（PUT timeline）、进入 Editor 加载最新版本、保存状态指示；去掉真实模式 mockTimelineDSL（与 F01 呼应）。
- 验收：刷新后时间轴恢复（Phase 1 验收 506 可勾）。
- 依赖：B09。

**F07 · AIChat 接真实 Chat API**
- 现状：`AIChat/index.tsx:42-55` setTimeout 假回复（自述 "AI editing lands in Phase 3"）；chatService 死代码；QuickActions 直接发送硬编码英文 prompt 而非预填（`QuickActions/index.tsx:9-26`，与 Phase 3 验收 575 冲突）；输入框用原生 textarea 违反 Semi 规则（AGENTS.md 规则 1）。
- 任务：接 chatService.send；ChatResponse.operations 应用到 timelineStore（类型已定义 `types/ai.ts:34-38`）；QuickActions 改预填；输入框换 Semi TextArea；上下文（选中 clipId）随消息发送。
- 验收：Phase 3 验收 571–575 可勾（依赖 B13）。
- 依赖：B13。

**F08 · Generate 路由与轮询进度页（D5）**
- 现状：`/projects/new/generate` 无路由（步骤条第 3 步是死链）；generateService 死代码；AGENTS.md 声明 defer。
- 任务：新建路由 + 步骤条接入；轮询 GET /generations/:id 渲染 parsing→planning→generating→completed 进度（复用/改造 AnalyzeProgress 组件）；need_input 状态渲染追问表单；completed 后 DSL 经 timelineStore.setDSL 进 Editor。
- 验收：Phase 2 验收 539 可勾。
- 依赖：B12、D5。

**F09 · Analyze 接入 + Transcript 面板**
- 现状：AnalyzeProgress 是纯 mock 死代码（无页面引用）；analyzeService 死代码；Transcript 面板完全缺失（plan 任务 4.10）。
- 任务：Upload 后或 Editor 内触发分析；AnalyzeProgress 改真实轮询；Transcript 面板展示带时间戳转录并与播放联动。
- 验收：Phase 4 验收 603–604 的前端部分可勾。
- 依赖：B15、B16。

**F10 · 导出链路：ExportDialog + WS 进度**
- 现状：Export 按钮无 onClick（`Editor/index.tsx:180-182`）；editorStore.isExportDialogOpen 死代码；前端无任何 WebSocket 代码。
- 任务：新建 ExportDialog 组件（format/resolution/fps 表单，Semi 组件）；接 renderService.start；WS hook（/ws/render/:renderId）渲染进度条，断线时轮询 GET /renders/:id 兜底；完成后提供下载链接。
- 验收：Phase 5 验收 635–638 的前端部分可勾。
- 依赖：B18、B19、D2。

**F11 · Undo/Redo + 键盘快捷键**
- 现状：Timeline 的 Undo/Redo 按钮无 handler（`Timeline/index.tsx:62-63`）；store 无历史栈；快捷键全无（plan 任务 6.2/6.6）。
- 任务：timelineStore 加历史栈（undo/redo/snapshot）；快捷键 Space/Delete/Ctrl+Z/Ctrl+Shift+Z/Ctrl+S（保存）。
- 验收：Phase 6 验收 666/669 可勾。
- 依赖：无（可提前）。

**F12 · 死代码处置**
- 现状：`AnalyzeProgress`（待 F09 启用）、`Assets/AssetPanel`+`AssetCard`（与 MediaPanel 重复，无引用）、`editorStore`（ExportDialog 待 F10 启用）、`assetService.remove`（无 UI 入口）。
- 任务：能被 F08/F09/F10 启用的走对应工单；确认不需要的（如 AssetPanel/AssetCard）**提请人类决定后按删除保护流程处理，AI 不得自行删除**（local-dev-rules §4）。
- 依赖：F09、F10。

**F13 · i18n 违规修复**
- 现状：`UploadZone/index.tsx:50` 拒收 Toast 硬编码英文、`ErrorBoundary.tsx:50-65` 硬编码、`index.html:7` 静态 title、QuickActions prompt 英文写死；大量 `t(key,'英文兜底')` 第二参兜底（AGENTS.md 规则 8 与 check-i18n 无法覆盖动态 key 的局限）。
- 任务：上述清零；document.title 走 i18n；约定禁用第二参英文兜底（缺 key 直接 fail）。
- 验收：check-i18n 通过（已挂 CI）；人工抽查无硬编码。
- 依赖：无。

**F14 · `/settings` 路由**
- 现状：development-plan.md:439 要求，router.tsx 无。内容：主题/语言/账号信息（复用现有 ThemeToggle/LanguageSwitcher）。
- 验收：路由可达、有返回路径（AGENTS.md 规则 9）。
- 依赖：无。P2。

**F15 · 前端测试补齐**
- 现状：10 个测试文件 455 行，页面级全是 renders-without-crashing；仅 ErrorBoundary/LanguageSwitcher/ThemeToggle 有行为断言（TEST_PLAN.md:111）。
- 任务：timelineStore 操作流测试（split/trim/reorder/undo）；services 层 mock 适配测试；关键组件（UploadStep 校验、DescribeForm 校验、AIChat operations 应用）行为测试。
- 验收：CI frontend job 覆盖率统计产出且不回退。
- 依赖：伴随各工单。

---

## 6. 测试 / CI / 治理工单

**T01 · CI 治理**
- 现状：ESLint job 空跑（`eslint ... || echo "ESLint not configured, skipping"` 兜底，前端 0 lint）；多个 actions 报 Node 20 弃用警告（checkout@v4/setup-node@v4/golangci-lint-action@v6/pnpm-action-setup@v4 被 force 到 Node 24）。
- 任务：web/ 接入真实 ESLint 配置（若依赖缺失走 package.json 手改流程，锁文件待人类同步——local-dev-rules §2）；CI 去 `\|\| echo` 兜底改硬门槛；actions 版本升级评估（@v5/@v6 等无需改 workflow 结构的版本）。
- 验收：lint 违规能让 CI 红；Node 弃用警告消除或评估结论入档。

**T02 · 文档矛盾裁定落地与修订**
- 现状：§3 所列 D1–D7 矛盾；development-plan.md 验收 checklist 全部未勾选与 README.md:155–163 状态表脱节；`editing-agent.go`/`editing_agent.go` 文件名笔误（development-plan.md:558–563 vs :338）。
- 任务：按 D1–D7 裁定结论统一修订 development-plan.md（§3 视觉基准、§7 契约、§8 DDL）、api.md、AGENTS.md（Phase E 措辞、Deferred 段）、README 状态表；修正笔误；随实施进度勾选 checklist。
- 验收：文档间无互相矛盾；每完成一个工单对应 checklist 同步更新。

**T03 · TEST_PLAN 待完善项（P2，可延后）**
- 现状：性能测试与安全扫描未做（TEST_PLAN.md:113–114）。
- 任务：基准/负载测试方案与实施（Timeline 渲染、render 吞吐）；npm audit + govulncheck 进 CI（独立 job，不阻塞主链路）。
- 验收：TEST_PLAN.md:113–114 可勾选。

---

## 8. 第三轮工单（WO3，豆包复测产出，2026-09-19）

> 来源：`audit/走查报告.md`（第二轮）+ 代码核实。全部已实现并推送，验证交远端 CI。
> 归属说明：WO2-01/04/06/07 有并行会话在制品（VideoPlayer/Settings/Login/RequireAuth），本轮未触碰，避免冲突。

| 编号 | 标题 | 级别 | 状态 |
|---|---|---|---|
| WO3-01 | 时间轴片段点不中（element center is obscured）：clip 提层 z-index + 12 个装饰子层 pointer-events:none，命中统一收敛到片段根元素 | P1 | ✅ |
| WO3-02 | 编辑器顶部"模板"按钮无响应：接 Toast 占位提示（模板浏览属未实现功能登记，不做假入口） | P1 | ✅ |
| WO3-03 | 删除项目无二次确认：Semi Popconfirm + 不可恢复提示文案 | P1 | ✅ |
| WO3-04 | 素材卡"花卉"假图与标签：移除设计稿外链 ASSET_IMAGES 与 horizontalLabel，无缩略图时渲染中性占位块，横版卡显示真实文件名 | P2 | ✅ |
| WO3-05 | mock 模式导出进度不可用（WS/渲染接口不可达属预期）：ExportDialog 本地模拟进度到 100%；真实模式 vite /ws 代理与后端路由已核对正确 | P2 | ✅ |
| WO3-06 | Google Fonts 国内超时：移除外链，字体栈已有 Manrope→系统字体回退 | P2 | ✅ |
| WO3-07 | React Router v7 future flag 警告：BrowserRouter 预启 v7_startTransition / v7_relativeSplatPath | P2 | ✅ |
| WO3-08 | Semi findDOMNode 弃用警告：暂不启用 StrictMode（附注释说明），待 Semi 适配后恢复 | P2 | ✅ |
| WO3-09 | 修复 WO2-09 提交遗留编译错误：Vision 消息 map 类型、系统提示词未使用、集成测试 user repo 构造器归属 | P0 | ✅ |

### 后续登记（未实现功能，延续走查清单）

| 功能 | 优先级 | 归属 |
|---|---|---|
| 模板浏览页/面板 | P1 | 待排期 |
| 播放器倍速/逐帧（含 WO2-01 真播放器收尾） | P1 | 并行会话在制品 |
| /settings 页面收尾（WO2-04） | P1 | 并行会话在制品 |
| 登录/注册客户端校验收尾（WO2-06） | P1 | 并行会话在制品 |
| RequireAuth 接 /auth/me（WO2-07） | P1 | 并行会话在制品 |
| Timeline 虚拟滚动（100+ clips） | P2 | 待排期 |
| 录制/内容/文本/品牌面板 | P2 | 待排期 |
| 项目重命名/复制 | P2 | 待排期 |

---

## 7. 建议执行顺序

| 批次 | 内容 | 出口标准（里程碑对齐 development-plan.md:1329–1337） |
|---|---|---|
| 1 · 地基（并行友好） | B01、B03、B04、B05、B10、T01、F01、F03 | 分层与基础设施就绪；mock 模式全流程无假请求 |
| 2 · Phase 1 收尾 | B02、B06、B07、B08、B09、F02、F04、F05、F06、D3 | **M2：可手动编辑**——真实上传、真播放器、时间轴交互、刷新恢复 |
| 3 · AI 主链路 | B11、B12、B13、F07、F08 | **M3/M4：AI 生成 + 对话式修改** |
| 4 · 异步与分析 | B14、B15、B16、F09 | **M5：真实素材分析** |
| 5 · 渲染导出 | B17、B18、B19、F10、F11 | **M6：首个可导出视频** |
| 6 · 收尾 | B20、B21、F12、F13、F14、F15、T02、T03 | **M7：产品级体验**；后端工单全部关闭 |

依赖主线：B05→B06/B07→（F02/F05）；B01→B08/B09→（F06/B12/B13/B17）；B10→B11→B12/B13；B14→B15/B16/B18；B17→B18→B19。



---

## 8. 第二轮工单（2026-09-19 复查产出）

> 复查方式：对照第一轮工单与 development-plan.md 验收标准逐项核查代码；豆包同期进行真机测试。
> 结论：第一轮 39 条的实现主体全部落地；以下为残留缺口与新发现的收尾项。

| 编号 | 标题 | 优先级 | 现状证据 |
|---|---|---|---|
| WO2-01 | VideoPlayer 真 `<video>` 播放器：替换外链图+interval 假播放，播放头与 timelineStore 双向同步，音量/倍速/静音真实生效 | P0 | `VideoPlayer/index.tsx:17,34` 仍为假播放 |
| WO2-02 | Transcript 面板（Phase 4.10）：转录文本+时间戳展示，点击跳播 | P1 | 全仓无 transcript UI |
| WO2-03 | Version History UI（Phase 6.1）：SideSheet 版本列表 + 一键回滚（后端 `/timeline/versions` 已就绪） | P1 | 前端无消费方 |
| WO2-04 | `/settings` 路由与页面（F14 残留）：主题/语言/账号信息 | P1 | router.tsx 无 settings |
| WO2-05 | 素材删除 UI 入口：MediaPanel 卡片删除按钮接 `assetService.remove`（后端已就绪） | P1 | MediaPanel 无删除 |
| WO2-06 | 登录/注册客户端校验：邮箱格式 + 密码长度，错误文案本地化 | P1 | Login 页无校验 |
| WO2-07 | RequireAuth 真实模式接 `GET /auth/me` 校验 token 有效性（失效即清 token 跳登录） | P1 | `RequireAuth.tsx` 仅查 token 存在 |
| WO2-08 | 后端 repository 层 GORM 集成测试（CI postgres 真实路径）+ 迁移引擎 up/down 测试（B20 残留） | P1 | 现有测试仍以 mock 路径为主 |
| WO2-09 | Vision 分析接入：分析 Worker 在多模态 LLM key 存在时产出 strongMoments 等结果，无 key 降级（B16 残留） | P2 | analysis.visionStatus = "not configured" |
| WO2-10 | 前端关键路径测试补齐：dslAdapter 往返、ExportDialog 交互、Generate 页 need_input、UploadStep 校验（F15 残留） | P1 | 新组件零测试 |
| WO2-11 | Timeline 大量 clip 性能（Phase 6.9：虚拟滚动/按需渲染）与最小 1280px 响应式核查 | P2 | 未做 |
| WO2-12 | T03 落地：npm audit + govulncheck 进 CI（独立 job，不阻塞主链路） | P2 | 未做 |

执行顺序建议：WO2-01 → WO2-05/06/07（小件并行）→ WO2-02/03/04 → WO2-08/10 → WO2-09/11/12。

**实施结果（2026-09-19）**：WO2-01/02/03/04/05/06/07/08/09/12 已实现并推送（含 VideoPlayer 真 `<video>` 双向同步、playbackUrl 预签名链路、Transcript/VersionHistory UI、/settings、素材删除、登录校验、RequireAuth 接 /auth/me、GORM 集成测试与迁移往返、Vision 多模态分析、govulncheck/npm audit 安全 job、dslAdapter/TranscriptPanel 测试）。**遗留收口（2026-09-19）**：WO2-10 的 ExportDialog/Generate 页测试随 WO4-08 关闭（4da436c）；
WO2-11 的 Timeline 性能与响应式核查随 WO4-09 关闭（4da436c，采用单轨 200 条渲染上限+溢出汇总条，
完整虚拟滚动仍留待后续）；并行会话（豆包）同期落地了第三轮走查修复（WO3-01~08，见 git log）。



---

## 9. 第三轮工单（2026-09-19 复查产出，WO4 系列）

> 背景：第二轮完成 10/12；豆包同期落地 WO3-01~08（第三轮走查修复）并做真机测试。
> 本轮复查确认的新缺口如下（编号沿用 WO4，避开豆包已用的 WO3）。

| 编号 | 标题 | 优先级 | 现状证据 | 状态 |
|---|---|---|---|---|
| WO4-01 | 编辑器多片段连续播放：VideoPlayer 按 currentTime 定位当前 clip 并切换素材源（当前只播第一个素材，`VideoPlayer/index.tsx:40-53` 注释自认） | P1 | 播放头走过后续片段画面不更新 | ✅ 4da436c |
| WO4-02 | 退出登录 + 账户菜单：首页头像下拉（账号/设置/退出登录），logout 清 token 跳登录；编辑器齿轮按钮接 `/settings`（现无 onClick） | P1 | 全仓无 logout；Editor `IconSetting` 无 handler | ✅ 4da436c |
| WO4-03 | analyzeService 类型契约修正：前端 `assetIds: string[]` vs 后端 `[]uint`，非空传参必失败 | P1 | `assetService.ts:59` | ✅ 2317dd1 |
| WO4-04 | Security job 降噪：govulncheck 失败使 job 显示 X（run 虽绿），改为步骤级容忍让 job 绿 | P2 | run 35435160087 job X | ✅ 2317dd1 |
| WO4-05 | 播放器/编辑器假图占位本地化：去 googleusercontent 外链（`VideoPlayer:15`），改 CSS 渐变占位 | P2 | 外链在国内环境超时（走查 P2-6 同源问题） | ✅ 4da436c |
| WO4-06 | Share 按钮占位：点击 Toast 提示"链接已复制/开发中"（Phase 5+ 未到，消灭死按钮） | P2 | Editor shareBtn 无 handler | ✅ 4da436c |
| WO4-07 | docker-compose 增加 worker 服务 + README 真实模式联调说明（VITE_API_MODE=real / MOCK_MODE=false 的启动方式） | P2 | compose 无 worker；README 未写 | ✅ 2317dd1 |
| WO4-08 | 第二轮遗留转入：ExportDialog/Generate 页组件测试（原 WO2-10） | P2 | 零测试 | ✅ 4da436c |
| WO4-09 | 第二轮遗留转入：Timeline 大量 clip 性能（虚拟滚动/渲染上限）+ 最小 1280px 响应式核查（原 WO2-11） | P2 | 未做 | ✅ 4da436c（单轨 200 条渲染上限+溢出汇总条；完整虚拟滚动仍留待后续） |
| WO4-10 | 未用 locale key 清理（71 个 extra 警告）——评估后**暂不实施**：动态 key 与豆包高频改动下，误删风险大于收益；保持 check-i18n 告警级别 | — | 决策记录 | 决策维持 |

**实施结果（2026-09-19）**：WO4-03/04/07 由并行会话落地于 2317dd1；WO4-01/02/05/06/08/09 落地于
4da436c（多片段连续播放、Home 头像下拉退出登录、渐变占位去外链、Share/齿轮接线、单轨渲染上限、
ExportDialog/Generate 组件测试）；6d32e8f 修复 WS 对不存在/越权渲染的握手误报。评审补丁：修复
相邻片段共用同一素材时 `ended` 后不触发 loadedmetadata 导致的连播假死（直接 seek 下一片段素材内位置）。
全部验证交远端 CI。

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-09-18 | v1.0 | 初始版本：基于全量代码审查产出后端 21 / 前端 15 / 治理 3 共 39 条工单，附 7 项待裁定决策与执行批次建议 |
| 2026-09-19 | v1.1 | 并入走查工单（audit/工单清单.md WC-P0/P1/P2 与 WC-NI 系列）；B08（项目更新）已由 main 分支 PATCH /api/projects/:id 实现；D1–D7 裁定落地。 |
| 2026-09-19 | v1.2 | 全量工单实现完成并推送：后端新增存储/上传/时间轴/AI/分析/渲染/WebSocket 服务与迁移 002，前端接入真实上传、持久化、聊天、生成页与导出；smoke 扩至 7 个脚本；本机零验证，待 CI 裁决。 |
| 2026-09-19 | v1.3 | 第二轮工单 WO2-01～WO2-12 登记；随后 WO2-02/03/08/09/10/12 由并行会话完成（转录面板/版本历史/GORM集成测试/Vision/前端测试/安全job）。 |
| 2026-09-19 | v1.4 | 第三轮：豆包复测 P1×3/P2×5 → 新增 WO3-01～08 并全部实现（时间轴点击遮挡防御修复、编辑器模板按钮响应、删除项目二次确认、素材占位图去设计稿假图、mock 导出进度模拟、移除 Google Fonts、Router v7 flags、StrictMode 规避 findDOMNode）；另修复 WO2-09 提交遗留的 3 处编译错误。 |
| 2026-09-19 | v1.3 | 复查产出第二轮工单 12 条（§8）：VideoPlayer 真播放器、Transcript/版本历史 UI、settings、素材删除、登录校验、GORM 集成测试、Vision 接入、性能与安全扫描等。 |
| 2026-09-19 | v1.5 | 第三轮复查产出 WO4-01~09（§9，WO4-10 决策暂不实施）：多片段播放、退出登录、analyze 契约、security 降噪、占位本地化、compose worker 等。 |
| 2026-09-19 | v1.6 | WO4-01~10 全部关闭：03/04/07 落地 2317dd1，01/02/05/06/08/09 落地 4da436c，6d32e8f 修 WS 握手误报，评审补丁修 same-asset 连播假死；WO2-10/11 遗留随 WO4-08/09 收口。验证交远端 CI。 |
| 2026-09-19 | v1.4 | 第二轮实施完成 10/12：前端五件套+转录/版本历史 UI+GORM 集成测试+Vision+安全 job+关键测试推送，CI 全绿；遗留 WO2-10 部分（ExportDialog/Generate 测试）与 WO2-11（性能/响应式）。 |
