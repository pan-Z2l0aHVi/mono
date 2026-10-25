# react-web-ui-demo

- 这是 `web-ui` 的 React 集成和预览表面；demo 行为不能替代公共组件契约。
- 修改集成或交互后，在真实浏览器验证 React 表面。
- 新增或修改 `src/routes/**` 时，以该目录和 `vite.config.ts` 为 source of truth；不得手动编辑 `src/routeTree.gen.ts`。生成入口与证据见 [`docs/agents/build.md`](../../docs/agents/build.md) 的「生成物生命周期」。
- React Compiler 跑在 oxc 的 Rust 实现上（`oxc-transform-react`，经 `@vitejs/plugin-react` 的 `compiler` 选项按需加载），模块 transform 链路里没有 Babel（Babel 只剩 `vite-plugin-pwa` → `workbox-build` 这类工具的传递依赖，不碰源码）。启用 compiler 时它的 transform 是 `enforce: 'pre'` 并且会把 JSX 降级，所以 `unpluginWebComponents` 必须排在 `react()` 之前：后者靠源码文本里的 `<web-ui-*` 决定注入哪些自定义元素导入，排在后面就一个也匹配不到。动这个顺序先跑 `src/components/root/__tests__`，它守的就是这条约束。
- 示例代码与 API 表都由 `packages/web-ui/docs/*.md` 生成（中文源 `<name>.CN.md`、英文译文 `<name>.md`；表里的名称 / 说明 / 类型 / 默认值都手写在语料里，组件源码不参与生成），落点是 `src/generated/`：不得手动编辑，改完 markdown 由 `vite.config.ts` 里挂的 `@greypan/md-to-comp/react` 插件在 dev 与 build 时重新生成，不必手跑命令；改了组件属性时这张表要人一起手改，没有脚本会提醒。本端出中英两套数据：`src/generated/zh-CN/` 与 `src/generated/en/` 各一份 `examples.ts` + `demos/`，共用顶层 `examples.css`。带 `{#id}` 锚点的示例落成 `src/generated/<locale>/demos/*.tsx`——那是被真正编译执行的示例源码，围栏字节、落盘文件与页面 `<pre>` 显示的必须是同一份。
- 界面文案（壳）用 wuchale：源码里只写中文，`src/locales/<locale>.po` 是入库的译文源，catalog 与 loader 由 Vite 插件按 PO 重编译且已 gitignore，不手改。语种以本机为准（URL 不带 locale：localStorage 优先，否则看 `navigator.languages`），首帧渲染中文壳再异步换 catalog。增删壳文案要在应用目录跑 `pnpm exec wuchale --clean`，dev/build 只编译不抽取。链路与门禁见 [`docs/agents/build.md`](../../docs/agents/build.md) 的「生成物生命周期」。
