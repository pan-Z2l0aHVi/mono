# react-web-ui-demo

- 这是 `web-ui` 的 React 集成和预览表面；demo 行为不能替代公共组件契约。
- 修改集成或交互后，在真实浏览器验证 React 表面。
- 新增或修改 `src/routes/**` 时，以该目录和 `vite.config.ts` 为 source of truth；不得手动编辑 `src/routeTree.gen.ts`。生成入口与证据见 [`docs/agents/build.md`](../../docs/agents/build.md) 生成物表。
- 示例代码与 API 表都由 `packages/web-ui/docs/*.md` 生成（表里的名称 / 说明 / 类型 / 默认值都手写在语料里，组件源码不参与生成），落点是 `src/generated/`：不得手动编辑，改完 markdown 由 `vite.config.ts` 里挂的 `@greypan/md-to-comp/react` 插件在 dev 与 build 时重新生成，不必手跑命令；改了组件属性时这张表要人一起手改，没有脚本会提醒。带 `{#id}` 锚点的示例还会落成 `src/generated/demos/*.tsx`——那是被真正编译执行的示例源码，围栏字节、落盘文件与页面 `<pre>` 显示的必须是同一份。
