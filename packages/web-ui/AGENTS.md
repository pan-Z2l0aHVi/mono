# web-ui

修改组件、主题 token、overlay、表单行为或框架类型封装前，先确认受影响的契约面。只改局部 UI 时不必读完整组件语义。ADR 路由与权威来源索引见 [`docs/agents/web-ui.md`](../../docs/agents/web-ui.md)。

- [`src/components/theme/style.css`](src/components/theme/style.css) 是 token 值的权威来源。复用共享 overlay 生命周期和 semantic token，不要把组件样式注入 `document.head`。
- 不承担框架运行时 wrapper 与全局应用样式。
- 共享状态和行为使用 `defineXxx(...).make(...)` 的 `definePlugin` factory。Lit、Shadow DOM、属性绑定和框架事件类型沿用既有模式。
- browser-mode 测试覆盖无法由 jsdom 证明的原生行为。UI、UX 和交互改动还必须在真实浏览器验证。
- 受管组合（select+option、segmented、radio-group、checkbox-group、button-group）的成员追踪、下行广播与上行写回统一走 `GroupController`，不要绕开它手搓成员管理。
- slot-trigger 组件（popover/dropdown/collapse）的 ARIA 状态（如 `aria-expanded`）不挂在 trigger 包装结构上，按 [ADR-0005](../../docs/adr/0005-web-ui-component-architecture.md) 回写。
- 框架动态绑定布尔属性必须用 camelCase Property；组件内不加 attribute 字符串解析兜底，保持原生 HTML 布尔存在语义。

## 示例文档

示例文档（[`docs/*.md`](docs/)）的 source of truth 只有那一份 markdown：有哪些示例、每个示例的代码、`## API` 下的每张表（字段的名称 / 类型 / 默认值 / 说明）与每段散文（行为说明、迁移说明这类）都手写在里面，组件源码不参与生成。换来的是组件内部怎么重构都不会让文档隐形变更；代价是组件改了 API 时那张表要人手动跟着改，机器不提醒——从前「frontmatter 的 `tag` 对得上源码的 `@customElement`」「`component` 解析得到真实的组件目录」「表里的名字就是源码声明的那个 attribute」这三道核对已经不存在，只剩人工 review。

- 生成与判据由 [`@greypan/md-to-comp`](../md-to-comp/AGENTS.md) 提供，产物 `src/generated/examples.{ts,css}` 与 `src/generated/demos/**` 受版本控制、进 git。两个 demo 的 Vite 配置里挂着该包对应 flavor 的插件，dev 与 build 都会按 markdown 重新生成，改完 markdown 不用手跑生成器；测试期插件只判不改。
- 语料住在被发布的包里，所以本包自带 [`turbo.json`](turbo.json) 覆写 `build` 与 `test` 的 `inputs`：根 `turbo.json` 的 `!**/*.md` 把它们排除在哈希外，而排除项是绝对的，只能在这里反过来「语料进、散文 md 按名字排」。动 `docs/` 的布局或往包根加 md 要同步那份名单——新放的 md 会默认变成 build 输入，名单由 [`scripts/web-ui-docs-inputs.test.mjs`](../../scripts/web-ui-docs-inputs.test.mjs) 守。
- 同一份源码在三处必须一致：markdown 围栏、`src/generated/demos/` 的落盘文件、页面 `<pre>` 的可见文本。落盘文件比围栏多一个行尾换行（落盘前 `trimEnd()` 再补一个，见 `demoFileContent`），除此之外三处逐字相同。改任何一段转义、高亮或落盘路径，都要让这三处一起继续成立。
- `src/generated/**` 不手改：那几份产物是生成函数的输出，要改就改 `docs/*.md`。

## 公共契约变更清单

涉及属性、slot、event、form、导出、框架类型、token 或组件可见行为时，按实际影响检查：

- [`src/components/`](src/components/) 或 [`src/types/`](src/types/) 的实现与出口
- 包 README（[`README.md`](README.md) 与 [`README.CN.md`](README.CN.md)）：组件章节已搬进 `docs/*.md`，README 只留一张指向它们的索引表
- 受影响的 ADR
- 聚焦测试和 browser-mode 测试
- React/Vue demo 的 type fixtures 与集成表面
- [`apps/interweave/frontend`](../../apps/interweave/frontend)（若被公共组件消费）
- package `exports`、Changeset 和 `agent:inspect-contract` 报告

不要机械同步全部项目，以 `agent:find-usages`、manifest、源码引用和测试确定实际影响。
