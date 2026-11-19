# vue-web-ui-demo

- 这是 `web-ui` 的 Vue 集成和预览表面；demo 行为不能替代公共组件契约。
- 事件 handler 优先使用推导的 `$event.target`/`currentTarget` 类型；命名 handler 使用 `WebUiEvent<WebUiXxx, 'event'>`，不手写 host 类型。
- 修改集成或交互后，在真实浏览器验证 Vue 表面。
- 示例代码与 API 表由 `packages/web-ui/docs/*.md` 生成到 `src/generated/`：不得手改；改完 markdown 由 `vite.config.ts` 挂的 `mdToMeta` 在 dev 与 build 重新生成。API 表字段手写在语料里，组件源码不参与生成——改了组件属性要人一起改表，没有脚本提醒。壳文案的 wuchale 提取必须排除这些生成物。本端 `exec: ['vue']`，只有 `.vue` 围栏落成可执行 SFC；围栏字节、落盘文件与页面 `<pre>` 必须一致。产物命名、布局与清单见 [`docs/agents/generated-artifacts.md`](../../docs/agents/generated-artifacts.md)。
- shell 状态（主题 / 动效 / 侧栏 collapsed / open / 宽度的持久化、校验、`sidebar-*-change` 事件过滤与 mobile 派生）由 `@greypan/doc-demo-kit` 的 `createShellState` 拥有，应用壳只做快照绑定与渲染；不得自建并行的持久化或事件过滤逻辑，断点判定例外（`useMobile` 留在 app，ADR-0023）。
