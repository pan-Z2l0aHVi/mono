# 验证选择与测试执行

本文件回答两个问题：这次改动该跑哪些验证，以及那些验证怎么执行。运行时证据本身怎么取（真实浏览器、原生应用、引擎级取证、证据档位）由 [`runtime-verification.md`](./runtime-verification.md) 承担；浏览器进程与 profile 的归属和回收由 [`browser-resources.md`](./browser-resources.md) 承担；测试用例编写策略见 [`.agents/skills/test-authoring/SKILL.md`](../../.agents/skills/test-authoring/SKILL.md)；受版本控制的生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)。

## 从变更路径到验证计划

先查实际 diff、公共契约和消费者，再选择验证方式；不要从固定的命令清单出发。适用的自动化回归与构建应在实施阶段完成，不能把首次全量运行留给 PR CI。小步提交按影响重跑相关项，不要求每次重复全量命令。

按变更影响选择层级：受影响的包测试、必要的全量 workspace 测试、仓库脚本测试、构建，以及该变更要求的真实 E2E、探索式或真机验收。纯文档等低风险变更按影响选择，不强加全套。根 `pnpm run test` 包含已配置的 Vitest Browser Mode / Chromium 自动回归，这些 spec 不等于真实 E2E、探索式或真机验收。

PR CI 对当前 base/head 复检 required checks，不替代实施阶段已要求的单元、全量 workspace 或脚本测试。记录准确命令、结果、浏览器 URL / 操作和未验证缺口；失败时保留输出，区分环境问题、现有失败和本次回归，不要用删除测试或跳过检查代替修复。

超时或重试导致失败时，先按证据修复原因，不得靠放宽上限绕过；授权要求见 [workflow.md#预授权操作](./workflow.md#预授权操作)。

## Flaky 调查与性能对比

实际发生的间歇失败逐项记录原始错误、代码输入、环境、失败阶段、调查与当前结论。根因修复须把失败机制与修改关联，并提供能区分该机制的复现、回归或反向验证。只有静态风险得到修复时，结论限于该风险；原故障无法重放时说明间接证据和局限。历史失败原因未知时保持“未查明”，复跑通过或换 head 后通过不能将其结案。

异步失败保留当前阶段、各阶段耗时、最终条件读数及原始错误，区分组件未完成、完成信号缺失和调度停顿。诊断本身的失败单独标识，不覆盖被测操作的原始失败。测试完成和隔离的写法由 [test-authoring](../../.agents/skills/test-authoring/SKILL.md#异步完成与隔离) 负责。

重复运行与性能对比记录实际执行的任务、文件和用例数、代码状态、命令、重复次数、机器、并发及缓存策略。强制执行测试任务仍可能复用构建或语言测试结果缓存，逐层核对后再声明实际重跑范围。相同条件下比较墙钟中位数及波动，保留失败样本及其原因；不同负载、缓存或代码输入的差异不能直接归因为优化。阶段累计 CPU 时间和并发文件耗时不能相加当墙钟提速。

交付记录列出已修复根因、经证据确认保留的审计项和仍未查明的历史失败。有限运行不能证明未来永久零 flaky；存在未查明的实际失败时，不声明全部根因已消除。

## 提交前的运行时资源核对

只要任务启动过浏览器——包括非 UI 的调研、截图、下载或经 MCP / CLI 间接驱动——提交前都要按 [`browser-resources.md`](./browser-resources.md) 核对：

- 按 [`browser-resources.md`](./browser-resources.md) 的启动记录与归属核验，记录 worktree、启动器 PID / CWD、浏览器 PID / PPID 与专用 profile；再记录实例总数与峰值并发，同一实例跨多次验证复用只计一次。额外实例注明原因和不再需要它的时点。
- 每个实例记录专用 profile、浏览器 PID / PPID、关闭方式与退出核验结果；没有启动浏览器时写「不适用」。
- 测试运行器管理的浏览器按 [`browser-resources.md`](./browser-resources.md) 只记录命令与残留核验，不按实例计数。
- 无法唯一确认归属时不要猜测回收；按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得授权并确认目标，或把清理列为未完成。不得把无法确认的进程记作已回收。

## 测试环境与命令

测试框架是 Vitest（通过 `vite-plus`）。根 `pnpm run test` 由 Turbo 编排各 workspace 的 `test` 任务；受影响的包用 `pnpm exec turbo test --filter=@greypan/<name>`。仓库脚本测试是 tracked-only 的 `*.test.mjs`，由 `pnpm test-scripts` 执行，不属于 `pnpm run test`；新增而未跟踪的脚本测试要在实施中显式运行。

要收窄到个别 spec 时，直接跑 `pnpm exec vp test run <路径>`（相对与绝对路径都按路径过滤，以输出 `Test Files 1 passed (1)` 为准）。不要写成 `pnpm run test -- <路径>`：workspace 包的 `test` 脚本本身就是 `vp test run`，而 `pnpm run test` 这一层不透传参数，实测会照常跑整包的 spec 并返回 0，看起来像「收窄的那一档绿了」。判断收窄有没有发生，以输出里的 `Test Files` 计数为准，不以传了什么参数为准。

各包的具体测试环境以包配置和测试文件为准：`web-ui` 用 jsdom 覆盖宿主 API、属性/事件、渲染与非浏览器 DOM 语义，用 browser mode 覆盖 jsdom 无法忠实实现的浏览器原生行为；两个 demo 各有 jsdom 接线层与浏览器层，后者用真实视口验证对齐与几何。`browser-kit` 通过 `@greypan/test-kit` 使用 MSW；共享浏览器状态要求相关 spec 保持独立，除非移除了共享状态，否则不要重新启用文件并行。

全局 setup 只承担各 spec 共同需要的环境准备。真实 catalog、生成文档和应用启动等业务初始化，由依赖它的集成 spec 在自己的 hook 内显式等待；使用 factory 或注入依赖的单元测试不应因此加载真实应用状态。收窄 setup 时逐文件核对初始状态和清理责任，保留集成测试所需的真实初始化，不把它移出 hook 预算来规避超时。

Demo 的网格列数基线由各自的 `grid-columns.browser.spec.*` 钉住，守的是 Tailwind v4 自定义变体的排序陷阱；具体视口与列数见 spec。生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)。

## 本地复现与浏览器 spec 隔离

本地复现慢环境时，把负载进程 PID 显式写入文件并在结束后 `kill`，用 `ps` 验证退出；不要依赖 shell job 控制。CI 无头浏览器的虚拟光标固定在视口左上角，隐藏 overlay 时可能触发 phantom hover；直接驱动组件状态、不模拟真实指针的 `*.browser.spec.ts` 应隔离 pointer-events，具体做法见相应 spec 的 helper。

CI 上的红在本机复跑同一条 spec 就绿时，按未复现处置：报告里写明复跑了几次、当时的 base 与 head，不用提高并发或反复加压来反推它是真实回归，也不为让它变绿去改无关代码。加压复现不是判据——复现不出来只说明那种加压达不到触发条件，证不了缺陷不存在，也证不了它存在。
