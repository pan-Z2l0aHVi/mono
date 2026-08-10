# 测试

- **测试框架**：Vitest（通过 `vite-plus`）
- **运行所有测试**：`pnpm test`
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
- **Browser mode 配置**：使用 browser mode 的包需要在 `vite.config.ts` 中配置 `browser.provider: playwright()`（来自 `vite-plus/test/browser-playwright`）

## 验证选择

根据受影响的契约选择验证方式：

| 变更类型                   | 所需验证                                      |
| -------------------------- | --------------------------------------------- |
| 本地行为                   | 聚焦的包测试                                  |
| 跨包导出、引用或运行时契约 | 根目录 `pnpm test`                            |
| 构建配置、发布产物或导出   | 根目录 `pnpm build`                           |
| 浏览器原生行为             | 相关的 `*.browser.spec.ts` 测试               |
| UI、UX 或运行时浏览器行为  | 按 `browser-verification.md` 的真实浏览器验证 |

测试应使用 Arrange、Act、Assert 结构；每个测试验证一个行为；避免依赖实现细节；保持独立性。使用中文描述。仅在需要调用断言时使用带类型的 `vi.fn<Type>()`，并等待确定性的生命周期信号而非任意超时。

对于保持行为不变的重构，应在编辑前记录现有的行为清单，保留行为或获得移除审批后进行变更，并更新相应的测试和文档。
