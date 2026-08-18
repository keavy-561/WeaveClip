# WeaveClip 设计系统 — Morandi 浅色版

> 本文档是前端实现的唯一视觉基准。所有组件样式、Semi Design Token 覆盖、CSS 变量定义，都必须对齐此处规范。设计稿更新后允许重拉，但工程结构不因设计稿微调而重写。

---

## 1. 设计方向

**Light Morandi Minimal** — 低饱和 Morandi 色板 + Slate Blue 主色 + Manrope 英文字体 + JetBrains Mono 数字/代码字体。整体保持克制、专业、工具感的编辑器界面。

参考来源：
- Stitch 项目 `AI Video Editor UI`（莫兰迪浅色版屏幕）
- Stitch 项目 `Morandi Travel Journal`（Morandi 色板与字体规范）
- 现有 `DESIGN.md` 第 1 章

---

## 2. 色彩系统

### 2.1 核心色板（Semi Design Token 映射）

| Semi Token / CSS 变量 | 值 | 用途 |
|---|---|---|
| `--semi-color-bg-0` | `#F5F5F7` | 全局背景 |
| `--semi-color-bg-1` | `#FFFFFF` | 一级面板 |
| `--semi-color-bg-2` | `#F0F0F2` | 卡片 / 二级面板 |
| `--semi-color-bg-3` | `#E4E4E7` | 三级面板 / 输入框 |
| `--semi-color-bg-4` | `#D4D4D8` | 四级面板 / 禁用态 |
| `--semi-color-border` | `#E4E4E7` | 边框 / 分割线 |
| `--semi-color-primary` | `#506070` | CTA、Focus、Selection、Active |
| `--semi-color-primary-hover` | `#384857` | 主按钮 Hover |
| `--semi-color-primary-active` | `#2D3A45` | 主按钮 Active |
| `--semi-color-primary-light-default` | `rgba(80, 96, 112, 0.10)` | 主色淡底 |
| `--semi-color-text-0` | `#1B1C1A` | 主要文字 |
| `--semi-color-text-1` | `#43474C` | 次级文字 |
| `--semi-color-text-2` | `#74777C` | 弱化信息 / 占位符 |
| `--semi-color-text-3` | `#A1A1AA` | 辅助说明文字 |
| `--semi-color-success` | `#16A34A` | 成功状态 |
| `--semi-color-warning` | `#D97706` | 警告状态 |
| `--semi-color-danger` | `#DC2626` | 错误状态 |
| `--semi-color-shadow` | `rgba(0, 0, 0, 0.08)` | 阴影 |

### 2.2 扩展语义色（自定义 CSS 变量）

| CSS 变量名 | 值 | 用途 |
|---|---|---|
| `--color-ai-accent` | `#506070` | AI 相关强调（动画、光效等） |
| `--color-ai-glow` | `rgba(80, 96, 112, 0.20)` | AI 光效 |
| `--color-surface-container-lowest` | `#FFFFFF` | 最高层级表面 |
| `--color-surface-container-low` | `#F4F4F0` | 低层级面板 |
| `--color-surface-container` | `#EFEEEA` | 默认面板 |
| `--color-surface-container-high` | `#E9E8E4` | 高层级面板 / Hover |
| `--color-surface-container-highest` | `#E3E2DF` | 最高层级面板 |
| `--color-surface-variant` | `#E3E2DF` | 变体表面 |
| `--color-outline-variant` | `#C4C7CC` | 弱边框 |
| `--color-primary-fixed` | `#D3E4F7` | 主色固定淡底 |
| `--color-primary-fixed-dim` | `#B7C8DA` | 主色固定暗底 |
| `--color-on-primary-fixed` | `#0C1D2A` | 主色固定底上的文字 |
| `--color-on-primary-fixed-variant` | `#384857` | 主色固定变体底上的文字 |
| `--color-on-primary-container` | `#223240` | 主色容器上的文字 |
| `--color-secondary` | `#695C52` | 次要元素 |
| `--color-secondary-container` | `#EFDCD0` | 次要容器 |
| `--color-on-secondary-container` | `#6E6056` | 次要容器上的文字 |
| `--color-secondary-fixed` | `#F2DFD3` | 次要固定底 |
| `--color-secondary-fixed-dim` | `#D5C3B7` | 次要固定暗底 |
| `--color-tertiary` | `#79564A` | 第三级元素 |
| `--color-tertiary-container` | `#B78F81` | 第三级容器 |
| `--color-on-tertiary-container` | `#45291F` | 第三级容器上的文字 |
| `--color-tertiary-fixed` | `#FFDBCF` | 第三级固定底 |
| `--color-tertiary-fixed-dim` | `#E9BDAE` | 第三级固定暗底 |
| `--color-on-tertiary-fixed` | `#2D150C` | 第三级固定底上的文字 |
| `--color-inverse-surface` | `#2F312E` | 反色表面 |
| `--color-inverse-on-surface` | `#F2F1ED` | 反色表面上的文字 |
| `--color-inverse-primary` | `#B7C8DA` | 反色主色 |
| `--color-dusty-rose` | `#D18E85` | 音频轨道 / 暖色强调 |
| `--color-slate-blue` | `#899AAB` | 视频轨道 / 冷色强调 |
| `--color-sage-green` | `#A29EAD` | 状态强调 |
| `--color-warm-beige` | `#D8C6BA` | 暖色辅助 |
| `--color-charcoal-text` | `#423936` | 正文替代色 |
| `--color-stone-gray` | `#DADC08` | 特殊高亮 |
| `--color-on-background` | `#1B1C1A` | 背景上的文字 |
| `--color-background` | `#FAF9F5` | 页面背景 |
| `--color-on-surface` | `#1B1C1A` | 表面上的主要文字 |
| `--color-on-surface-variant` | `#43474C` | 表面上的次要文字 |
| `--color-error` | `#BA1A1A` | 错误状态 |
| `--color-on-error` | `#FFFFFF` | 错误状态上的文字 |
| `--color-error-container` | `#FFDAD6` | 错误容器 |
| `--color-on-error-container` | `#93000A` | 错误容器上的文字 |

### 2.3 设计约束

- Slate Blue `#506070` 仅用于主操作、Focus、Selection、Active 状态
- 整体采用低饱和 Morandi 色板，避免高饱和颜色
- 编辑器区域保持干净克制的工具感，减少视觉噪音

---

## 3. 字体系统

### 3.1 字体家族

| 用途 | 字体 | 回退 |
|---|---|---|
| 英文主字体 | Manrope | system-ui, sans-serif |
| 中文 | Noto Sans SC | "PingFang SC", "Microsoft YaHei", sans-serif |
| 代码 / 数字 | JetBrains Mono | monospace |

### 3.2 字号与字重

| Token | 字体 | 字号 | 字重 | 行高 | 字间距 |
|---|---|---|---|---|---|
| `headline-lg` | Manrope | 24px | 600 | 32px | -0.02em |
| `headline-md` | Manrope | 18px | 600 | 24px | -0.01em |
| `headline-lg-mobile` | Manrope | 20px | 600 | 28px | — |
| `body-md` | Manrope | 14px | 400 | 20px | — |
| `body-sm` | Manrope | 12px | 400 | 16px | — |
| `label-md` | JetBrains Mono | 12px | 500 | 16px | 0.02em |
| `label-sm` | JetBrains Mono | 10px | 500 | 12px | 0.05em |

### 3.3 设计约束

- 时间码、帧数、属性值等数字信息必须使用 `label-md` 或 `label-sm`，确保等宽对齐
- Active labels 使用 `#1B1C1A`，inactive / secondary labels 使用 `#43474C`

---

## 4. 圆角系统

| 组件 | 圆角值 | Semi Token / 说明 |
|---|---|---|
| Card | `8px` | `--semi-border-radius-large` |
| Button | `8px` | `--semi-border-radius-small` |
| Input / Textarea | `8px` | 与 Button 保持一致 |
| Dialog / Modal | `12px` | `--semi-border-radius-extra-large` |
| Tooltip / Popover | `8px` | `--semi-border-radius-small` |
| Timeline Clip | `6px` | 时间轴片段专用圆角 |
| Avatar | `9999px` | 圆形 |

### 4.1 设计约束

- 标准组件统一 `8px`
- 大容器（缩略图、视频预览）使用 `12px`
- Timeline Clip 使用 `6px`，确保片段紧贴时不会显得过于圆润

---

## 5. 间距系统

| 用途 | 值 |
|---|---|
| Unit | `4px` |
| Gutter | `12px` |
| Margin | `16px` |
| Toolbar Height | `48px` |
| Panel Gap | `2px` |

### 5.1 设计约束

- 所有间距必须为 `4px` 的整数倍
- 面板之间使用 `2px` gap 或 `1px` 分割线，最大化工作区
- Toolbar 固定高度 `48px`

---

## 6. 阴影与层级

| 层级 | 说明 | 实现方式 |
|---|---|---|
| Level 0 (Canvas) | 全局背景 `#FAF9F5` | 背景色 |
| Level 1 (Panels) | 一级面板 `#FFFFFF` | 背景色 + 弱边框 |
| Level 2 (Cards) | 卡片 `#F4F4F0` | 背景色 + 弱边框 |
| Level 3 (Popover/Modal) | 浮层 `#E9E8E4` | 背景色 + 阴影 |

- 阴影：`0 4px 20px rgba(0, 0, 0, 0.04)` 或 Semi Design 默认阴影
- 边框：面板之间使用 `1px solid #E4E4E7`
- Active 状态（如选中 clip）：`1.5px solid #506070`

---

## 7. 布局规则

### 7.1 编辑器三栏布局

```
┌──────────┬──────────────────────────────┬──────────┐
│  Assets  │       Preview / Timeline     │   AI     │
│  240px   │         flex: 1              │  Chat    │
│          │                              │  320px   │
│  Clips   │   ┌─────────────────────┐    │          │
│  Audio   │   │                     │    │  Chat    │
│  Images  │   │    Video Player     │    │  History │
│          │   │                     │    │          │
│          │   ├─────────────────────┤    │  Quick  │
│          │   │    Timeline         │    │  Actions│
│          │   │                     │    │          │
│          │   └─────────────────────┘    │  Input  │
└──────────┴──────────────────────────────┴──────────┘
```

### 7.2 响应式断点

| 断点 | 宽度 | 行为 |
|---|---|---|
| Desktop | `>= 1280px` | 完整三栏布局 |
| Tablet | `1024px - 1279px` | 右侧 AI Chat 折叠为图标栏 |
| Mobile | `< 1024px` | 单栏，底部 Tab 导航 |

### 7.3 设计约束

- 最小支持宽度 `1280px`，低于此宽度显示提示
- 时间轴区域保持紧凑，减少视觉噪音
- AI 交互区域使用主色淡底 + 微妙光效标识

---

## 8. 组件视觉规范

### 8.1 Button

| 类型 | 背景 | 文字 | 圆角 | 说明 |
|---|---|---|---|---|
| Primary | `#506070` | `#FFFFFF` | `8px` | 主操作 |
| Secondary | Transparent | `#43474C` | `8px` | 次要操作，1px border |
| Ghost | Transparent | `#74777C` | `8px` | 弱操作，hover 变深 |
| Disabled | `#E4E4E7` | `#A1A1AA` | `8px` | 禁用态 |

### 8.2 Input

- 背景：`#F4F4F0`（比面板稍深）
- 边框：`1px solid #E4E4E7`
- Focus：`2px solid #506070`，外发光 `rgba(80, 96, 112, 0.15)`
- 圆角：`8px`
- 字体：数值类输入使用 JetBrains Mono

### 8.3 Card

- 背景：`#F4F4F0` 或 `#FFFFFF`
- 圆角：`8px`
- 边框：`1px solid #E4E4E7`（可选）
- 阴影：`0 1px 3px rgba(0, 0, 0, 0.04)`

### 8.4 Timeline Clip

- 背景：`#EFEEEA`
- 圆角：`6px`
- 顶部色条：`3px solid #506070`（Video）、`#D18E85`（Audio）、`#A29EAD`（Effect）
- 选中态：`1.5px solid #506070` + 外发光

### 8.5 Chips / Tags

- 形状：pill (`9999px`)
- 背景：主色 / 辅色 15% 透明度
- 文字：对应深色
- 字号：`label-sm` (10px)

---

## 9. 设计原则

1. 整体采用浅色 Morandi 低饱和色板，避免高饱和颜色
2. Slate Blue `#506070` 仅用于主操作、Focus、Selection、Active 状态
3. 编辑器区域保持干净克制的工具感，减少视觉噪音
4. 时间轴区域保持紧凑布局
5. AI 交互区域使用主色淡底 + 微妙光效标识
6. 使用 Semi Design Tokens 覆盖默认值，保持设计一致性
7. 严格遵循上述字体、圆角、间距规范

---

## 10. 实现映射

| 设计规范 | Semi Design 组件 / CSS 变量 | 备注 |
|---|---|---|
| Primary Button | `<Button theme="solid" color="primary">` | 对应 `--semi-color-primary` |
| Secondary Button | `<Button theme="outline">` | 边框色对齐 `--semi-color-border` |
| Input | `<Input>` | 覆盖 `--semi-color-bg-3` 作为底色 |
| Card | `<Card>` | 圆角覆盖为 `8px` |
| Modal | `<Modal>` | 圆角覆盖为 `12px` |
| Timeline Clip | 自定义 CSS Modules | 不使用 Semi 组件，精细控制 |
| Slider | `<Slider>` | 轨道 / Thumb 颜色对齐 `--semi-color-primary` |

---

## 11. 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-08-18 | v1.0 | 初始版本，基于 Stitch Morandi 设计稿 + DESIGN.md 整合 |
