# 发布与 Changesets 边界

合并与发布均须按 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进) 取得用户授权；CI 门控接线见 [`ci.md`](./ci.md)。

## Changesets

- **版本化范围**：仅 **6 个对外交付物**参与版本管理与 CHANGELOG 生成——5 个公开 npm 包（`@greypan/web-ui`、`@greypan/js-kit`、`@greypan/browser-kit`、`@greypan/deps-reload`、`@greypan/unplugin-web-components`）与桌面端宿主应用 `@greypan/interweave`。其余内部私有包与 demo 均位于 [`.changeset/config.json`](../../.changeset/config.json) 的 `ignore` 表中，严禁在 changeset 中声明它们。
- **空壳 changeset 边界**：仅改内部私有包、独立 demo、docs、test、chore、根配置或注释（未改变上述 6 个交付物的用户可见行为）时，写空壳 changeset（正文仅两行 `---`，**不得写任何正文**）。
- **一包一 changeset 与视角隔离（门禁强制）**：
  - 每个非空壳 `.changeset/*.md` 的 frontmatter **只能声明 1 个包**；跨包联动 PR 必须拆分为多个独立 `.changeset/*.md` 文件。
  - 每份 changeset 正文**只允许描述目标包自身的变化**：公开 npm 包的 changeset 严禁提及 Interweave、demo 站点或其他包的变更；`@greypan/interweave` 的 changeset 严禁混入上游组件库或 demo 的实现细节。
- **英文叙述与终态同步（门禁强制）**：非空壳 changeset 正文必须用英文撰写（直接进入面向用户的 CHANGELOG；行内代码、代码块与单行短引号包裹的 UI 原文字面量如 `"批量导入"` 允许保留原文），交付前须核对与最终实现一致。
- **门禁边界**：PR CI 运行 `pnpm run check-changeset --base <sha> --head <sha>`；main 已有文件、删除文件或未提交文件均不构成声明。

## 双轨版本号定级矩阵

### Library 轨道（5 个公开 npm 包）

| 层级        | 适用范围                                                            | 典型示例                                                                      |
| :---------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------------- |
| **`patch`** | Bug 修复、样式/色值/阴影/动效微调、内部重构、新增内置图标、依赖维护 | 修复焦点恢复、微调默认间距或缩放、新增 icon export、清理内部模块              |
| **`minor`** | 向后兼容的新能力                                                    | 新增组件、新增公开属性/方法/事件、新增公开 CSS Token、新增导出子路径          |
| **`major`** | 破坏性公共 API 变更                                                 | 移除或重命名公开组件/属性/事件/导出子路径、改变公开函数签名或运行时语义不兼容 |

- **严禁以「无已知外部消费者」为由将破坏性变更私自降级为 `minor` 或 `patch`**；反过来，亦严禁将样式微调、Bug 修复、内部重构或单图标新增抬升为 `minor` / `major`。

### App 轨道（`@greypan/interweave`）

| 层级                  | 适用范围                                 | 典型示例                                                                                     |
| :-------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------- |
| **`patch`（小版本）** | 迭代小功能、体验打磨、Bug 修复、性能优化 | 新增剪贴板复制、列表滚动位置记忆、弹窗交互优化、修复托盘/启动竞态                            |
| **`minor`（中版本）** | 迭代大功能或重要新能力模块               | 文件系统实时监听、系统托盘与轻量模式、桌面壁纸与 Markdown/代码预览、应用内检查更新与一键更新 |
| **`major`（大版本）** | 产品架构或整体体验的彻底焕新             | 跨代信息架构重做、核心数据模型或交互范式整体重构                                             |

## 多语言 README

公开 npm 包必须同时维护 `README.md` 与 `README.CN.md` 并互相链接；私有包/应用只要存在译文也须双向互链（由 `readme-locales` 门禁守护）。

## npm 与 Wails 发布边界

- **禁止直接 `npm publish`**：首次发布新包必须用 `pnpm publish-new-pack <package-dir-name>`；后续发布统一走版本 PR 与 [`npm-publish.yml`](../../.github/workflows/npm-publish.yml)。
- **npm release-notes 取舍**：`publish` 成功即创建 GitHub Release，不轮询 npm registry 可见性；重跑按当前 merge commit 幂等跳过已存在且同 SHA 的 published release，指向其它 SHA 或 draft 时失败。
- **Wails desktop release 不可自动重建**：native build 前只读核对 release 不存在且 tag 为空或指向当前 merge SHA；`publish` 阶段若 release 已创建后失败，重跑会被拒绝，须人工核对 tag、release 与资产后处置。
