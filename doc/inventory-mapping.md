# WeaveClip — 屏幕 × 页面 × 组件 映射表

> 基于 Stitch 项目 `AI Video Editor UI` 与 `Morandi Travel Journal` 的全部屏幕，结合现有 `web/src/` 路由与页面结构整理。先只输出表格和实现顺序建议，不写代码。

---

## 1. 现有路由与页面映射

| 路由 | 页面 | 对应 Stitch 屏幕（莫兰迪版） | 实现状态 |
|---|---|---|---|
| `/` | `Home` | CutPilot 首页 - 莫兰迪浅色版<br>WeaveClip 首页 - 莫兰迪版 2.0<br>WeaveClip 首页 - 丰富功能版 | 已有骨架 |
| `/projects` | `Projects` | 视频项目管理界面<br>视频项目管理 - 莫兰迪浅色版<br>项目管理 - 莫兰迪浅色版<br>WeaveClip 织影 - 项目管理（莫兰迪版） | 已有骨架 |
| `/projects/new` | `Upload` | WeaveClip 织影 - 上传素材（莫兰迪版） | 已有骨架 |
| `/projects/new/describe` | `Describe` | WeaveClip 织影 - 描述视频内容（莫兰迪版）<br>WeaveClip 织影 - 详细视频描述（莫兰迪版） | 已有骨架 |
| `/editor/:projectId` | `Editor` | WeaveClip 编辑器 - 莫兰迪版 2.0<br>WeaveClip 编辑器 - 莫兰迪焕新版<br>WeaveClip 编辑器 - 品牌焕新版<br>V_DTOR AI 编辑器主界面<br>V_DTOR AI 编辑器 - 莫兰迪浅色版 | 已有骨架 |
| — | `Logo` | 织影 WeaveClip Logo<br>WeaveClip Logo | 已有组件 |

---

## 2. 逐页组件拆分与映射

### 2.1 Home 首页

| Stitch 屏幕 | 页面 | 需拆分子组件 | Semi Design 组件 | 数据来源 |
|---|---|---|---|---|
| CutPilot 首页 - 莫兰迪浅色版 | `web/src/pages/Home/` | HeroSection<br>ProjectList<br>ProjectCard<br>ExamplePrompts | Card<br>Button<br>Input | TanStack Query (`projectService.getProjects`)<br>Mock (`mockData.projects`) |
| WeaveClip 首页 - 丰富功能版 | 同上 | 同上 | 同上 | 同上 |

**实现要点：**
- Hero 区域：大标题 + 副标题 + "Start creating" Primary Button
- 近期项目：Card 网格，每个 Card 包含缩略图、项目名、更新时间、操作按钮
- 底部 Example Prompts：Chip 组，点击自动填入 Describe 页

---

### 2.2 Projects 项目列表

| Stitch 屏幕 | 页面 | 需拆分子组件 | Semi Design 组件 | 数据来源 |
|---|---|---|---|---|
| 视频项目管理界面 | `web/src/pages/Projects/` | ProjectGrid<br>ProjectCard<br>EmptyState | Card<br>Button<br>Dropdown<br>Table | TanStack Query (`projectService.getProjects`)<br>Mock (`mockData.projects`) |
| 视频项目管理 - 莫兰迪浅色版 | 同上 | 同上 | 同上 | 同上 |
| 项目管理 - 莫兰迪浅色版 | 同上 | 同上 | 同上 | 同上 |

**实现要点：**
- 顶部 Toolbar：搜索 Input + 新建 Button + 视图切换（网格/列表）
- 项目卡片：缩略图、名称、时长、创建时间、操作菜单（打开/重命名/删除）
- 空状态：无项目时显示引导插图 + "Create your first video" CTA

---

### 2.3 Upload 上传素材

| Stitch 屏幕 | 页面 | 需拆分子组件 | Semi Design 组件 | 数据来源 |
|---|---|---|---|---|
| WeaveClip 织影 - 上传素材（莫兰迪版） | `web/src/pages/Create/Upload/` | UploadZone<br>FileList<br>UploadProgress | Upload<br>Button<br>Progress<br>List | TanStack Query (`assetService.upload`)<br>Mock (`mockData.assets`) |

**实现要点：**
- 拖拽上传区：支持 MP4/MOV/JPG/PNG，拖拽或点击上传
- 文件列表：缩略图、文件名、大小、状态（上传中/完成/失败）
- 上传进度：Semi Progress 条
- 底部操作：取消 / 下一步（进入 Describe）

---

### 2.4 Describe 描述需求

| Stitch 屏幕 | 页面 | 需拆分子组件 | Semi Design 组件 | 数据来源 |
|---|---|---|---|---|
| WeaveClip 织影 - 描述视频内容（莫兰迪版） | `web/src/pages/Create/Describe/` | DescribeForm<br>StylePicker<br>DurationSelector<br>AspectRatioSelector | TextArea<br>RadioGroup<br>Button<br>Select | Form state (local)<br>Mock (`mockData.styles`) |

**实现要点：**
- 自然语言输入：TextArea，placeholder 提示示例
- 时长选择：RadioGroup (15s / 30s / 45s / 60s)
- 画幅选择：RadioGroup (9:16 / 16:9 / 1:1)
- 风格选择：RadioGroup (Cinematic / Energetic / Minimal / Storytelling)
- 底部：Generate Button（Primary）

---

### 2.5 Editor 编辑器

| Stitch 屏幕 | 页面 | 需拆分子组件 | Semi Design 组件 | 数据来源 |
|---|---|---|---|---|
| WeaveClip 编辑器 - 莫兰迪版 2.0 | `web/src/pages/Editor/[projectId]/` | Header<br>AssetPanel<br>VideoPlayer<br>Timeline<br>AIChat<br>InspectorPanel | Nav<br>Button<br>Tabs<br>Card<br>Input<br>List<br>Spin<br>Toast | Zustand (`timelineStore`)<br>TanStack Query (`projectService`)<br>Mock (`mockData.timeline`) |

**Editor 子组件拆解：**

| 子组件 | 对应区域 | 说明 | 数据来源 |
|---|---|---|---|
| `Header` | 顶部导航栏 | Logo、项目名称、撤销/重做、导出按钮 | Zustand (`editorStore`) |
| `AssetPanel` | 左侧 240px | Tabs (Clips/Audio/Images)、素材卡片、上传按钮 | TanStack Query (`assetService`)<br>Zustand (`projectStore`) |
| `VideoPlayer` | 中间顶部 | 视频预览、播放/暂停、时间显示 | HTML5 Video + Zustand (`timelineStore`) |
| `Timeline` | 中间底部 | 多轨道 (Video/Audio/Caption)、Clip 块、播放头、刻度尺 | Zustand (`timelineStore`) |
| `AIChat` | 右侧 320px | 消息列表、Prompt 输入、快捷操作按钮 | Zustand (`aiChatStore`)<br>TanStack Query (`chatService`) |
| `InspectorPanel` | 右侧底部 | 选中 Clip 属性编辑 (名称/起止时间/速度/音量) | Zustand (`timelineStore`) |

**实现要点：**
- 三栏布局：`240px | flex: 1 | 320px`（CSS Grid 或 Flexbox）
- Assets 面板：Semi Tabs 切换素材类型，Card 展示缩略图
- Timeline：自定义 CSS Modules（非 Semi 组件），精细控制拖拽、选中、轨道
- AI Chat：Semi List + Input + ButtonGroup（快捷操作）
- Inspector：Semi Form + InputNumber + Slider + Select

---

## 3. 通用 UI 组件

| 组件 | 对应屏幕 | Semi Design 组件 | 数据来源 | 说明 |
|---|---|---|---|---|
| `Logo` | 全站 | — | Static | 织影 WeaveClip Logo，SVG |
| `ThemeToggle` | 全站 | Switch / Button | Zustand (`themeStore`) | 深色/浅色主题切换 |
| `LanguageSwitcher` | 全站 | Select / Dropdown | i18n | 中英文切换 |
| `LoadingSpinner` | 全站 | Spin | — | 加载状态 |
| `EmptyState` | 全站 | Empty / Card | — | 空数据引导 |
| `ErrorBoundary` | 全站 | — | — | 错误边界 |

---

## 4. Zustand Store 映射

| Store | 对应屏幕 | 状态内容 | 已有？ |
|---|---|---|---|
| `themeStore` | 全站 | 主题模式 (dark/light) | ✅ 已有 |
| `projectStore` | Projects / Editor | 当前项目信息 | ✅ 已有 |
| `timelineStore` | Editor | clips / tracks / selection / playState / currentTime / zoom | ✅ 已有 |
| `aiChatStore` | Editor | messages / loading / error | ✅ 已有 |
| `editorStore` | Editor | undoStack / redoStack / tool | ✅ 已有 |

---

## 5. TanStack Query 映射

| Query Key | 对应屏幕 | 接口 | 已有？ |
|---|---|---|---|
| `projects` | Home / Projects | `GET /api/projects` | ❌ 需实现 |
| `project` | Editor | `GET /api/projects/:id` | ❌ 需实现 |
| `assets` | Upload / Editor | `GET /api/projects/:id/assets` | ❌ 需实现 |
| `assetUpload` | Upload | `POST /api/projects/:id/assets/presign` | ❌ 需实现 |
| `generate` | Describe → Editor | `POST /api/projects/:id/generate` | ❌ 需实现 |
| `chat` | Editor | `POST /api/projects/:id/chat` | ❌ 需实现 |

---

## 6. Mock 数据映射

| Mock 模块 | 对应屏幕 | 内容 | 已有？ |
|---|---|---|---|
| `mockData.projects` | Home / Projects | 项目列表（3-5 个） | ✅ 已有 |
| `mockData.assets` | Upload / Editor | 素材列表（视频/音频/图片） | ✅ 已有 |
| `mockData.timeline` | Editor | 时间线 DSL（tracks / clips） | ✅ 已有 |
| `mockData.chatMessages` | Editor | AI 对话消息 | ✅ 已有 |
| `mockData.styles` | Describe | 风格选项 | ❌ 需补充 |

---

## 7. 实现顺序建议

### Phase 1：基础页面（轻量，快速验证设计）
1. **Home** — 验证 Hero + Card + Button 在 Morandi 色板下的表现
2. **Projects** — 验证列表/网格布局、空状态、Dropdown 操作

### Phase 2：创建流程（中等复杂度）
3. **Upload** — 验证拖拽上传、进度条、文件列表
4. **Describe** — 验证表单组件、RadioGroup、生成流程

### Phase 3：编辑器（最复杂，交互最重）
5. **Editor** — 三栏布局、Timeline 交互、AI Chat、Inspector

### 实现原则
- 每页先出计划（组件拆分 + 文件清单），确认后再写代码
- 每页完成后 `pnpm dev` 自检，通过后再进入下一页
- 编辑器页排最后，因为依赖最多（Store + Query + 多组件联动）

---

## 8. 验收检查清单

每页完成后检查：
- [ ] 按钮是 Semi `<Button>`，有 hover / focus / disabled / loading 状态
- [ ] 表单是 Semi `<Input>` / `<TextArea>` / `<Select>`，能键盘输入和 Tab 切换
- [ ] 列表是 `map + key` 渲染，改 mock 数据条数页面跟着变
- [ ] 页面跳转走 React Router URL，刷新不丢状态、浏览器后退可用
- [ ] 无 console 报错
- [ ] 样式用 CSS Modules，无内联样式

---

## 9. 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-08-18 | v1.0 | 初始版本，基于 Stitch 全部屏幕 + 现有 web/src 结构整理 |
