# doc-demo-kit

`@greypan/doc-demo-kit` 是 web-ui 文档 demo 的共享文档示例层：跨端逐字孪生的状态机、语料契约与纯逻辑住在这里，宿主只保留框架绑定（React hook / Vue composable）、视图组件与中文文案。

- 所有权边界：导航结构与顺序、主题/动效/侧栏宽度的存储键与校验、quick-link 倾斜数学、locale 状态机、meta 渲染判据与语料契约都由本包给出一份实现。宿主各自维护框架适配与界面，不得复制这些实现做「本地特例」。
- 文案留在宿主（wuchale 只扫宿主 `src`）；本包只给结构、键名、类名与几何值。
- 运行时入口不碰 `@greypan/md-to-meta` 根入口：它会把 shiki、tinyglobby 这类生成期依赖拖进浏览器图；纯契约一律走 `@greypan/md-to-meta/contract`。
- 纯逻辑与依赖注入是可测边界：locale、语料、校验与几何函数接收依赖或数据，不自己读全局；DOM/window 只经显式参数或窄接口访问，保证 Node 环境可单测。
- 语料契约在 `testing` 子入口（`src/testing.ts`）：`runExampleDocsContractTests` 校验「页面显示代码 == markdown 围栏」与「围栏落成可编译文件且 exec 语言带 load」；`runNavCorpusContractTests({ docsDir })` 校验 nav 条目对应同英文名 `.md`/`.CN.md`。语料目录由宿主注入，kit 不硬编码仓库路径；中英文结构/标题一致性与页面接线不由它强约束，详细判据以 `src/testing.ts` 及其测试为准。
- Tailwind 的自动源检测止步于 workspace 边界。本包的类串要在 demo 构建里生效，宿主必须在自己的 `global.css` 用 `@source` 显式登记本包 `src`。
- 测试放 `src/__tests__/*.spec.ts`，用包自己的 `vp test run`；只测纯逻辑与几何，不锁像素、类名拼写或展示计数。跨 demo 的生成物与页面结构对齐由根任务 `//#check-generated-parity` 持有（`pnpm run check-generated-parity`）；本包测试不读仓库文件，语料目录由各 demo 注入。
- 私有包，不出 npm；仍参与 Changesets 版本计算。导出面以 `src/index.ts` 与 `./testing` 为准，新增模块同步入口。
