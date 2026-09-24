# ADR-0011: Agent 模型绑定与思考强度分档

- **Date**: 2026-09-11
- **Status**: 已接受
- **Amends**: [ADR-0010](0010-agent-role-orchestration.md) 的「执行体默认绑定」一节
- **Amended by**: [ADR-0014](0014-task-system-v2.md)（取消角色默认模型与思考强度分档；模型与思考强度由用户会话设置或 Manager 按任务指定）
- **Further amended by**: [ADR-0016](0016-implementation-supervision.md)（Role 与 Supervisor 的执行体绑定统一由 herdr-agents skill 维护）

## 背景

ADR-0010 建立了角色到执行体的默认绑定，但留下了两个问题：

1. **模型绑定缺失**：全局约束固定了执行体与模型的绑定（Claude Code 绑定 GLM-5.3 Flash，Codex CLI 绑定 DeepSeek V4.1 Flash），文档没有记录这层契约，编排时无法建立「哪个角色跑在哪个模型上」的稳定预期。
2. **思考强度无契约**：所有角色隐式使用同一档推理深度。而 monorepo 的现实是：lib 层需要深度覆盖边界场景与复用性设计，业务开发基于已封装的组件与 API 拼接、追求批量交付效率，编排与评审需要完整逻辑链但调用频率低。统一档位要么浪费、要么不足。

当时的设计目标是：Designer(max) 定标准，Lib Coder(max) 打基础，Biz Coder(low) 提效率，Reviewer(high) 守规范。

## 决策

### 1. 历史方案：角色 → 执行体 → 模型 → 思考强度默认绑定

下表记录 2026-09-11 的决策背景，不是当前配置。ADR-0014 已取消这套默认分档；现在由用户会话或 Manager 按任务选择模型和思考强度。当前默认执行体和 Reviewer 路由由 [`herdr-agents`](../../.agents/skills/herdr-agents/SKILL.md) 维护，Reviewer 默认使用 Claude Code。

| 角色             | 执行体                                             | 默认模型                            | 默认思考强度 |
| ---------------- | -------------------------------------------------- | ----------------------------------- | ------------ |
| Manager          | Claude Code                                        | GLM-5.3 Flash                       | high         |
| Designer         | Claude Code                                        | GLM-5.3 Flash                       | max          |
| Lib Coder        | Codex CLI                                          | DeepSeek V4.1 Flash                 | max          |
| Biz Coder        | Codex CLI                                          | DeepSeek V4.1 Flash                 | low          |
| Reviewer（历史） | 按风险路由（高风险 → Claude Code；小功能 → Codex） | GLM-5.3 Flash / DeepSeek V4.1 Flash | high         |

- 当时的方案让 Lib Coder、Biz Coder 使用 Codex CLI + DeepSeek V4.1 Flash，Manager、Designer 使用 Claude Code + GLM-5.3 Flash。
- Reviewer 当时按风险路由：Claude Code 主审高风险变更，Codex CLI 负责独立小功能。当前路由和替代执行体记录方式见 herdr-agents skill 与 Task Packet。
- 模型和思考强度当时只是建议，不是强制值。Manager 可以按任务和接入层配置调整。
- 模型路由和思考强度的实际配置属于执行体接入层，不在本仓库版本控制内；仓库只记录选择原则。

### 2. 历史思考强度推荐分档

low、high、max 表达推理深度的建议起点，不是强制配置。Manager 可以按任务和接入层实际情况调整。

当时的分档理由如下：

- **Manager（high）**：多包协同、依赖冲突和风险预判需要完整推理链。编排是低频调用，速度影响可以忽略。
- **Designer（max）**：设计规范和组件标准是业务开发的起点，需要尽早覆盖场景边界、交互细节和跨端差异。项目周期很紧且需求简单明确时，可下调至 high。
- **Lib Coder（max）**：lib 层是公共基础，兼容性、工程稳定性和跨端适配会影响所有业务代码。只是简单组件迭代、工具函数新增或样式微调时，可下调至 high。
- **Biz Coder（low）**：业务开发基于已封装的标准组件和 API，low 档减少额外推理，保留需求理解和标准逻辑映射，不鼓励过度封装或重复造轮子。涉及复杂交互或核心资金、权限链路时，推荐上调至 high。
- **Reviewer（high，历史）**：需要同时检查产品匹配度、代码规范和依赖合规。max 档速度较慢，不适合批量评审；low 档容易漏掉规范和逻辑问题。

### 3. 历史调整规则

- 模型与思考强度的调整不视为偏离执行体绑定，Manager 可按任务直接选择。
- 过去建议在 Task Packet 记录 `Effort`；现在它不是必填字段。
- 执行体不可用时的替代记录规则沿用 ADR-0010；替代执行体的模型与思考强度按任务需要选择。

## 后果

- 当前 Role 到 executor 的表和启动参数见 [`.agents/skills/herdr-agents/SKILL.md`](../../.agents/skills/herdr-agents/SKILL.md)；模型与思考强度不设 Role 默认。
- `scripts/validate-context.mjs` 不再检查角色执行体自述或绑定镜像，只检查通用 context 路由、链接、frontmatter、出处和软链。
- `docs/agents/task-packet.md` 不要求 `Effort` 字段；Manager 可在 Coordination 摘要或 handoff 中按需记录选择。

## 替代方案

- **全角色统一 max**：质量最稳，但批量业务交付与评审的速度成本不可接受；不采用。
- **不设默认档位，逐任务自由选择**：灵活，但没有稳定预期，实际执行会漂移回单一档位；不采用。
- **把模型绑定写进仓库配置**：模型路由属于执行体接入层职责，仓库记录契约即可，配置进仓会在换模型时产生无意义的 diff 噪音；不采用。
