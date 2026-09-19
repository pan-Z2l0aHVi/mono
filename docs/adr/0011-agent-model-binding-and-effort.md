# ADR-0011: Agent 模型绑定与思考强度分档

- **Date**: 2026-09-11
- **Status**: 已接受
- **Amends**: [ADR-0010](0010-agent-role-orchestration.md) 的「执行体默认绑定」一节
- **Amended by**: [ADR-0014](0014-task-system-v2.md)（取消角色默认模型与思考强度分档；模型与思考强度由用户会话设置或 Manager 按任务指定）

## 背景

ADR-0010 建立了角色 → 执行体的默认绑定，但有两个缺口：

1. **模型绑定缺失**：全局约束固定了执行体与模型的绑定（Claude Code 绑定 GLM-5.3 Flash，Codex CLI 绑定 DeepSeek V4.1 Flash），文档没有记录这层契约，编排时无法建立“哪个角色跑在哪个模型上”的稳定预期。
2. **思考强度无契约**：所有角色隐式使用同一档推理深度。而 monorepo 的现实是：lib 层需要深度覆盖边界场景与复用性设计，业务开发基于已封装的组件与 API 拼接、追求批量交付效率，编排与评审需要完整逻辑链但调用频率低。统一档位要么浪费、要么不足。

目标结构是「强基石、快业务、严规范」：Designer(max) 定标准、Lib Coder(max) 打基石、Biz Coder(low) 提效率、Reviewer(high) 卡规范。

## 决策

### 1. 角色 → 执行体 → 模型 → 思考强度默认绑定

| 角色      | 执行体                                             | 默认模型                            | 默认思考强度 |
| --------- | -------------------------------------------------- | ----------------------------------- | ------------ |
| Manager   | Claude Code                                        | GLM-5.3 Flash                       | high         |
| Designer  | Claude Code                                        | GLM-5.3 Flash                       | max          |
| Lib Coder | Codex CLI                                          | DeepSeek V4.1 Flash                 | max          |
| Biz Coder | Codex CLI                                          | DeepSeek V4.1 Flash                 | low          |
| Reviewer  | 按风险路由（高风险 → Claude Code；小功能 → Codex） | GLM-5.3 Flash / DeepSeek V4.1 Flash | high         |

- 编码职能线（Lib Coder、Biz Coder）整体由 Codex CLI + DeepSeek V4.1 Flash 承担；通用职能线（Manager、Designer）由 Claude Code + GLM-5.3 Flash 承担。
- Reviewer 执行体按风险路由：高风险变更（跨 workspace、公共 API/exports、跨包契约、跨 worktree、UI 行为、构建/release、高风险迁移，清单以根 `AGENTS.md`「多 Agent 编排」为权威）由 Claude Code（GLM-5.3 Flash）主审，独立小功能快速迭代可由 Codex CLI（DeepSeek V4.1 Flash）审核，推荐思考强度 high。
- **模型与思考强度是推荐分档，非强制**：表中取值是稳定预期与成本结构的建议起点，允许按任务、按接入层实际情况调整（见「调整规则」）。
- 模型固定绑定在执行体接入层（CLI / 模型路由配置）实现，该配置不在本仓库版本控制内；仓库文档只记录契约与档位，核对时以接入层实际配置与本表互证，漂移时同步更新。思考强度由 Manager 在派发时通过执行体适配层设置（Claude Code 会话 effort、Codex CLI 派发参数），仓库同样不记录具体配置入口。接入层模型或配置变更时同步更新各绑定表与本 ADR。

### 2. 思考强度推荐分档

档位（low / high / max）表达该角色适用的推理深度**推荐起点**；模型与档位均为建议，非强制，Manager 可按任务与执行体适配层实际情况直接调整。

各角色的档位理由与常见调整场景（仅供参考）：

- **Manager（high）**：多包协同、依赖冲突与风险预判需要完整逻辑链；编排是低频调用，速度影响可忽略。
- **Designer（max）**：设计规范与组件标准是所有业务线的开发源头，从源头覆盖场景边界、交互细节与跨端差异，减少后续返工。项目周期极度紧张且需求简单明确时，可下调至 high。
- **Lib Coder（max）**：lib 层是全局公共基石，兼容性、工程化稳定性与跨端适配质量影响所有业务代码。仅做简单组件迭代、工具函数新增或样式微调时，可下调至 high。
- **Biz Coder（low）**：业务开发基于已封装的标准组件与 API，low 档只裁剪过度推理，保留需求理解与标准逻辑映射，且不会过度封装或重复造轮子，有利于代码一致性。涉及复杂交互（可视化编辑器、拖拽编排、多分支状态机）或核心资金/权限链路时，推荐上调至 high。
- **Reviewer（high）**：需同时校验产品匹配度、代码规范与依赖合规等多维度问题；max 档速度过慢不适合批量评审，low 档容易漏过规范与逻辑问题。

### 3. 调整规则

- 模型与思考强度的调整是常规操作，不视为偏离默认绑定，无需替代执行体级别的记录流程；Manager 可按任务直接选择。
- 推荐在 task packet 的 `Effort` 字段留痕；未记录不构成流程违规，按推荐档位理解即可。
- 执行体不可用时的替代记录规则沿用 ADR-0010；替代执行体的模型与思考强度按任务需要选择。

## 后果

- 根 `AGENTS.md`「多 Agent 编排」承载唯一权威绑定表（角色 / 执行体 / 默认模型 / 默认思考强度四列）；`docs/agents/workflow.md`、`CONTRIBUTING.md`、`.agents/agents/manager.md` 只链接引用，不复制表格；`.agents/agents/*` 角色契约自述执行体、推荐模型与默认档位及调整场景。（2026-09-19 修订：角色契约路径已由 ADR-0015 迁到 `.agents/skills/herdr-agents/roles/`，本条「只链接引用、不复制表格」不变。）
- `scripts/validate-context.mjs` 只机械校验执行体绑定：绑定镜像表执行体一致性（Reviewer 行允许「按风险路由」表述）、角色契约执行体自述、非 ADR 范围出现退役结构「二次审查」即报错。默认模型与思考强度是推荐分档，**不参与机械校验**，避免把建议当成 gate。守卫的 fixture 化负向回归用例延后至独立 instruction-system 任务：最小 fixture 需完整搭建 required context 文件与 workspace manifests，成本与本次变更风险不成比例。
- `docs/agents/task-packet.md` 模板增加 `Effort` 字段，推荐记录档位调整决策（非强制）。
- `CLAUDE.md` 薄适配入口不再复述角色绑定，只保留指向根入口绑定表的指针。
- 成本结构变化：Biz Coder 降档与 Lib/Designer 升档并存，整体偏向「基石与规范多花推理、业务交付提速度」。

## 替代方案

- **全角色统一 max**：质量最稳，但批量业务交付与评审的速度成本不可接受；不采用。
- **不设默认档位，逐任务自由选择**：灵活，但没有稳定预期，实际执行会漂移回单一档位；不采用。
- **把模型绑定写进仓库配置**：模型路由属于执行体接入层职责，仓库记录契约即可，配置进仓会在换模型时产生无意义的 diff 噪音；不采用。
