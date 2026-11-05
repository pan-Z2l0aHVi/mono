# doc-demo-kit

`@greypan/doc-demo-kit` 是 react/vue 两个 web-ui 文档 demo 的共享文档示例层：跨端逐字孪生的状态机、语料契约与纯逻辑住在这里，宿主只保留框架绑定（React hook / Vue composable）、视图组件与中文文案。

- 所有权边界：导航结构与顺序、主题/动效/侧栏宽度的存储键与校验、toast 顶部让位几何、quick-link 倾斜数学、locale 状态机、meta 渲染判据与语料契约都由本包给出一份实现。宿主各自维护框架适配与界面，不得复制这些实现做「本地特例」。
- 文案留在宿主：wuchale 只扫宿主 `src`，中文进了共享包既提取不到也翻译不了。本包只给结构、键名、类名与几何值。
- 运行时入口不碰 `@greypan/md-to-meta` 根入口：它会把 shiki、tinyglobby 这类生成期依赖拖进浏览器图；纯契约一律走 `@greypan/md-to-meta/contract`。
- 纯逻辑优先、依赖注入：locale、语料、校验与几何函数接收依赖或数据，不自己读全局；`quick-link` 与 `toast-offset` 需要 DOM/window 时也只通过显式参数或可替身的窄接口访问，保证 Node 环境可单测。
- 语料契约在 `testing` 子入口（`src/testing.ts`）：宿主注入自己的 meta loader、语料目录、生成物目录与执行语言，只检查「页面显示代码 == markdown 围栏」和「围栏落成可编译文件且 exec 语言带 load」。中英文结构/标题一致性与页面接线不由它强约束，双语对齐允许少量差异。
- Tailwind 的自动源检测止步于 workspace 边界。本包的类串要在 demo 构建里生效，宿主必须在自己的 `global.css` 用 `@source` 显式登记本包 `src`。
- 测试放 `src/__tests__/*.spec.ts`，由包自己的 `vp test run` 运行；只测纯逻辑与几何，不锁像素、类名拼写或展示计数。
- 私有包，不出 npm；仍参与 Changesets 版本计算。导出面以 `src/index.ts` 与 `./testing` 为准，新增模块同步入口。
