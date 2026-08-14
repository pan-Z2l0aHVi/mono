# Agent Context Benchmark

本文件定义最小的 context engineering 评测集。它不是产品测试，也不要求每次源码变更都运行；用于比较 context 路由、工具接口和 Agent 实际执行质量。

## 评测原则

- 让 Agent 先使用最小入口，再根据工具输出渐进加载证据；不要要求它预读整个仓库。
- 以当前源码、manifest、测试和配置作为结果事实；文档只评估能否正确路由。
- 记录首次完成率，而不只记录最终是否能完成；失败要区分导航、范围、实现、验证和环境原因。
- 记录 context/tool 使用量，避免用新增规则换取表面成功率。

## 最小任务集

| ID | 任务 | 主要能力 | 预期首个工具/入口 |
|---|---|---|---|
| C01 | 修改 `js-kit` 一个局部 utility | 局部导航、最小 context | 根/包级 `AGENTS.md`、源码、邻近测试 |
| C02 | 修改 `browser-kit` 浏览器 API | runtime 边界 | `packages/browser-kit/AGENTS.md`、源码/测试 |
| C03 | 修改一个 `web-ui` 组件属性或事件 | 公共契约、跨框架影响 | `repo:route` 或 `repo:impact` |
| C04 | 修改 `web-ui` React/Vue 类型 | 类型契约、消费端 | `repo:route`、ADR-0011、type fixtures |
| C05 | 修改 overlay/focus/portal 行为 | 浏览器语义和分层 | `repo:route`、ADR-0005/0006、browser tests |
| C06 | 修改 workspace catalog 或 tsconfig profile | 传递影响、构建风险 | `repo:verify`、manifest/继承者 |
| C07 | 修改 Weave Go/Wails API | 跨语言和生成物边界 | Weave AGENTS、Wails 3 文档、Go tests |
| C08 | 修改 Weave MCP 或领域模型 | 术语和长期决策 | ADR-0013-0016、Go tests、frontend consumer |
| C09 | 修改构建/发布配置 | release safety | `repo:verify`、build guide、workflow/manifest |
| C10 | 处理生成文件中的错误 | source-of-truth 定位 | 根 AGENTS、generator/config/source |

## 每次记录

```text
任务 ID / Agent / 模型版本 / commit 基线
首次读取的文件和工具
是否调用 repo:route / impact / verify
是否误读或修改生成物
受影响 workspace 是否完整
是否遗漏公共契约或消费者
验证选择是否与 repo:verify 一致
首次成功 / 返工次数 / 总耗时 / token 或 context 用量
未解决风险和人工介入原因
```

## 通过标准

单任务不以“最终有人修好”为通过。建议把以下指标作为 release 前后的对比基线：

- 首次成功率 ≥ 90%
- 生成物误改率 = 0%
- 公共契约消费者遗漏率 ≤ 5%
- 验证选择正确率 ≥ 90%
- 平均首次读取上下文不超过任务实际所需的两层

这些是评测目标，不是当前仓库已经达成的事实；需要真实 Agent runs 才能确认。
