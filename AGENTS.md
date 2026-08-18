# WeaveClip 前端工程规范

## 技术栈（必须沿用，不得引入新框架）
React 18 + TypeScript + Vite + Semi Design + CSS Modules
状态：Zustand（客户端/UI 状态）；TanStack Query（服务端数据）
路由：React Router；数据：Mock 模式（后端未就绪时自动降级）

## 硬性规则（违反任何一条视为任务失败）
1. 所有交互元素必须用 Semi Design 组件：Button、Input、Select、Modal、
   Toast、Nav、Table 等；禁止用 div/span + onClick 模拟交互控件。
2. 交互组件必须具备 hover / focus / disabled / loading 状态（Semi 自带的
   用 props 启用，没有的用 CSS Modules 补）。
3. 页面级组件放 src/pages/，可复用 UI 抽成 src/components/，一个组件一个
   目录，通过 props 传数据，禁止 JSX 内写死业务数据。
4. 列表一律 map + key 渲染，禁止手写重复 JSX 块。
5. 数据获取走 TanStack Query + 现有 mock/api 层；编辑器状态（时间轴、选中
   片段、播放状态）进 Zustand store，沿用现有 store 设计，不另起炉灶。
6. 页面流转用 React Router 组织，沿用现有路由表，禁止用显隐切换整页。
7. 样式用 CSS Modules；禁止引入 Stitch 导出的 Tailwind 类名、内联样式和
   原生标签结构——Stitch 稿只作视觉与布局参照。

## Stitch 设计稿的使用方式
- 视觉规范以 doc/design-system.md 为唯一基准（首次任务生成）。
- 实现某屏前：get_screen_image 看视觉，get_screen_code 仅用于理解布局
  结构，组件实现一律映射到 Semi Design。
- 设计稿更新后允许重拉，但工程结构（组件拆分、路由、store）不因设计稿
  微调而重写。

## 工作方式
- 动手前先输出计划（改哪些文件、拆哪些组件），确认后再写代码。
- 一次任务只做一个页面/模块，完成后 git commit（信息用 conventional 格式）。
- 每页完成后运行 pnpm dev 自检：无 console 报错、交互可用、响应式正常。
