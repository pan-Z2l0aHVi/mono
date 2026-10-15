# react-web-ui-demo

- 这是 `web-ui` 的 React 集成和预览表面；demo 行为不能替代公共组件契约。
- 修改集成或交互后，在真实浏览器验证 React 表面。
- 新增或修改 `src/routes/**` 时，以该目录和 `vite.config.ts` 为 source of truth；不得手动编辑 `src/routeTree.gen.ts`。生成入口与证据见 [`docs/agents/build.md`](../../docs/agents/build.md) 生成物表。
- 示例代码与 API 表由 `docs/examples/web-ui/*.md` 与 `packages/web-ui` 组件源码生成，落点是 `src/generated/`：不得手动编辑，改 markdown 或组件属性后跑 `node scripts/generate-web-ui-examples.mjs`。带 `{#id}` 锚点的示例还会落成 `src/generated/demos/*.tsx`——那是被真正编译执行的示例源码，围栏字节、落盘文件与页面 `<pre>` 显示的必须是同一份。
