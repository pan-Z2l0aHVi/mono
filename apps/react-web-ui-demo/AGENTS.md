# react-web-ui-demo

- 这是 `web-ui` 的 React 集成和预览表面；demo 行为不能替代公共组件契约。
- 修改集成或交互后，在真实浏览器验证 React 表面。
- 新增或修改 `src/routes/**` 时，以该目录和 `vite.config.ts` 为 source of truth；不得手动编辑 `src/routeTree.gen.ts`。生成入口与证据见 [`docs/agents/generated-artifacts.md`](../../docs/agents/generated-artifacts.md)。
- React Compiler 跑在 oxc 的 Rust 实现上，模块 transform 链路里没有 Babel（个别 Babel 相关包仍会作为 `@vitejs/plugin-react` 的可选 peer 被装上，但不进 transform 链路）。compiler 的 transform 早于框架插件并且会把 JSX 降级，所以 `unpluginWebComponents` 必须排在 `react()` 之前：后者靠源码文本里的 `<web-ui-*` 决定注入哪些自定义元素导入，排在后面就一个也匹配不到。动这个顺序先跑守这条约束的组件 root 测试。插件表与选项以 `vite.config.ts` 为准。
- 示例代码与 API 表都由 `packages/web-ui/docs/*.md` 生成（中文源 `<name>.CN.md`、英文译文 `<name>.md`；表里的名称 / 说明 / 类型 / 默认值都手写在语料里，组件源码不参与生成），落点是 `src/generated/`：不得手动编辑，改完 markdown 由 `vite.config.ts` 里挂的 `mdToMeta` 插件在 dev 与 build 时重新生成，不必手跑命令；改了组件属性时这张表要人一起手改，没有脚本会提醒。单 output 平铺：中英文各一份 meta 与并排的声明文件，共享 `theme.css`，产物命名与清单见 [`docs/agents/generated-artifacts.md`](../../docs/agents/generated-artifacts.md)。所有围栏都落成 `src/generated/codeblock/` 下按内容寻址的文件，本端 `exec: ['tsx']`，因此只有 `.tsx` 围栏带 `load`——那是被真正编译执行的示例源码，围栏字节、落盘文件与页面 `<pre>` 显示的必须是同一份。
- 界面文案（壳）用 wuchale：源码里只写中文，`src/locales/<locale>.po` 是入库的译文源，catalog 与 loader 由 Vite 插件按 PO 重编译且已 gitignore，不手改。语种以本机为准（URL 不带 locale：localStorage 优先，否则看 `navigator.languages`），首帧渲染中文壳再异步换 catalog。增删壳文案要在应用目录跑 `pnpm exec wuchale --clean`，dev/build 只编译不抽取。链路与门禁见 [`docs/agents/build-generated.md`](../../docs/agents/build-generated.md)。
- shell 状态（主题 / 动效 / 侧栏 collapsed / open / 宽度的持久化、校验、`*-change` 事件过滤与 mobile 派生）由 `@greypan/doc-demo-kit` 的 `createShellState` 拥有，`Root` 只做快照绑定与渲染；不得自建并行的持久化或事件过滤逻辑，断点判定例外（`useMobile` 留在 app，ADR-0023）。
