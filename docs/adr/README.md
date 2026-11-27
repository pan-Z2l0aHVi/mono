# 架构决策记录（ADR）索引

ADR 只记录技术选型、架构设计与工程化决策及其取舍；实现细节以源码、测试和对应文档为准。历史编号按当时记录解释；被取代的 ADR 在表内标注状态。

| ADR                                                            | 状态               | 决策                                            | 何时读取                                                  |
| -------------------------------------------------------------- | ------------------ | ----------------------------------------------- | --------------------------------------------------------- |
| [0001](./0001-ci-pipeline.md)                                  | 已接受             | CI 验证流程                                     | 修改验证、Changesets 或发布门控                           |
| [0002](./0002-build-toolchain.md)                              | 已接受             | 构建工具链                                      | 修改 Vite Plus、构建或测试工具链                          |
| [0003](./0003-release-planes.md)                               | 已接受             | 发布平面                                        | 修改 npm / Wails 发布流程                                 |
| [0004](./0004-progressive-agent-context-architecture.md)       | 已由 0026 演进取代 | 渐进式 Agent Context 架构（初代）               | 查阅早期上下文分层历史                                    |
| [0005](./0005-web-ui-components.md)                            | 已接受             | Web UI 组件架构                                 | 修改 web-ui 公共契约、事件模型、框架类型或 icon 系统      |
| [0006](./0006-web-ui-composition.md)                           | 已接受             | Web UI 组合与渲染架构                           | 修改 overlay 定位、布局层级、token 或 `@lit/context` 组合 |
| [0007](./0007-plugin-system.md)                                | 已接受             | Plugin 系统                                     | 设计可组合状态或行为模块                                  |
| [0008](./0008-interweave-backend.md)                           | 已接受             | Interweave 后端架构                             | 修改 interweave Go 模块、Wails Service 或 bindings        |
| [0009](./0009-interweave-sqlite.md)                            | 已接受             | SQLite 持久化与 WAL                             | 修改 interweave 持久化层或 SQLite 并发模型                |
| [0010](./0010-task-orchestration.md)                           | 已接受             | 仓库指令保持编排无关（harness-agnostic）        | 修改 worktree 分工或会话协作边界                          |
| [0012](./0012-pr-review.md)                                    | 已接受             | PR review 结论与人工审查的增量复审              | 修改 PR review 判据、复审或合并前核验                     |
| [0013](./0013-context-authority.md)                            | 已接受             | Context 语料权威与漂移门禁                      | 修改指令文档权威标记、漂移门禁或语料策略                  |
| [0014](./0014-script-organization.md)                          | 已接受             | 脚本按执行面分类与统一入口                      | 修改政策检查集合、pre-commit / CI 入口或脚本布局          |
| [0015](./0015-task-ledger.md)                                  | 已退役（0026）     | Task 分级与台账 skill（已退役）                 | 查阅已退役 task-ledger 历史背景                           |
| [0016](./0016-accessible-names.md)                             | 已接受             | web-ui 内置无障碍文案固定英文回退与 `aria` 前缀 | 修改 web-ui 内置 aria 文案或覆盖 prop                     |
| [0017](./0017-monorepo-tooling-package.md)                     | 已接受             | 门禁与仓库工具收敛到 workspace 包               | 修改 monorepo-kit 包边界或 `scripts/` 分工                |
| [0018](./0018-monorepo-kit-generic-plugins.md)                 | 已接受             | monorepo-kit 收敛为参数化能力包                 | 修改 monorepo-kit 插件面或检查参数                        |
| [0019](./0019-md-to-meta.md)                                   | 已接受             | 通用 markdown 结构化引擎 md-to-meta             | 修改 meta 节点形状、围栏落盘或主题契约                    |
| [0020](./0020-skill-self-contained.md)                         | 已接受             | 自撰 skill 保持运行时自包含                     | 修改自撰 skill 依赖边界                                   |
| [0021](./0021-codex-review-gate.md)                            | 已接受             | Codex 自动 PR 审查门与只读/写回拆分             | 修改 CI 审查 job、发现分档或自动修边界                    |
| [0022](./0022-monorepo-kit-plugin-chain.md)                    | 已接受             | monorepo-kit 判定改为嵌套 `run` 链              | 修改检查协议或门禁入口组链                                |
| [0023](./0023-layout-controlled-mobile.md)                     | 已接受             | Layout 移动端状态由应用受控驱动                 | 修改 layout `mobile` 契约或应用侧断点订阅                 |
| [0024](./0024-interweave-native-menu-and-go-owned-settings.md) | 已接受             | Interweave 原生顶部菜单与 Go 拥有设置           | 修改 Interweave 菜单形态或设置所有权                      |
| [0025](./0025-apps-sparse-checkout.md)                         | 已接受             | App-only 稀疏检出与默认全树双轨策略             | 修改 `apps-sparse-checkout` 或稀疏检出边界                |
| [0026](./0026-lean-agent-context-for-frontier-models.md)       | 已接受             | 面向前沿模型的精简 Agent Context 体系           | 修改 agent 指令分层、删留判据、作用域 rules 或 skill 治理 |
