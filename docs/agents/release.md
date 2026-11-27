# 发布与 Changesets 边界

合并与发布均须按 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进) 取得用户授权；CI 门控接线见 [`ci.md`](./ci.md)。

## Changesets

- **声明范围**：公共 npm 包、参与版本管理的私有包、以及桌面端宿主应用（`@greypan/interweave`）有行为变更时声明对应 `patch`/`minor`/`major`；仅 docs/test/chore/根路径或独立 demo 改动写空壳 changeset（正文仅两行 `---`）。
- **严禁声明 `ignore` 表内的包**：见 [`.changeset/config.json`](../../.changeset/config.json)，被忽略的声明不会 bump 版本也不会被版本 PR 删除。`private: true` 只关闭 npm 发布，不等于退出 Changesets 版本管理。
- **英文描述与终态同步**：Changeset 描述必须用英文（直接进入面向用户的 CHANGELOG），交付前须核对与最终实现一致。
- **门禁边界**：PR CI 运行 `pnpm run check-changeset --base <sha> --head <sha>`；main 已有文件、删除文件或未提交文件均不构成声明。

## 多语言 README

公开 npm 包必须同时维护 `README.md` 与 `README.CN.md` 并互相链接；私有包/应用只要存在译文也须双向互链（由 `readme-locales` 门禁守护）。

## npm 与 Wails 发布边界

- **禁止直接 `npm publish`**：首次发布新包必须用 `pnpm publish-new-pack <package-dir-name>`；后续发布统一走版本 PR 与 [`npm-publish.yml`](../../.github/workflows/npm-publish.yml)。
- **npm release-notes 取舍**：`publish` 成功即创建 GitHub Release，不轮询 npm registry 可见性；重跑按当前 merge commit 幂等跳过已存在且同 SHA 的 published release，指向其它 SHA 或 draft 时失败。
- **Wails desktop release 不可自动重建**：native build 前只读核对 release 不存在且 tag 为空或指向当前 merge SHA；`publish` 阶段若 release 已创建后失败，重跑会被拒绝，须人工核对 tag、release 与资产后处置。
