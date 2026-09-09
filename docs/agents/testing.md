# 测试

- **测试框架**：Vitest（通过 `vite-plus`）
- **运行所有测试**：`pnpm run test`（根 `turbo test` 编排所有 workspace `test` 任务；已配置的 browser-mode package 会在此命令中运行 Chromium `*.browser.spec.ts`）
- **运行受影响测试**：`pnpm run test:affected`（通过 `turbo test --filter="...[origin/main]"` 仅运行发生变更的包及其直接依赖的测试；过滤基于 `origin/main`，基线过期时先 fetch）。迭代与调试默认使用本命令或包级聚焦测试；全量 `pnpm run test` 留到最终提交确认前。
- **运行单个包的测试**：`pnpm --filter @greypan/<name> test`（执行 `vp test run`）
- **测试文件**：`*.spec.ts`、`*.test.ts`、`*.spec.tsx`
- **Demo 应用**：`react-web-ui-demo` 和 `vue-web-ui-demo` 目前没有维护的单元测试套件，因此不包含测试脚本、Vite 测试配置和 `tsconfig.vitest.json`。请在真实浏览器中验证 demo 行为。
- **测试环境**：大多数包使用 Node 环境。`browser-kit` 使用 Vitest Browser Mode 配合 Playwright Chromium 进行真实浏览器测试。
- **`web-ui` 测试环境**：使用 jsdom，`packages/web-ui/test-helper.ts` 对 jsdom 未实现的浏览器 API 进行桩处理。桩处理了 `window.scrollTo` 和 `Element#scrollTo`；组件测试断言公共的滚动调用，而浏览器验证覆盖原生滚动行为。
- **`web-ui` jsdom 契约测试**：默认的 `*.spec.ts` 文件在独立的 `jsdom` 项目中运行，覆盖宿主 API、属性/属性同步、事件、渲染以及非浏览器 DOM 语义。测试工具不应将 jsdom 视为 ElementInternals 实现。
- **`web-ui` browser mode**：仅显式的 `*.browser.spec.ts` 文件通过 `@vitest/browser-playwright` + `playwright` 在 Chromium 中运行。此层级用于 FormData、ElementInternals、Pointer events、焦点、portal、原生 dialog 以及其他 jsdom 无法忠实实现的浏览器原生行为。
- **`web-ui` reduced-motion browser mode**：`reduced-motion.browser.spec.ts` 文件在独立的 Chromium 项目中运行，使用 Playwright `reducedMotion: 'reduce'`。此层级用于验证 transform 位移被移除的同时，基于 opacity 的状态反馈仍然可用。
- **网络模拟**：`browser-kit` 通过 `@greypan/test-kit` 使用 MSW（Mock Service Worker）进行网络请求拦截。其 tracker spec 共享浏览器全局变量和一个 service worker，因此该包禁用了 Vitest 文件并行；保持这些 spec 独立，除非移除了共享状态，否则不要重新启用文件并行。
- **测试基础设施**：`@greypan/test-kit` 使用 js-kit 的插件系统提供可组合的插件：
  - `defineMsw(handlers)` — MSW service worker 生命周期管理（start/stop/reset）
  - `defineCapturedRequests()` — 请求捕获与断言工具
  - 使用模式：`defineMsw(handlers).use(defineCapturedRequests()).make()`
  - 推荐：`createMswTestEnv({ handlers })` — 一体化测试环境，返回 `{ worker, start, stop, reset, capturedRequests, clearCapturedRequests, settle }`；自动捕获请求（内置兜底 recorder，业务 handler 优先），`settle` 提供稳定窗口排空并保留 fake timers
- **Browser mode 配置**：使用 browser mode 的包需要在 `vite.config.ts` 中配置 `browser.provider: playwright()`（来自 `vite-plus/test/browser-playwright`）

## 验证选择与证据

对变更路径运行 `pnpm find:usages -- <paths...>`（review 或基线对比按范围加 `--base <git-ref>`、`--staged` 或 `--worktree`）。输出是验证计划的起点，不替代对实际 diff、公共行为和浏览器语义的判断；工具语义见 [`context.md`](context.md)。

根据受影响的契约选择验证方式：

| 变更类型                   | 所需验证                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| 本地行为                   | 聚焦的包测试                                                          |
| 跨包导出、引用或运行时契约 | 迭代期用 `pnpm run test:affected`；提交确认前运行根目录 `pnpm test`   |
| 构建配置、发布产物或导出   | 迭代期用 `pnpm run build:affected`；提交确认前运行根目录 `pnpm build` |
| 浏览器原生行为             | 相关的 `*.browser.spec.ts` 测试                                       |
| UI、UX 或运行时浏览器行为  | 按 `browser-verification.md` 的真实浏览器验证                         |

先运行最快的聚焦验证，再按跨包或发布风险升级到 affected 命令；全量根命令只在最终提交确认前运行，不要无理由扩大验证范围。记录准确命令、结果、浏览器 URL/操作和未验证缺口。失败时保留失败输出，并区分环境问题、现有失败和本次回归；不要用删除测试或跳过检查代替修复。

测试应使用 Arrange、Act、Assert 结构；每个测试验证一个行为；避免依赖实现细节；保持独立性。使用中文描述。仅在需要调用断言时使用带类型的 `vi.fn<Type>()`，并等待确定性的生命周期信号而非任意超时。

对于保持行为不变的重构，应在编辑前记录现有的行为清单，保留行为或获得移除审批后进行变更，并更新相应的测试和文档。

## 本地复现与浏览器 spec 环境隔离

- **压力/负载进程清理**：本地复现慢环境（CPU 忙循环、后台负载等）时，负载进程 PID 必须显式写入文件（如 `pgrep -f <pattern> > /tmp/load.pids`），复现结束后 `kill`（必要时 `-9`），并用 `ps` 验证已退出。不要依赖 shell job 控制（`jobs -p`）：命令被会话移入后台执行或跨 shell 调用时 job 表不可靠，残留的空转循环会占满 CPU 并拖慢后续所有验证。
- **浏览器 spec 指针隔离**：CI 无头浏览器的虚拟光标固定停在视口左上角；overlay 面板隐藏时 Chrome 会在光标下重算 hover 并对命中元素派发 `pointerenter`，配合 `show-delay="0"` 会立即重开浮层，造成仅在 CI 出现的 flaky（案例：tooltip `conditional.browser.spec.ts`）。直接驱动组件 `open` 等状态、不模拟真实指针交互的 `*.browser.spec.ts`，挂载点应设 `pointer-events: none` 隔离真实指针（见该 spec 的 `mountIsolated()`）。诊断此类 CI-only 问题：在源码加 `console.warn` 埋点（browser mode 只回传 warn，不回传 log）并在超时时 dump DOM 状态，推 CI 读取轨迹。
