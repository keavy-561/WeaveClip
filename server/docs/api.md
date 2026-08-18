# WeaveClip API 文档

Base URL: `/api`

## 通用约定

- 请求体/响应体均为 JSON。
- 成功响应直接返回数据体，不加外层 `success/data` 信封。
- 失败响应统一结构：`{ "success": false, "code": "...", "message": "...", "request_id": "uuid" }`。
- `DELETE` 成功返回 `204 No Content`。
- 所有受保护端点需在 `Authorization: Bearer <token>` 中携带 JWT。

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

### `DELETE /api/projects/:id`

删除项目。

响应 204：无内容

## 常见错误码

| code | http status | 说明 |
|------|-------------|------|
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
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
