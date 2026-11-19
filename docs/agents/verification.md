# 验证选择与测试执行

本文件回答：这次改动该跑哪些验证、怎么执行。运行时证据怎么取（真实浏览器、原生应用、引擎级取证、证据档位）由 [`runtime-verification.md`](./runtime-verification.md) 承担，浏览器进程与 profile 的归属和回收见 [`browser-resources.md`](./browser-resources.md)；测试用例策略见 [test-authoring](../../.agents/skills/test-authoring/SKILL.md)，生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)。

## 从变更路径到验证计划

先查实际 diff、公共契约和消费者，再选验证层。单包内部改动跑该包测试、类型检查和构建；跨包、公共契约、根配置、CI 或影响面无法判断时，跑受影响闭包，必要时全量。适用的自动化回归与构建应在实施阶段完成。不跑全量时，记录选择依据与未覆盖层。代码变化后须重跑；失败时修复并重跑。

涉及前端运行时的改动，在进入创建 PR 与合并流程之前，先按 [`runtime-verification.md`](./runtime-verification.md#前端冒烟门) 完成前端冒烟并全部通过。冒烟不替代本节选择的测试层。

根 `pnpm run test` 覆盖全部已配置的自动化测试层（含浏览器模式回归），但不等于真实 E2E、探索式或真机验收，后者按变更影响另行选择。记录准确命令、结果、浏览器 URL / 操作和未验证缺口；失败时保留输出，区分环境问题、现有失败和本次回归，不用删除测试或跳过检查代替修复。PR CI 对当前 base/head 复检 required checks，不替代本地证据。

超时或重试导致失败时，先按证据修复原因，不得靠放宽上限绕过；授权要求见 [workflow.md#预授权操作](./workflow.md#预授权操作)。

## Flaky 调查与性能对比

实际发生的间歇失败逐项记录原始错误、代码输入、环境、失败阶段、调查与当前结论。根因修复须把失败机制与修改关联，并提供能区分该机制的复现、回归或反向验证；原故障无法重放时说明间接证据和局限。历史失败原因未知时保持“未查明”，复跑通过或换 head 后通过不能将其结案。

异步失败保留当前阶段、各阶段耗时、最终条件读数及原始错误，区分组件未完成、完成信号缺失和调度停顿；诊断本身的失败单独标识，不覆盖被测操作的原始失败。测试完成和隔离的写法由 [test-authoring](../../.agents/skills/test-authoring/SKILL.md#异步完成与隔离) 负责。

重复运行与性能对比记录任务、文件与用例数、代码状态、命令、重复次数、机器、并发及缓存策略；强制执行测试任务仍可能复用缓存，逐层核对后再声明实际重跑范围。相同条件下比较墙钟中位数及波动，保留失败样本；不同负载、缓存或代码输入的差异不能直接归因为优化，阶段累计 CPU 时间不能当墙钟提速。

交付记录列出已修复根因、经证据保留的审计项和仍未查明的历史失败。有限运行不能证明永久零 flaky；存在未查明的实际失败时，不声明全部根因已消除。

## 提交前的运行时资源核对

只要任务启动过浏览器——包括非 UI 的调研、截图、下载或经 MCP / CLI 间接驱动——提交前都要按 [`browser-resources.md`](./browser-resources.md) 核对归属、profile 与回收。无法唯一确认归属时不要猜测，按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得授权并确认目标，或把清理列为未完成，不得记作已回收。

## 测试环境与命令

测试框架是 Vitest。根 `pnpm run test` 由 Turbo 编排 workspace 的 `test`；受影响包用 `pnpm exec turbo test --filter=@greypan/<name>`。仓库脚本测试是 tracked-only 的 `*.test.mjs`，由 `pnpm test-scripts` 执行，不在 `pnpm run test` 内；新增未跟踪的脚本测试要在实施中显式运行。涉及 `apps/{react,vue}-web-ui-demo` 的 `src/generated/**` 或页面目录改动，全 checkout 验证必须显式运行 `pnpm run check-generated-parity`（CI 在 Build 之前跑同一任务）。

收窄到个别 spec 时直接跑 `pnpm exec vp test run <路径>`，以输出 `Test Files 1 passed (1)` 为准。不要写成 `pnpm run test -- <路径>`：根 `test` 是 `turbo test`，`--` 后的参数会透传给每个包，没匹配到测试文件的包直接失败。

测试环境以包配置和测试文件为准：`web-ui` 用 jsdom 覆盖宿主 API、属性/事件与渲染语义，用 browser mode 覆盖原生浏览器行为；文档 demo 各自维护 jsdom 接线层与浏览器层。`browser-kit` 通过 `@greypan/test-kit` 使用 MSW；共享浏览器状态要求相关 spec 保持独立。全局 setup 只承担共同的环境准备；真实 catalog、生成文档与应用启动等初始化由集成 spec 在 hook 内显式等待，收窄 setup 时逐文件核对初始状态与清理责任。

文档 demo 的网格列数基线由各自浏览器测试钉住，守的是 Tailwind v4 自定义变体的排序陷阱；具体视口与列数见 spec。

## 本地复现与浏览器 spec 隔离

本地复现慢环境时，把负载进程 PID 写入文件并在结束后 `kill`，用 `ps` 验证退出，不依赖 shell job 控制。CI 无头浏览器的虚拟光标固定在视口左上角，隐藏 overlay 时可能触发 phantom hover；直接驱动组件状态、不模拟真实指针的 `*.browser.spec.ts` 应隔离 pointer-events，做法见 spec 的 helper。

CI 上的红在本机复跑同一条 spec 就绿时按未复现处置：报告写明复跑次数与当时的 base、head，不靠提高并发或反复加压反推真实回归，也不为让它变绿改无关代码；复现不出来只说明没达到触发条件，不构成缺陷存在或不存在的证据。
