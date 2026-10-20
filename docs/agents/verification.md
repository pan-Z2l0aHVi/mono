# 验证选择与测试执行

本文件回答两个问题：这次改动该跑哪些验证，以及那些验证怎么执行。运行时证据本身怎么取（真实浏览器、原生应用、引擎级取证、证据档位）由 [`runtime-verification.md`](./runtime-verification.md) 承担；测试用例编写策略见 [`.agents/skills/test-authoring/SKILL.md`](../../.agents/skills/test-authoring/SKILL.md)；受版本控制的生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)，其完成证据见 build.md。

## 从变更路径到验证计划

先查实际 diff、公共契约和消费者，再选择验证方式；不要从固定的命令清单出发。适用的自动化回归与构建应在实施阶段完成，不能把首次全量运行留给 PR CI。小步提交按影响重跑相关项，不要求每次重复全量命令。

按变更影响选择层级：受影响的包测试、必要的全量 workspace 测试、仓库脚本测试、构建，以及该变更要求的真实 E2E、探索式或真机验收。纯文档等低风险变更按影响选择，不强加全套。根 `pnpm run test` 包含已配置的 Vitest Browser Mode / Chromium 自动回归，这些 spec 不等于真实 E2E、探索式或真机验收。

PR CI 对当前 base/head 复检 required checks，不替代实施阶段已要求的单元、全量 workspace 或脚本测试。记录准确命令、结果、浏览器 URL / 操作和未验证缺口；失败时保留输出，区分环境问题、现有失败和本次回归，不要用删除测试或跳过检查代替修复。

## 测试环境与命令

测试框架是 Vitest（通过 `vite-plus`）。根 `pnpm run test` 由 Turbo 编排各 workspace 的 `test` 任务；受影响的包用 `pnpm exec turbo test --filter=@greypan/<name>`。仓库脚本测试是 tracked-only 的 `*.test.mjs`，由 `pnpm test-scripts` 执行，不属于 `pnpm run test`；新增而未跟踪的脚本测试要在实施中显式运行。

要收窄到个别 spec 时，直接跑 `pnpm exec vp test run <路径>`（相对与绝对路径都按路径过滤，以输出 `Test Files 1 passed (1)` 为准）。不要写成 `pnpm run test -- <路径>`：workspace 包的 `test` 脚本本身就是 `vp test run`，而 `pnpm run test` 这一层不透传参数，实测会照常跑整包的 spec 并返回 0，看起来像「收窄的那一档绿了」。判断收窄有没有发生，以输出里的 `Test Files` 计数为准，不以传了什么参数为准。

各包的具体测试环境以包配置和测试文件为准：`web-ui` 用 jsdom 覆盖宿主 API、属性/事件、渲染与非浏览器 DOM 语义，用 browser mode 覆盖 jsdom 无法忠实实现的浏览器原生行为；两个 demo 各有 jsdom 接线层与浏览器层，后者用真实视口验证对齐与几何。`browser-kit` 通过 `@greypan/test-kit` 使用 MSW；共享浏览器状态要求相关 spec 保持独立，除非移除了共享状态，否则不要重新启用文件并行。

Demo 的网格列数基线由各自的 `grid-columns.browser.spec.*` 钉住，守的是 Tailwind v4 自定义变体的排序陷阱；具体视口与列数见 spec。生成物清单见 [`generated-artifacts.md`](./generated-artifacts.md)，语料与缓存输入见 build.md。

## 本地复现与浏览器 spec 隔离

本地复现慢环境时，把负载进程 PID 显式写入文件并在结束后 `kill`，用 `ps` 验证退出；不要依赖 shell job 控制。CI 无头浏览器的虚拟光标固定在视口左上角，隐藏 overlay 时可能触发 phantom hover；直接驱动组件状态、不模拟真实指针的 `*.browser.spec.ts` 应隔离 pointer-events，具体做法见相应 spec 的 helper。

CI 上的红在本机复跑同一条 spec 就绿时，按未复现处置：报告里写明复跑了几次、当时的 base 与 head，不用提高并发或反复加压来反推它是真实回归，也不为让它变绿去改无关代码。加压复现不是判据——复现不出来只说明那种加压达不到触发条件，证不了缺陷不存在，也证不了它存在。
