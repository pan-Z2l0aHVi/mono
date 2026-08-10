# Agent Harness Eval

本目录维护用于校准 context 路由、工作区边界和验证证据的最小代表任务集。它不是产品测试，也不替代真实浏览器验证或 CI。任务定义固定 baseline、fixture、oracle 和修改边界；没有实际 run artifact 时，不得声称已经形成可比较 baseline。

## 运行方式

1. 从任务指定的 baseline commit 创建独立 task worktree；并行 agent 不得共用会被切换分支的工作目录。
2. 对 implementation task，按 [`fixtures/README.md`](fixtures/README.md) 在临时 task worktree 应用 fixture；先记录 baseline 的预期失败或初始状态。
3. 将任务文件中的“提示”原样交给 Codex 或 Claude Code，不额外粘贴仓库规则。
4. 使用 [`runs/TEMPLATE.md`](runs/TEMPLATE.md) 记录首轮 context、计划、修改范围、oracle、命令、浏览器证据、review evidence、逐项评分和残余风险。
5. 修改 instruction、rule、skill、agent profile 或 workflow 后，至少回放受影响类别和一个跨类别任务。

## 任务索引

| 任务                                                       | 类型                   | 固定 baseline / fixture         | 主要路由                        |
| ---------------------------------------------------------- | ---------------------- | ------------------------------- | ------------------------------- |
| [01 URL Hash 顺序修复](tasks/01-local-source-fix.md)       | 局部 TypeScript        | 03c2c27 + failure patch         | code-style、testing             |
| [02 Portal Select Escape 焦点](tasks/02-web-ui-browser.md) | UI/browser             | 03c2c27 + browser failure patch | web-ui、browser-verification    |
| [03 Select 事件契约报告](tasks/03-public-contract.md)      | API analysis           | 03c2c27 + fixed request/oracle  | contract-change-review          |
| [04 请求记录类型影响](tasks/04-cross-package-impact.md)    | cross-package analysis | 03c2c27 + fixed request/oracle  | CONTEXT、contract-change-review |
| [05 Select Escape 测试](tasks/05-test-addition.md)         | test addition          | 03c2c27 + golden patch          | testing                         |
| [06 Turbo output 调查](tasks/06-build-config.md)           | build analysis         | 03c2c27 + fixed request/oracle  | build                           |
| [07 vite-plus 策略调查](tasks/07-dependency-policy.md)     | dependency analysis    | 03c2c27 + fixed request/oracle  | dep-management、dependencies    |
| [08 固定提交独立 Review](tasks/08-independent-review.md)   | review                 | b02c0de..f1ace01                | review-checklist、reviewer      |

## 评分 rubric

每项 0–2 分必须按下面行为锚点评分，不允许只给总分：

| 维度 | 0 分                                           | 1 分                                           | 2 分                                         |
| ---- | ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| 路由 | 读取大量无关 context，遗漏命中指令或事实来源   | 读取主要 context，但有一处遗漏或过度加载       | 读取最小且完整的命中 context，并说明事实来源 |
| 范围 | 修改禁止文件、越过 worktree 或无法说明影响范围 | 大体在范围内，但有一处无关改动或边界说明不完整 | 只修改允许范围，且能用 diff 证明             |
| 实现 | 未满足固定 oracle，或没有可比较结果            | 满足主路径但遗漏一个固定边界/兼容要求          | 满足全部固定 oracle，并保持未声明行为不变    |
| 验证 | 没有验证，或只说“应该可以”                     | 完成部分验证，但遗漏契约要求的高风险层级       | 完成全部最低验证，并记录命令、结果和缺口     |
| 交付 | 没有结果、证据或风险报告                       | 有报告但字段不全、不可复核或理由不足           | 报告完整，第三方可根据记录复核结论           |

### 评分规则

- 评分者：由未参与该次实施的 reviewer 评分；只有一名评分者时仍必须填写理由。
- 分歧：任意维度相差 2 分时，第二名 reviewer 复核该维度；最终记录两次评分、分歧理由和裁决者。
- 合格线：总分至少 8/10，且“范围”和“验证”不得为 0；否则任务不通过。
- 跨 client 比较必须使用同一任务文件、同一 baseline、同一 fixture setup 和同一 rubric；不得比较不同任务的总分。

## Run artifact

每次执行保存到：

```text
docs/agents/evals/runs/<YYYY-MM-DD>/<task-id>-<client>.md
```

运行记录必须包含 baseline commit、client/model、首轮 context、修改文件、命令与结果、reviewer、逐项评分与理由、评分分歧和残余风险。独立 review 必须引用 reviewer worktree 中的 evidence artifact，并通过 `pnpm check:agent-review`；无法执行时写 `not executed`，不得伪造独立 review。
