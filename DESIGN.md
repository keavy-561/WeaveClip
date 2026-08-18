# DESIGN.md

> [!NOTE]
>
> 进行前端设计需要阅读本文档，遵守相关的规定。
> UI文件目录：/design

## 1.UI / Visual 设计系统

### 1.1 设计方向

**Dark Creative Studio** — 参考 Linear 的克制、Figma 的工具感，结合创意工具的专业感和现代 AI 产品的交互方式。使用 Semi Design 提供的组件体系，保持温和克制的企业级 UI 风格。

### 1.2 深色主题（默认）

| Semi Token / CSS 变量        | 值        | 用途                           |
| ---------------------------- | --------- | ------------------------------ |
| `--semi-color-bg-0`          | `#09090B` | 全局背景                       |
| `--semi-color-bg-1`          | `#111113` | 一级面板                       |
| `--semi-color-bg-2`          | `#18181B` | 卡片 / 二级面板                |
| `--semi-color-border`        | `#27272A` | 边框 / 分割线                  |
| `--semi-color-primary`       | `#8B5CF6` | AI 状态、CTA、Focus、Selection |
| `--semi-color-primary-hover` | `#7C3AED` | 主按钮 Hover                   |
| `--semi-color-text-0`        | `#F4F4F5` | 主要文字                       |
| `--semi-color-text-1`        | `#A1A1AA` | 次级文字                       |
| `--semi-color-text-2`        | `#71717A` | 弱化信息 / 占位符              |
| `--semi-color-success`       | `#22C55E` | 成功状态                       |
| `--semi-color-warning`       | `#F59E0B` | 警告状态                       |
| `--semi-color-danger`        | `#EF4444` | 错误状态                       |
| `--color-ai-accent`          | `#8B5CF6` | AI 相关强调（动画、光效等）    |

### 1.3 浅色主题（切换）

| Semi Token / CSS 变量        | 值        | 用途                       |
| ---------------------------- | --------- | -------------------------- |
| `--semi-color-bg-0`          | `#F5F5F7` | 全局背景                   |
| `--semi-color-bg-1`          | `#FFFFFF` | 一级面板                   |
| `--semi-color-bg-2`          | `#F0F0F2` | 卡片 / 二级面板            |
| `--semi-color-border`        | `#E4E4E7` | 边框 / 分割线              |
| `--semi-color-primary`       | `#7C3AED` | CTA 按钮、Focus、Selection |
| `--semi-color-primary-hover` | `#6D28D9` | 主按钮 Hover               |
| `--semi-color-text-0`        | `#18181B` | 主要文字                   |
| `--semi-color-text-1`        | `#52525B` | 次级文字                   |
| `--semi-color-text-2`        | `#A1A1AA` | 弱化信息 / 占位符          |
| `--semi-color-success`       | `#16A34A` | 成功状态                   |
| `--semi-color-warning`       | `#D97706` | 警告状态                   |
| `--semi-color-danger`        | `#DC2626` | 错误状态                   |
| `--color-ai-accent`          | `#7C3AED` | AI 相关强调                |

### 1.4 字体

| 用途       | 字体           | 回退                                         |
| ---------- | -------------- | -------------------------------------------- |
| 英文主字体 | Inter          | system-ui, sans-serif                        |
| 中文       | Noto Sans SC   | "PingFang SC", "Microsoft YaHei", sans-serif |
| 代码/数字  | JetBrains Mono | monospace                                    |

### 1.5 圆角

| 组件              | 圆角            | Semi Design 变量                   |
| ----------------- | --------------- | ---------------------------------- |
| Card              | `12px`          | `--semi-border-radius-large`       |
| Button            | `8px`           | `--semi-border-radius-small`       |
| Input / Textarea  | `10px`          | `--semi-border-radius-medium`      |
| Dialog / Modal    | `16px`          | `--semi-border-radius-extra-large` |
| Tooltip / Popover | `8px`           | `--semi-border-radius-small`       |
| Avatar            | `9999px` (圆形) | —                                  |

### 1.6 设计原则

- 紫色仅用于 AI/Focus/CTA 强调，不要让整个页面充满紫色渐变
- 深色模式下确保足够的对比度（文字 vs 背景）
- 编辑器区域使用更大圆角，控制面板使用更小圆角
- 时间轴区域保持紧凑布局，减少视觉噪音
- AI 交互区域要有明确的视觉标识（紫色光效/呼吸动画）
- 使用 Semi Design Tokens 覆盖默认值，保持设计一致性