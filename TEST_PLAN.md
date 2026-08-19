# WeaveClip 测试策略与流程

## 1. 测试分层

| 层级 | 工具 | 触发时机 | 说明 |
|------|------|----------|------|
| 前端单测 | Vitest + RTL | CI push/PR | 组件、页面、store 的 smoke test |
| 后端单测 | go test + testify | CI push/PR | handler、service、middleware 单测 |
| 后端集成 | go test -race | CI push/PR | 带竞态检测的全量测试 |
| 冒烟测试 | bash + curl | CI push/PR | 全流程 E2E：health → auth → projects → assets |
| Lint | golangci-lint / eslint | CI push/PR | 代码规范与静态检查 |
| i18n 校验 | check:i18n | CI push/PR | 确保无硬编码文案 |

## 2. 测试文件清单

### 前端（web/）
```
web/src/
├── vitest.config.ts          # Vitest 配置
├── src/
│   ├── test-setup.ts         # 测试环境初始化
│   ├── utils/
│   │   └── test-utils.tsx    # 测试工具（render wrapper、mock helpers）
│   ├── pages/
│   │   ├── Login/index.test.tsx
│   │   ├── Home/index.test.tsx
│   │   ├── Projects/index.test.tsx
│   │   ├── Editor/[projectId]/index.test.tsx
│   │   └── Create/Upload/index.test.tsx
```

### 后端（server/）
```
server/
├── Makefile                  # 新增 test-race、test-coverage、lint target
├── internal/
│   ├── handler/
│   │   ├── test_helpers.go   # 共享测试工具（fake repos、JSON helpers）
│   │   ├── health_handler_test.go
│   │   ├── auth_handler_test.go
│   │   ├── project_handler_test.go
│   │   ├── asset_handler_test.go
│   │   └── middleware_test.go
│   ├── service/
│   │   ├── asset_service_test.go   # 已有
│   │   └── auth_service_test.go    # 已有
│   └── testutil/
│       └── gin.go            # Gin 测试上下文工厂
├── tests/
│   └── smoke/
│       ├── health.sh
│       ├── auth.sh
│       └── assets.sh
```

## 3. 本地开发 vs CI

| 环境 | 测试要求 | 说明 |
|------|----------|------|
| 本地开发 | 不强制 | 仅需 `pnpm build` + `go build` 保证可编译 |
| CI push/PR | 全量执行 | 单元测试 + 集成测试 + E2E + lint + i18n |

## 4. 质量门禁（CI）

| 检查项 | 阈值 | 失败处理 |
|--------|------|----------|
| 后端单测通过率 | 100% | 阻断合并 |
| 前端单测通过率 | 100% | 阻断合并 |
| 后端覆盖率 | ≥ 80% | 警告（不阻断） |
| 前端覆盖率 | ≥ 70% | 警告（不阻断） |
| Lint 零警告 | 0 warnings | 阻断合并 |
| i18n 缺失 | 0 missing keys | 阻断合并 |
| 冒烟测试 | 全通过 | 阻断合并 |

## 5. 测试命令速查

### 前端
```bash
cd web
pnpm install
pnpm test              # watch 模式
pnpm test:run          # 单次运行
pnpm test:coverage     # 带覆盖率报告
pnpm build             # 构建验证
pnpm run check:i18n    # 国际化检查
```

### 后端
```bash
cd server
go test ./...                          # 基础测试
make test-race                         # 竞态检测
make test-coverage                     # 覆盖率报告
make smoke                             # 冒烟测试（需先 docker-compose up）
go vet ./...                           # 静态检查
```

## 6. 上线前检查表

- [ ] `git push` 触发 CI 全绿
- [ ] 后端单测无失败
- [ ] 前端单测无失败
- [ ] 冒烟测试 health/auth/assets 全通过
- [ ] `pnpm build` 成功
- [ ] `go build ./cmd/server` 成功
- [ ] 无硬编码文案（i18n check 通过）
- [ ] 关键路径截图/录屏归档

## 7. 待完善项

- [ ] 前端组件覆盖率提升（当前 smoke test，后续补交互细节）
- [ ] 后端 repository 层 GORM 集成测试（需 testcontainers）
- [ ] 性能测试（基准测试 + 负载测试）
- [ ] 安全扫描（`npm audit`、`govulncheck`）
