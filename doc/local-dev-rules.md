# WeaveClip — 本机开发规则

> 适用范围：wanfeng1028 的协作者在本机（本仓库工作副本）进行开发时。
> 以下均为硬性约定，违反即返工。

---

## 1. 本机零验证（§2.2）

- 不在本地跑 test / typecheck / lint / eval / `check_doc_links.py`——改完直接 commit + push，验证全交远端 CI 裁决。
- CI 红了在下一个提交修，不 revert、不 force push。
- 新写测试用例仍然是任务的一部分，只是不在本机跑。

## 2. 本机禁止一切下载

- 不执行任何会发起下载的命令：`pnpm add/install/update`、`npm install -g`、`pip install`、`apt-get install`、浏览器/CDN 拉取，全部禁止。
- 排查只依赖仓库既有 node_modules；走查所需外部工具（SoX、语言服务器等）由 CI runner 安装并跑真实链路（测试用 `skipIf` 条件化）。
- 新增依赖的流程：AI 手改 package.json（版本写明确区间）+ 提交说明注明"锁文件待 install 生成"；`pnpm-lock.yaml` 重算由人类执行或明示授权。锁文件未同步前 CI 红在 install 步属预期中间态，不得为绿灯偷跑 install。

## 3. 并行会话下的 lockfile 纪律

- 工作区可能带着其他会话未提交的 package.json 改动，`pnpm install` 会把它们带进锁文件；提交锁文件前必须核 diff 只含本会话改动。
- 已污染时用 `git worktree add _scratch/<name> HEAD` 取干净检出重算后拷回；不得 checkout/stash 别人的在制品。

## 4. 文件删除保护（§2.10）

- AI 无权删除任何文件（含 `rm`/`git rm`/`git clean`），提交中不得夹带删除；删除须人类发起并走五级确认。移动出仓库视同删除。

## 5. 工作节奏（§7）

- 每完成一个任务单元：代码/文档（含新增单测）→ 文档版本表追加 → commit + push → 看 CI。
- 提交信息：conventional commits + 中文描述。

## 6. 环境注意事项（§4）

- 文档与注释用中文，代码标识符、commit type 用英文。

---

## 与 AGENTS.md 交付标准的关系

AGENTS.md「交付标准」要求提供本机 typecheck + build 日志、`pnpm dev` 自检截图等。在本机开发时，该类"本机验证"要求被本文档第 1、2 条覆盖：

- 不执行任何本机验证命令，交付说明中注明"验证交由远端 CI"；
- AGENTS.md 中不涉及本机执行的其余约定（Semi Design 组件规范、i18n、组件拆分、路由与 store 设计等）照常遵守，两者不冲突。

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|---|---|---|
| 2026-09-18 | v1.0 | 初始版本，固化 wanfeng1028 协作本机的六条开发规则 |
