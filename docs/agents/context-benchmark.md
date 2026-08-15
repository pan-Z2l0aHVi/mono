# Agent Context 真实任务评测

本文件定义 C01–C10 的最小 context engineering 评测集和比较口径。它不是产品测试，也不要求每次源码变更都运行；它用于比较 context 路由、工具接口和 Agent 的实际执行质量。

真实运行必须由外部 evaluation harness 保存原始 trace、环境信息和 telemetry。本仓库不提供评测 runner、JSONL runner 或历史结果目录：手工填写记录无法证明模型、耗时和 token 使用，也不应被当作可重复的产品验证。

## 评测原则

- 让 Agent 先使用最小入口，再根据 `find:usages` 和任务事实渐进加载证据；不要要求它预读整个仓库。
- 以当前源码、manifest、测试和配置作为结果事实；文档只评估能否正确路由。
- 记录首次完成率，而不只记录最终是否能完成；失败要区分导航、范围、实现、验证和环境原因。
- 记录 context/tool 使用量，避免用新增规则换取表面成功率。
- 评测中不得把人工补救、未运行的 generator 或缺少浏览器验证误记为 Agent 首次成功。

## 最小任务集

| ID  | 任务                                       | 主要能力               | 预期首个工具/入口                              |
| --- | ------------------------------------------ | ---------------------- | ---------------------------------------------- |
| C01 | 修改 `js-kit` 一个局部 utility             | 局部导航、最小 context | 根/包级 `AGENTS.md`、源码、邻近测试            |
| C02 | 修改 `browser-kit` 浏览器 API              | runtime 边界           | `packages/browser-kit/AGENTS.md`、源码/测试    |
| C03 | 修改一个 `web-ui` 组件属性或事件           | 公共契约、跨框架影响   | `find:usages`                                  |
| C04 | 修改 `web-ui` React/Vue 类型               | 类型契约、消费端       | `find:usages`、ADR-0011、type fixtures         |
| C05 | 修改 overlay/focus/portal 行为             | 浏览器语义和分层       | `find:usages`、ADR-0005/0006、browser tests    |
| C06 | 修改 workspace catalog 或 tsconfig profile | 传递影响、构建风险     | `find:usages`、manifest/继承者                 |
| C07 | 修改 Interweave Go/Wails API               | 跨语言和生成物边界     | Interweave `AGENTS.md`、Wails 3 文档、Go tests |
| C08 | 修改 Interweave MCP 或领域模型             | 术语和长期决策         | Interweave `AGENTS.md`、Go tests、frontend consumer |
| C09 | 修改构建/发布配置                          | release safety         | `find:usages`、build guide、workflow/manifest  |
| C10 | 处理生成文件中的错误                       | source-of-truth 定位   | 根 `AGENTS.md`、generator/config/source        |

## 外部 harness 必须记录的字段

| 类别     | 必填记录                                                                                    |
| -------- | ------------------------------------------------------------------------------------------- |
| 运行身份 | `taskId`、Agent/模型精确标识、harness 版本、运行时间、基线 commit                           |
| 首次尝试 | `firstPass`、重试次数、最终状态，以及导航/范围/实现/验证/环境失败分类                       |
| 用量     | wall-clock 时间、input/output tokens（若客户端可提供）、实际读取的 context 文件和调用的工具 |
| 变更     | 修改文件、是否手改生成物、是否触及公共契约或消费者                                          |
| 验证     | 实际命令及结果、生成器执行证据、真实浏览器验证的 URL/步骤/console/network 结果（适用时）    |
| 风险     | 未验证缺口、基线失败和需要人工判断的架构取舍                                                |

未知 telemetry 应明确记录为 unavailable，并带上原因；不得伪造为 `0` 或将手工补救归因给 Agent。

## 通过标准

单任务不以“最终有人修好”为通过。建议把以下指标作为 release 前后的对比基线：

- 首次成功率 ≥ 90%
- 生成物误改率 = 0%
- 公共契约消费者遗漏率 ≤ 5%
- 验证选择正确率 ≥ 90%
- 平均首次读取上下文不超过任务实际所需的两层

这些是评测目标，不是当前仓库已经达成的事实；需要由外部 harness 的真实 Agent runs 确认。
