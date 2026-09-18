# WeaveClip API 文档

Base URL: `/api`

## 通用约定

- 请求体/响应体均为 JSON。
- 成功响应直接返回数据体，不加外层 `success/data` 信封。
- 失败响应统一结构：`{ "success": false, "code": "...", "message": "...", "request_id": "uuid" }`。
- `DELETE` 成功返回 `204 No Content`。
- 所有受保护端点需在 `Authorization: Bearer <token>` 中携带 JWT。
- 文档定位（2026-09-19 v1.1）：本文件为目标契约，覆盖已实现与待实现端点；未实现端点按 `doc/work-orders.md` 工单逐步落地，路径参数统一使用 `:id`。

## 公开端点

### `GET /api/health`

健康检查。

响应 200：
```json
{
  "status": "ok",
  "time": "2025-01-01T00:00:00Z"
}
```

### `GET /api/health?deep=true`

深度健康检查（含 DB/Redis/MinIO 探测）。

响应 200：
```json
{
  "status": "ok",
  "time": "2025-01-01T00:00:00Z",
  "db": "ok",
  "redis": "ok",
  "minio": "ok"
}
```

### `POST /api/auth/register`

注册新用户。

请求体：
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "User Name"
}
```

响应 201：
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

错误 400：
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "invalid email format",
  "request_id": "uuid"
}
```

### `POST /api/auth/login`

登录获取 JWT。

请求体：
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

响应 200：
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 1, "email": "user@example.com", "name": "User Name" }
}
```

错误 401：
```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "invalid email or password",
  "request_id": "uuid"
}
```

### `GET /api/auth/me`

获取当前用户信息（需 JWT）。

响应 200：
```json
{
  "user": { "id": 1, "email": "user@example.com", "name": "User Name" }
}
```

## 受保护端点（需 Bearer Token）

### `GET /api/projects`

获取当前用户项目列表。

响应 200：
```json
{
  "projects": [
    {
      "id": 1,
      "userId": 1,
      "name": "My Video",
      "status": "draft",
      "duration": 45,
      "aspectRatio": "9:16",
      "style": "cinematic",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/projects`

创建项目。

请求体：
```json
{
  "name": "My Video",
  "duration": 45,
  "aspectRatio": "9:16",
  "style": "cinematic"
}
```

响应 201：
```json
{
  "project": { "id": 1, "userId": 1, "name": "My Video", "status": "draft", ... }
}
```

### `GET /api/projects/:id`

获取项目详情。

响应 200：
```json
{
  "project": { "id": 1, "userId": 1, "name": "My Video", ... }
}
```

错误 404：
```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "project not found",
  "request_id": "uuid"
}
```

### `PATCH /api/projects/:id`

部分更新项目（2026-09-19 已由 main 分支实现，对应工单 B08）：仅更新请求体中出现的非空字段，未提供的字段保持不变。

请求体（所有字段可选）：
```json
{
  "name": "Renamed Video",
  "duration": 30,
  "aspectRatio": "16:9",
  "style": "energetic"
}
```

响应 200：
```json
{
  "project": { "id": 1, "userId": 1, "name": "Renamed Video", "status": "draft", ... }
}
```

错误 404：项目不存在；403 `FORBIDDEN`：非属主访问；不可变字段（如 `userId`）被忽略。

### `DELETE /api/projects/:id`

删除项目。

响应 204：无内容

### `GET /api/projects/:id/assets`

获取项目资产列表。

响应 200：
```json
{
  "assets": [
    {
      "id": 1,
      "projectId": 1,
      "type": "video",
      "storagePath": "/mock/nyc_bridge.mp4",
      "fileName": "nyc_bridge.mp4",
      "fileSize": 52428800,
      "duration": 15.2,
      "width": 1920,
      "height": 1080,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### `POST /api/projects/:id/assets`

注册资产元数据（**mock/调试用途**。2026-09-19 裁定 D1：真实文件上传一律走下方 presign/confirm 两步契约，本端点不作为真实上传路径）。

请求体：
```json
{
  "type": "video",
  "storagePath": "/mock/a.mp4",
  "fileName": "a.mp4",
  "fileSize": 1024,
  "duration": 10.5,
  "width": 1920,
  "height": 1080
}
```

响应 201：
```json
{
  "asset": { "id": 1, "projectId": 1, "type": "video", "fileName": "a.mp4", ... }
}
```

### `POST /api/projects/:id/assets/presign`

生成预签名上传 URL（素材直传第一步，2026-09-19 裁定 D1）。服务端生成受控 `storageKey` 并预创建 asset 记录。

请求体：
```json
{
  "fileName": "travel_clip.mp4",
  "fileSize": 52428800,
  "type": "video"
}
```

响应 201：
```json
{
  "uploadUrl": "https://minio.local/weaveclip/projects/1/assets/2/travel_clip.mp4?X-Amz-Signature=...",
  "assetId": 2
}
```

客户端凭 `uploadUrl` 以 `PUT` 直传文件到对象存储，完成后调用 confirm。

错误 400 `VALIDATION_ERROR`：`type` 不在 `video/audio/image` 白名单或 `fileSize` 超限；404：项目不存在；403：非属主访问。

### `POST /api/projects/:id/assets/confirm`

确认上传完成（素材直传第二步，2026-09-19 裁定 D1）。服务端校验对象存在与大小上限（500MB）后落库，并触发元数据提取（ffprobe）与缩略图生成（ffmpeg）。

请求体：
```json
{
  "assetId": 2,
  "storagePath": "projects/1/assets/2/travel_clip.mp4"
}
```

响应 201：
```json
{
  "asset": { "id": 2, "projectId": 1, "type": "video", "fileName": "travel_clip.mp4", "storagePath": "projects/1/assets/2/travel_clip.mp4", ... }
}
```

错误 404：对象不存在或 `assetId` 无效；400 `VALIDATION_ERROR`：文件大小超上限。

### `GET /api/assets/:id`

获取资产详情。

响应 200：
```json
{
  "asset": { "id": 1, "projectId": 1, "type": "video", "fileName": "a.mp4", ... }
}
```

错误 404：
```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "asset not found",
  "request_id": "uuid"
}
```

### `DELETE /api/assets/:id`

删除资产。

响应 204：无内容

### `GET /api/projects/:id/timeline`

获取项目时间线（2026-09-19 裁定 D3：timelines 多版本设计，每次 PUT 产生新版本行）。`?version=` 可选，缺省返回最新版本。

查询参数：
- `version`（可选）：指定版本号，缺省为最新版本。

响应 200：
```json
{
  "timeline": {
    "id": 1,
    "projectId": 1,
    "version": 3,
    "createdAt": "2025-01-01T00:00:00Z",
    "timelineJson": {
      "version": "1.0",
      "duration": 45,
      "fps": 30,
      "width": 1080,
      "height": 1920,
      "tracks": [ ... ]
    }
  }
}
```

`timelineJson` 为 Video DSL JSON，类型定义见 doc/development-plan.md §10。

错误 404：项目不存在或尚无任何版本。

### `PUT /api/projects/:id/timeline`

保存时间线（2026-09-19 裁定 D3）：服务端校验后插入新版本行，version 递增，不覆盖历史版本。

请求体（Video DSL JSON）：
```json
{
  "version": "1.0",
  "duration": 45,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "tracks": [ ... ]
}
```

响应 201：
```json
{
  "timeline": { "id": 2, "projectId": 1, "version": 4, "createdAt": "2025-01-01T00:00:00Z" }
}
```

错误 422 `UNPROCESSABLE_ENTITY`：DSL 结构校验不通过；404：项目不存在。

### `POST /api/projects/:id/analyze`

提交素材分析任务（异步）。

请求体：
```json
{
  "assetIds": [1, 2]
}
```

响应 202：
```json
{
  "analysisId": 1,
  "status": "pending"
}
```

错误 422 `UNPROCESSABLE_ENTITY`：`assetIds` 为空或项目下无可分析素材；404：项目不存在。

### `GET /api/projects/:id/analysis`

查询素材分析进度与结果。`?analysisId=` 可选，缺省返回最近一次分析。

响应 200（进行中）：
```json
{
  "status": "processing",
  "progress": 40
}
```

响应 200（已完成）：
```json
{
  "status": "completed",
  "progress": 100,
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

### `POST /api/projects/:id/generate`

提交 AI 生成任务（一句话生成第一版时间线，异步执行）。

请求体：
```json
{
  "prompt": "Create a 45-second energetic NYC travel vlog",
  "answers": { "style": "cinematic" }
}
```

`answers` 可选：当上一次生成返回 `need_input` 时，客户端携带对追问的回答重新 POST 本端点。

响应 202：
```json
{
  "generationId": 1,
  "status": "pending"
}
```

错误 422 `UNPROCESSABLE_ENTITY`：项目下无素材；404：项目不存在。

### `GET /api/generations/:id`

查询生成任务状态与结果。`status` 取值：`pending` / `parsing` / `planning` / `generating` / `need_input` / `completed` / `failed`。

响应 200（需求模糊，待用户补充）：
```json
{
  "status": "need_input",
  "questions": [
    { "id": "style", "question": "你想要哪种整体风格？", "options": ["cinematic", "energetic", "storytelling"] }
  ]
}
```

响应 200（已完成）：
```json
{
  "status": "completed",
  "timeline": { "duration": 45, "fps": 30, "width": 1080, "height": 1920, "tracks": [ ... ] }
}
```

响应 200（失败）：
```json
{
  "status": "failed",
  "error": "LLM output failed timeline validation"
}
```

### `POST /api/projects/:id/chat`

AI 对话式修改时间线（同步返回）。服务端将返回的 operations 应用到当前时间线并落库新版本，同时写入 edits 编辑记录。

请求体：
```json
{
  "message": "Make the first five seconds more energetic",
  "selectedClipId": "clip_01"
}
```

`selectedClipId` 可选：传入时 AI 仅针对选中片段做上下文感知修改。

响应 200：
```json
{
  "message": "I replaced the opening with a faster sequence. Shortened from 12.4s to 7.8s.",
  "operations": [
    { "operation": "replace", "clipId": "clip_01", "assetId": "asset_08" },
    { "operation": "trim", "clipId": "clip_02", "start": 0, "end": 7.8 }
  ],
  "timeline": { ... }
}
```

`operations` 数组元素为 EditingOperation，类型定义见 doc/development-plan.md §10.2。

### `POST /api/projects/:id/render`

提交渲染导出任务（异步），以项目最新时间线为渲染对象。

请求体：
```json
{
  "format": "mp4",
  "resolution": "1080x1920",
  "fps": 30
}
```

响应 202：
```json
{
  "renderId": 1,
  "status": "pending"
}
```

### `GET /api/renders/:id`

查询渲染任务状态与产物。

响应 200（进行中）：
```json
{
  "status": "processing",
  "progress": 45
}
```

响应 200（已完成）：
```json
{
  "status": "completed",
  "progress": 100,
  "downloadUrl": "https://minio.local/weaveclip/renders/1/output.mp4"
}
```

失败时 `status=failed` 并附 `error` 字段；实时进度推送另见下方 WebSocket 端点。

## WebSocket 端点

### `GET /ws/render/:renderId`

渲染进度实时推送（2026-09-19 裁定 D2：进度属于某次渲染任务，路径参数为 `renderId`）。

- 握手：`GET /ws/render/:renderId?token=<JWT>`。浏览器 WebSocket 握手无法携带 `Authorization` 头，统一使用 `?token=` 查询参数鉴权；未带 token 或 token 无效时握手被拒。
- 服务端推送三种 JSON 消息：

```json
{ "type": "progress", "data": { "percent": 45, "stage": "concatenating clips" } }
{ "type": "completed", "data": { "downloadUrl": "https://s3.../render/xxx.mp4", "fileSize": 15728640 } }
{ "type": "error", "data": { "message": "FFmpeg error: ..." } }
```

- 断线重连后可轮询 `GET /api/renders/:id` 兜底。

## 常见错误码

| code | http status | 说明 |
|------|-------------|------|
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `UNPROCESSABLE_ENTITY` | 422 | 请求语义不满足（DSL 校验不通过、无待分析/生成素材等） |
| `UNAUTHORIZED` | 401 | 未认证或 token 无效 |
| `FORBIDDEN` | 403 | 无权限访问资源 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突（如乐观锁版本不一致） |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 前端联调开关

- `VITE_API_MODE=mock`（默认）：前端走本地 Mock 数据，不请求后端。
- `VITE_API_MODE=real`：前端使用真实 API。

后端 Mock 开关：
- `MOCK_MODE=true`：启用后端 Mock 降级。
- `MOCK_MODE=false` 或未设置：DB 连接失败直接启动失败。

## 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-09-19 | v1.1 | 更新为目标契约：补齐 PATCH /projects/:id、素材 presign/confirm、timeline 版本化 GET/PUT、analyze/analysis、generate/generations（含 need_input 追问）、chat、render/renders 与 WebSocket 渲染进度端点契约；按 D1 注明单步素材注册为 mock/调试用途；按 D2 统一 WS 路径参数为 :renderId；路径参数统一为 :id；错误码表新增 422。 |
