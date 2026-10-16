# vue-web-ui-demo

- 这是 `web-ui` 的 Vue 集成和预览表面；demo 行为不能替代公共组件契约。
- 事件 handler 优先使用推导的 `$event.target`/`currentTarget` 类型；命名 handler 使用 `WebUiEvent<WebUiXxx, 'event'>`，不手写 host 类型。
- 修改集成或交互后，在真实浏览器验证 Vue 表面。
- 示例代码与 API 表都由 `docs/examples/web-ui/*.md` 生成（Props 表的类型与默认值是手写在表里的四列之一，组件源码不参与生成），落点是 `src/generated/`：不得手动编辑，改 markdown 后跑 `node scripts/generate-web-ui-examples.mjs`；改了组件属性时这张表要人一起手改，没有脚本会提醒。带 `{#id}` 锚点的示例还会落成 `src/generated/demos/*.vue`——那是被真正编译执行的示例 SFC，围栏字节、落盘文件与页面 `<pre>` 显示的必须是同一份。
