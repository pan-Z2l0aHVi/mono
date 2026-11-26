# 验证选择与测试执行

本文件规定验证的两道门槛（实施期聚焦验证与推送前全量 `check`）、flaky 与性能取证口径，以及测试命令的非显然边界。运行时取证见 [`runtime-verification.md`](./runtime-verification.md)，浏览器进程与 profile 归属见 [`browser-resources.md`](./browser-resources.md)，用例策略见 [`test-authoring`](../../.agents/skills/test-authoring/SKILL.md)，生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)。

## 推送前本地全量 check 门

请求推送分支、创建或更新 PR 前，以 [`ci.yml`](../../.github/workflows/ci.yml) 的 `check` job 为权威清单，在本地**全量**跑通其中本机可执行的全部检查并全部退出 `0`，不做按“改动相关性”的裁剪；修复失败产生新改动后，重跑至最终待推送状态全绿。

工具与钩子不会自动覆盖的边界：

- **已跟踪面复跑**：`test-scripts`、`check-context`、`check-policy` 只扫 Git 已跟踪文件（`git ls-files`）；新增脚本、测试或文档进入跟踪面（暂存或提交）后须重跑，未跟踪态通过不算数。
- **远端基准面校验**：`pre-commit` 不覆盖全量 `check` 也不跑 `check-changeset`；推送前以当前 `origin/main` 与 `HEAD` 本地跑通 `check-changeset`。
- **稀疏检出先还原**：实施期启用过 [`apps-sparse-checkout`](../../.agents/skills/apps-sparse-checkout/SKILL.md) 时，推送前先 `--restore` 恢复全树再跑全量 `check`。
- **唯一跳过例外**：仅本机确实缺少某项 CI 专属运行时（如跨平台工具链或无头浏览器）时可跳过该单项，并在交付记录与推送授权中逐项列出未跑项与原因。

## 从变更路径到验证计划

实施迭代期先查 diff、公共契约与消费者，按受影响闭包收窄 `turbo --filter` 与聚焦测试以快速反馈（边界不明时跑全量）；此收窄仅用于开发循环，推送远端前仍须过[`推送前本地全量 check 门`](#推送前本地全量-check-门)。

涉及前端运行时的改动，进入创建 PR 与合并前先按 [`runtime-verification.md`](./runtime-verification.md#前端冒烟门) 通过前端冒烟。冒烟与按影响选择的真实 E2E / 真机验收和自动化 `check` 互补、互不替代。

交付记录写清实际运行的命令、结果与浏览器操作；失败时保留原始输出，区分环境故障、既有失败与本次回归。远端 PR CI 对当前 base/head 的 required checks 是远端复验，不替代本地全量证据。超时或重试失败先按证据修根因，调整上限须按 [`workflow.md#预授权操作`](./workflow.md#预授权操作) 取得授权。

## Flaky 调查与性能对比

- **Flaky 调查**：逐项记录原始错误、代码输入、环境、失败阶段与结论。根因修复须关联失败机制并提供复现、回归或反向验证（无法重放时明说间接证据与局限）。原因未明的历史失败保持“未查明”，复跑或换 head 变绿不结案；有限运行不证明永久零 flaky，存在未查明失败时不声明根因已消除。
- **异步失败取证**：保留阶段、耗时、最终条件读数与原始错误，区分组件未完成、完成信号缺失与调度停顿；诊断本身的失败单独标识，不覆盖原始失败。测试完成信号与隔离见 [`test-authoring`](../../.agents/skills/test-authoring/SKILL.md#异步完成与隔离)。
- **性能对比**：记录任务、文件与用例数、代码状态、命令、重复次数、机器、并发及缓存策略；逐层核对缓存后再声明实际重跑范围。同条件下比较墙钟中位数与波动并保留失败样本；不同负载、缓存或输入的差异不归因为优化，累计 CPU 时间不充当墙钟提速。

## 提交前的运行时资源核对

任务中启动过任何浏览器（含非 UI 调研、截图、下载或经 MCP / CLI 间接驱动）时，提交前均按 [`browser-resources.md`](./browser-resources.md) 核对归属、profile 与回收；无法唯一确认归属时按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得授权确认目标，或列为未完成，不记作已回收。

## 测试环境与命令

- **Vitest 与聚焦单测**：根 `pnpm run test` 由 Turbo 编排；受影响包用 `pnpm exec turbo test --filter=@greypan/<name>`；单个 spec 用 `pnpm exec vp test run <路径>`，以 `Test Files 1 passed (1)` 为准。不要用 `pnpm run test -- <路径>`：参数会透传给所有包，未匹配的包直接失败。
- **仓库脚本测试**：`*.test.mjs` 由 `pnpm run test-scripts` 执行，不在 `pnpm run test` 内；未跟踪的新脚本测试在实施期直接用 `node <路径>` 运行（完成行契约见 [`script-policy.md`](./script-policy.md#测试)）。
- **测试层职责**：`web-ui` 用 jsdom 覆盖宿主 API 与渲染语义、用 browser mode 覆盖原生浏览器行为；各文档 demo 分别维护 jsdom 与浏览器层；`browser-kit` 经 `@greypan/test-kit` 使用 MSW。共享浏览器状态的 spec 保持独立；全局 setup 只做公共准备，catalog、生成文档与应用启动在集成 spec hook 内显式等待。
- **网格列数基线**：文档 demo 的网格列数由各自浏览器 spec 钉住，守 Tailwind v4 自定义变体排序陷阱（具体视口与列数见 spec）。

## 本地复现与浏览器 spec 隔离

- **慢环境复现**：负载进程 PID 写入文件，结束后 `kill` 并用 `ps` 验证退出，不依赖 shell job 控制。
- **CI 虚拟光标隔离**：无头浏览器虚拟光标停在视口左上角，隐藏 overlay 时易触发 phantom hover；不模拟真实指针的 `*.browser.spec.ts` 须隔离 `pointer-events`（见 spec helper）。
- **本机未复现的 CI 红**：复跑同一 spec 全绿时按“未复现”记录复跑次数与 base/head，不拉高并发或无依据改动逼绿；未复现既不证明缺陷存在也不证明不存在。
