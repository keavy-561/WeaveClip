# DESIGN.md

> [!NOTE]
>
> 进行前端设计需要阅读本文档，遵守相关的规定。
> UI 文件目录：/design

## 1.UI / Visual 设计系统

### 1.1 设计方向

**Light Morandi Minimal** — 参考 weaveclip_2.0_1 HTML 参考稿，使用 Semi Design 组件体系。整体采用低饱和 Morandi 色板，Slate Blue 主色，Manrope 英文字体 + JetBrains Mono 数字/代码字体，保持克制、专业、工具感的编辑器界面。

### 1.2 浅色主题（唯一主题）

| Semi Token / CSS 变量        | 值        | 用途                           |
| ---------------------------- | --------- | ------------------------------ |
| `--semi-color-bg-0`          | `#F5F5F7` | 全局背景                       |
| `--semi-color-bg-1`          | `#FFFFFF` | 一级面板                       |
| `--semi-color-bg-2`          | `#F0F0F2` | 卡片 / 二级面板                |
| `--semi-color-bg-3`          | `#E4E4E7` | 三级面板 / 输入框              |
| `--semi-color-bg-4`          | `#D4D4D8` | 四级面板 / 禁用态              |
| `--semi-color-border`        | `#E4E4E7` | 边框 / 分割线                  |
| `--semi-color-primary`       | `#506070` | CTA、Focus、Selection、Active  |
| `--semi-color-primary-hover` | `#384857` | 主按钮 Hover                   |
| `--semi-color-primary-active`| `#2D3A45` | 主按钮 Active                   |
| `--semi-color-primary-light-default` | `rgba(80, 96, 112, 0.10)` | 主色淡底 |
| `--semi-color-text-0`        | `#1B1C1A` | 主要文字                       |
| `--semi-color-text-1`        | `#43474C` | 次级文字                       |
| `--semi-color-text-2`        | `#74777C` | 弱化信息 / 占位符              |
| `--semi-color-text-3`        | `#A1A1AA` | 辅助说明文字                   |
| `--semi-color-success`       | `#16A34A` | 成功状态                       |
| `--semi-color-warning`       | `#D97706` | 警告状态                       |
| `--semi-color-danger`        | `#DC2626` | 错误状态                       |
| `--semi-color-shadow`        | `rgba(0, 0, 0, 0.08)` | 阴影 |

### 1.3 扩展语义色（非 Semi 原生 Token，自定义 CSS 变量）

| 变量名                        | 值        | 用途                           |
| ----------------------------- | --------- | ------------------------------ |
| `--color-ai-accent`           | `#506070` | AI 相关强调（动画、光效等）    |
| `--color-ai-glow`             | `rgba(80, 96, 112, 0.20)` | AI 光效 |
| `--color-surface-container-lowest` | `#FFFFFF` | 最高层级表面 |
| `--color-surface-container-low` | `#F4F4F0` | 低层级面板 |
| `--color-surface-container`   | `#EFEEEA` | 默认面板 |
| `--color-surface-container-high` | `#E9E8E4` | 高层级面板 / Hover |
| `--color-surface-container-highest` | `#E3E2DF` | 最高层级面板 |
| `--color-surface-variant`     | `#E3E2DF` | 变体表面 |
| `--color-outline-variant`     | `#C4C7CC` | 弱边框 |
| `--color-primary-fixed`       | `#D3E4F7` | 主色固定淡底 |
| `--color-primary-fixed-dim`   | `#B7C8DA` | 主色固定暗底 |
| `--color-on-primary-fixed`    | `#0C1D2A` | 主色固定底上的文字 |
| `--color-on-primary-fixed-variant` | `#384857` | 主色固定变体底上的文字 |
| `--color-on-primary-container`| `#223240` | 主色容器上的文字 |
| `--color-secondary`           | `#695C52` | 次要元素 |
| `--color-secondary-container` | `#EFDCD0` | 次要容器 |
| `--color-on-secondary-container` | `#6E6056` | 次要容器上的文字 |
| `--color-secondary-fixed`     | `#F2DFD3` | 次要固定底 |
| `--color-secondary-fixed-dim` | `#D5C3B7` | 次要固定暗底 |
| `--color-tertiary`            | `#79564A` | 第三级元素 |
| `--color-tertiary-container`  | `#B78F81` | 第三级容器 |
| `--color-on-tertiary-container` | `#45291F` | 第三级容器上的文字 |
| `--color-tertiary-fixed`      | `#FFDBCF` | 第三级固定底 |
| `--color-tertiary-fixed-dim`  | `#E9BDAE` | 第三级固定暗底 |
| `--color-on-tertiary-fixed`   | `#2D150C` | 第三级固定底上的文字 |
| `--color-inverse-surface`     | `#2F312E` | 反色表面 |
| `--color-inverse-on-surface`  | `#F2F1ED` | 反色表面上的文字 |
| `--color-inverse-primary`     | `#B7C8DA` | 反色主色 |
| `--color-dusty-rose`          | `#D18E85` | 音频轨道 / 暖色强调 |
| `--color-slate-blue`          | `#899AAB` | 视频轨道 / 冷色强调 |
| `--color-sage-green`          | `#A29EAD` | 状态强调 |
| `--color-warm-beige`          | `#D8C6BA` | 暖色辅助 |
| `--color-charcoal-text`       | `#423936` | 正文替代色 |
| `--color-stone-gray`          | `#DADC08` | 特殊高亮 |
| `--color-on-background`       | `#1B1C1A` | 背景上的文字 |
| `--color-background`          | `#FAF9F5` | 页面背景 |
| `--color-on-surface`          | `#1B1C1A` | 表面上的主要文字 |
| `--color-on-surface-variant`  | `#43474C` | 表面上的次要文字 |
| `--color-error`               | `#BA1A1A` | 错误状态 |
| `--color-on-error`            | `#FFFFFF` | 错误状态上的文字 |
| `--color-error-container`     | `#FFDAD6` | 错误容器 |
| `--color-on-error-container`  | `#93000A` | 错误容器上的文字 |

### 1.4 字体

| 用途       | 字体           | 回退                                         |
| ---------- | -------------- | -------------------------------------------- |
| 英文主字体 | Manrope        | system-ui, sans-serif                        |
| 中文       | Noto Sans SC   | "PingFang SC", "Microsoft YaHei", sans-serif |
| 代码/数字  | JetBrains Mono | monospace                                    |

### 1.5 字号与字重

| Token             | 字体           | 字号     | 字重 | 行高   | 字间距     |
| ----------------- | -------------- | -------- | ---- | ------ | ---------- |
| `headline-lg`     | Manrope        | 24px     | 600  | 32px   | -0.02em    |
| `headline-md`     | Manrope        | 18px     | 600  | 24px   | -0.01em    |
| `headline-lg-mobile` | Manrope      | 20px     | 600  | 28px   | —          |
| `body-md`         | Manrope        | 14px     | 400  | 20px   | —          |
| `body-sm`         | Manrope        | 12px     | 400  | 16px   | —          |
| `label-md`        | JetBrains Mono | 12px     | 500  | 16px   | 0.02em     |
| `label-sm`        | JetBrains Mono | 10px     | 500  | 12px   | 0.05em     |

### 1.6 圆角

| 组件              | 圆角            | 说明                   |
| ----------------- | --------------- | ---------------------- |
| Card              | `8px`           | `--semi-border-radius-large` |
| Button            | `8px`           | `--semi-border-radius-small` |
| Input / Textarea  | `8px`           | 与 Button 保持一致     |
| Dialog / Modal    | `12px`          | `--semi-border-radius-extra-large` |
| Tooltip / Popover | `8px`           | `--semi-border-radius-small` |
| Timeline Clip     | `6px`           | 时间轴片段圆角         |
| Avatar            | `9999px` (圆形) | —                      |

### 1.7 间距系统

| 用途       | 值        |
| ---------- | --------- |
| Unit       | `4px`     |
| Gutter     | `12px`    |
| Margin     | `16px`    |
| Toolbar Height | `48px` |
| Panel Gap  | `2px`     |

### 1.8 设计原则

- 整体采用浅色 Morandi 低饱和色板，避免高饱和颜色
- Slate Blue `#506070` 仅用于主操作、Focus、Selection、Active 状态
- 编辑器区域保持干净克制的工具感，减少视觉噪音
- 时间轴区域保持紧凑布局
- AI 交互区域使用主色淡底 + 微妙光效标识
- 使用 Semi Design Tokens 覆盖默认值，保持设计一致性
- 严格遵循上述字体、圆角、间距规范
