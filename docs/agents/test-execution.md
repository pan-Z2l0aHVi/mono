# 测试执行与验证

测试用例的编写策略（什么值得测、什么别测）见 [`test-authoring.md`](test-authoring.md)。本文件讲测试环境、命令与验证选择。

- 测试框架：Vitest（通过 `vite-plus`）。
- 运行所有测试：`pnpm run test`。根 `turbo test` 编排所有 workspace 的 `test` 任务；配了 browser-mode 的包会在此命令中跑 Chromium `*.browser.spec.ts`。
- 运行受影响测试：先用 `pnpm agent:find-usages -- <paths...>` 识别受影响 workspace，再跑 `pnpm exec turbo test --filter=@greypan/<name>`。已移除独立的 `test:affected` 根命令，避免与 `agent:find-usages` 重复判定影响面。迭代和调试默认用本命令或包级聚焦测试。全量 `pnpm run test` 留到提交前最终确认。
- 运行单个包的测试：`pnpm exec turbo test --filter=@greypan/<name>`（包内执行 `vp test run`）。
- 测试文件：`*.spec.ts`、`*.test.ts`、`*.spec.tsx`。
- Demo 应用：`react-web-ui-demo` 与 `vue-web-ui-demo` 各有两个 project，覆盖的契约相同、层级不同。`jsdom` 层（`src/**/*.spec.ts[x]`，`test-helper.ts` 补 jsdom 未实现的滚动 API）在秒级给出接线的快速反馈。`browser` 层（`src/**/*.browser.spec.ts[x]`，Chromium）用 `page.viewport` 换真实视口、点真实的 Toggle、读渲染后的对齐与几何。折叠态在 demo 里只体现为排版，jsdom 里那串工具类是不生效的字符串，只有浏览器能读出「文字居中」这件事。两层都挂载真实的应用外壳与真实的 web-ui 自定义元素。组件契约仍归 `web-ui` 的测试面；UI、UX 与浏览器运行时行为仍按 [`runtime-verification.md`](runtime-verification.md) 在真实浏览器验证。
- Demo 的网格列数基线：两个 demo 各有一组 `src/__tests__/grid-columns.browser.spec.ts[x]`，把 home 页快速预览网格（`1/2/2/3/3/3/3/3/3` 列）与 svg 示例页图标网格（`2/3/3/4/5/5/5/5/5` 列）在 390/640/641/768/1024/1280/1440/1536/1920 九档视口下的渲染列数钉死。它守的是 Tailwind v4 的变体排序陷阱：`@custom-variant` 生成的规则排在主题断点之后，而 `:where()` 不抬特异性。同属性同权时后出现者胜，一条本意只针对 ≥641 的自定义变体（如 `desktop:grid-cols-4`）会在 ≥768 全段压掉 `md:` 与 `lg:`，且不会让任何别的测试变红。用户指定的六档（390/640/641/768/1024/1280）之外另补 1440/1536/1920，用来覆盖起点大于 xl(1280) 的陷阱：`@theme` 里还有 2xl 1536，只采到 1280 时那段完全采不到。三档分工不同。1440 与 1920 提供覆盖（起点 ≤1440 由 1440 档抓、1441–1920 由 1920 档抓）。1536 不增加覆盖，它钉在最后一个具名断点上，将来出现 `2xl:` 类时那正是生效点。起点比 1920 更靠右的仍采不到，是采样法的固有边界。基线值由类名链条按 `@theme` 断点逐档算出，不是照抄上一档。取不到更高断点的类就沿用前一个胜者，因为 Tailwind 不会在更高断点重置列数。两条网格各挂一个 `data-testid` 供定位。
- Demo 的 browser project 有几处与 app 配置不同，都在各自的 `vite.config.ts` 里带注释。`basicSsl()` 在 `VITEST` 下不挂：它只把 `server.https` 打开，vitest 的 browser server 不跟着走，浏览器按 https 连明文服务会直接 `ERR_SSL_PROTOCOL_ERROR`。browser project 固定到本包专用端口（vitest 默认的 63315 会被同机其他 worktree 或同一轮 `turbo test` 里 `web-ui` 的 browser project 占住）。`optimizeDeps.include` 用 `@greypan/<pkg> > <dep>` 从 workspace 包的角度解析扫描器够不到的裸依赖。web-ui 那一半由 `@greypan/web-ui/vite` 的 `webUiOptimizeDeps` 提供，各 app 只引用它，组件库增删运行时依赖时不必逐个改 app。扫描器跟不进组件图时才需要这份清单：vue demo 与 interweave/frontend 的路由都由 file-based 插件（`vue-router/vite`）生成在虚拟模块里，路由页里经 `unplugin-web-components` 生成的组件导入（连带 `lit`、`@floating-ui/dom` 等）就不可见，必须引用它；react demo 的 `routeTree.gen.ts` 静态 import 每个路由模块，路由模块对 `@greypan/web-ui` 根 barrel 的值导入会把组件图带进启动扫描，无需引用。`vite-plus > vitest > expect-type` 只出现在配了 browser project 的四份配置里（web-ui、browser-kit 与两个 demo），它守的是 workspace 依赖未构建、扫描失败后只剩裸 CJS 的场景；interweave/frontend 没有 browser project，不列这条。改带清单的配置后必须冷缓存验一次（`rm -rf apps/<pkg>/node_modules/.vite`）。清单不全时 vite 会在测试模块加载途中才发现依赖并 reload，浏览器那次 fetch 失败，测试模块报 `Failed to fetch dynamically imported module`。CI 没有 `.vite` 缓存，本地热缓存跑绿会骗人。日志里出现 `dependencies optimized` 或 `optimized dependencies changed. reloading` 就是没配全。
- 测试环境：大多数包用 Node 环境。`browser-kit` 用 Vitest Browser Mode 配 Playwright Chromium 做真实浏览器测试。
- `web-ui` 测试环境：用 jsdom，`packages/web-ui/test-helper.ts` 对 jsdom 未实现的浏览器 API 做桩。桩了 `window.scrollTo` 和 `Element#scrollTo`；组件测试断言公共的滚动调用，浏览器验证覆盖原生滚动行为。
- `web-ui` jsdom 契约测试：默认的 `*.spec.ts` 在独立的 `jsdom` 项目里运行，覆盖宿主 API、属性/属性同步、事件、渲染以及非浏览器 DOM 语义。测试工具不应把 jsdom 当成 ElementInternals 实现。
- `web-ui` browser mode：仅显式的 `*.browser.spec.ts` 通过 `@vitest/browser-playwright` + `playwright` 在 Chromium 中运行。这层用于 FormData、ElementInternals、Pointer events、焦点、portal、原生 dialog 以及其他 jsdom 无法忠实实现的浏览器原生行为。
- `web-ui` reduced-motion browser mode：`reduced-motion.browser.spec.ts` 在独立的 Chromium 项目里运行，用 Playwright `reducedMotion: 'reduce'`。这层用于验证 transform 位移被移除的同时，基于 opacity 的状态反馈仍然可用。
- 网络模拟：`browser-kit` 通过 `@greypan/test-kit` 用 MSW（Mock Service Worker）拦截网络请求。它的 tracker spec 共享浏览器全局变量和一个 service worker，所以该包禁用了 Vitest 文件并行。除非移除了共享状态，否则保持这些 spec 独立，不要重新启用文件并行。
- 测试基础设施：`@greypan/test-kit` 用 js-kit 的插件系统提供可组合插件：
  - `defineMsw(handlers)`：MSW service worker 生命周期管理（start/stop/reset）。
  - `defineCapturedRequests()`：请求捕获与断言工具。
  - 使用模式：`defineMsw(handlers).use(defineCapturedRequests()).make()`。
  - 推荐用 `createMswTestEnv({ handlers })`，返回 `{ worker, start, stop, reset, capturedRequests, clearCapturedRequests, settle }`。它自动捕获请求（内置兜底 recorder，业务 handler 优先），`settle` 提供稳定窗口排空并保留 fake timers。
- Browser mode 配置：用 browser mode 的包需要在 `vite.config.ts` 里配置 `browser.provider: playwright()`（来自 `vite-plus/test/browser-playwright`）。

## 验证选择与证据

对变更路径运行 `pnpm agent:find-usages -- <paths...>`（review 或基线对比按范围加 `--base <git-ref>`、`--staged` 或 `--worktree`）。输出是验证计划的起点，不替代对实际 diff、公共行为和浏览器语义的判断；工具语义见 [`context.md`](context.md)。

根据受影响的契约选择验证方式：

| 变更类型                   | 所需验证                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| 本地行为                   | 聚焦的包测试                                                                                            |
| 跨包导出、引用或运行时契约 | 迭代期用 `pnpm exec turbo test --filter=@greypan/<name>` 定位受影响包；提交确认前运行根目录 `pnpm test` |
| 构建配置、发布产物或导出   | 迭代期用 `pnpm exec turbo build --filter=@greypan/<name>`；提交确认前运行根目录 `pnpm build`            |
| 浏览器原生行为             | 相关的 `*.browser.spec.ts` 测试                                                                         |
| UI、UX 或运行时浏览器行为  | 按 `runtime-verification.md` 的真实浏览器验证                                                           |

先跑最快的聚焦验证，再按跨包或发布风险升级到对应包或其上游依赖的构建/测试。全量根命令只在提交前最终确认时跑，不要无理由扩大验证范围。记录准确命令、结果、浏览器 URL/操作和未验证缺口。失败时保留失败输出，区分环境问题、现有失败和本次回归；不要用删除测试或跳过检查代替修复。

## 本地复现与浏览器 spec 环境隔离

- 压力/负载进程清理：本地复现慢环境（CPU 忙循环、后台负载等）时，把负载进程 PID 显式写入文件（如 `pgrep -f <pattern> > /tmp/load.pids`），复现结束后 `kill`（必要时 `-9`），并用 `ps` 验证已退出。不要依赖 shell job 控制（`jobs -p`）。命令被会话移入后台或跨 shell 调用时 job 表不可靠，残留的空转循环会占满 CPU 并拖慢后续所有验证。
- 浏览器 spec 指针隔离：CI 无头浏览器的虚拟光标固定停在视口左上角。overlay 面板隐藏时 Chrome 会在光标下重算 hover 并对命中元素派发 `pointerenter`，配合 `show-delay="0"` 会立即重开浮层，造成仅在 CI 出现的 flaky（案例：tooltip `conditional.browser.spec.ts`）。直接驱动组件 `open` 等状态、不模拟真实指针交互的 `*.browser.spec.ts`，挂载点应设 `pointer-events: none` 隔离真实指针（见该 spec 的 `mountIsolated()`）。诊断此类 CI-only 问题时，在源码加 `console.warn` 埋点（browser mode 只回传 warn，不回传 log），并在超时时 dump DOM 状态，推 CI 读取轨迹。
