# vue-web-ui-demo

- 这是 `web-ui` 的 Vue 集成和预览表面；demo 行为不能替代公共组件契约。
- 事件 handler 优先使用推导的 `$event.target`/`currentTarget` 类型；命名 handler 使用 `WebUiEvent<WebUiXxx, 'event'>`，不手写 host 类型。
- 修改集成或交互后，在真实浏览器验证 Vue 表面。
- 示例代码与 API 表都由 `packages/web-ui/docs/*.md` 生成（中文源 `<name>.CN.md`、英文译文 `<name>.md`；表里的名称 / 说明 / 类型 / 默认值都手写在语料里，组件源码不参与生成），落点是 `src/generated/`：不得手动编辑，改完 markdown 由 `vite.config.ts` 里挂的 `@greypan/md-to-comp/vue` 插件在 dev 与 build 时重新生成，不必手跑命令；改了组件属性时这张表要人一起手改，没有脚本会提醒。本端本期只出中文，产物直接落在 `src/generated/`（英文语种在配置里登记但没有 output）。每条示例按标题派生的 id 落成 `src/generated/demos/*.vue`——那是被真正编译执行的示例 SFC，围栏字节、落盘文件与页面 `<pre>` 显示的必须是同一份。
