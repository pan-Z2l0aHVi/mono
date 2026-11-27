# web-ui

修改组件公共契约、事件、overlay、token 或框架类型前，按需查阅对应 ADR：

- Lit / Shadow DOM、公共契约、事件模型、框架类型与 icon 系统：[ADR-0005](../../docs/adr/0005-web-ui-components.md)
- Overlay 定位/portal/焦点/滚动锁、design token 与 `@lit/context` 组合：[ADR-0006](../../docs/adr/0006-web-ui-composition.md)
- Layout 受控 `mobile` 契约：[ADR-0023](../../docs/adr/0023-layout-controlled-mobile.md)
- 内置无障碍文案英文回退与 `aria` 前缀：[ADR-0016](../../docs/adr/0016-accessible-names.md)

## 硬边界与共享原语

- [`src/components/theme/style.css`](./src/components/theme/style.css) 是 token 权威源；不把组件样式注入 `document.head`，不承担框架运行时 wrapper 或全局应用样式。
- 组件内部滚动容器使用 `.wui-scroll` 契约（随组件样式 adopted 进 shadow，不进 `exports`，读 `--wui-scrollbar-handle`），本包不引入第三方 scrollbar 库。
- 共享状态与行为使用 `defineXxx(...).make(...)` 的 `definePlugin` factory；受管子元素组合走 `GroupController`（禁用/展示态经 `@lit/context` 只下行广播，选中态由根直写上行）；带 portal 的 `select`/`autocomplete` option 走 [`src/shared/option-portal/`](./src/shared/option-portal/)。
- combobox 开合骨架与游标状态机分离在内部层，语义差异经 hooks 注入，不把游标状态机抄回组件；触屏长按开 `context-menu` 后的 click 抑制由组件自己在宿主 capture 阶段吸收；theme 的 View Transition 引擎归 [`src/shared/theme/transition.ts`](./src/shared/theme/transition.ts)。
- slot-trigger 组件（popover/dropdown/collapse）的 ARIA 状态（如 `aria-expanded`）回写到 trigger slot 首个 assigned element，不挂在包装结构上。
- 框架动态绑定布尔属性走 camelCase Property；组件内不加 attribute 字符串解析兜底，保持原生 HTML 布尔存在语义。

## 核心词汇

- **semantic hue token**：模式适配后的基础语义色源（accent/success/warning/danger/info），不是具体组件背景或 hover/active 状态色。
- **variant state color**：基于组件 variant surface 或语义色源派生的 hover/active 展示色，不直接改写语义色源 token。
- **open overlay**：overlay 开启态与 Escape 仲裁的唯一拥有者；组件用 `claim(panel)` 声明会话 handle、`release()` 随退场动画幂等撤销（`close()` 先切为可见但暂缓仲裁，不提前撤销），不可用 `isOpen()` 回调询问或各组件自持 Escape 监听。

## 示例文档与公共契约同步

- 示例文档（[`docs/*.md`](./docs/)，中文源 `<name>.CN.md`、英文 `<name>.md`，无 frontmatter）是示例、代码与 `## API` 表的唯一 source of truth，组件源码不参与自动生成——**修改组件 API 必须手工同步对应 markdown**，并同步包根 `README.md`/`README.CN.md` 索引表与受影响 demo 的 type fixtures（跨包影响面查 [monorepo-change-impact](../../.agents/skills/monorepo-change-impact/SKILL.md)）。
- 同一份示例源码在 markdown 围栏、demo `src/generated/**/codeblock/` 落盘文件（仅多一个行尾换行）与页面 `<pre>` 三处必须逐字一致；围栏语言即扩展名（React `tsx`、Vue `vue`）。
- 改动 `docs/` 布局或包根 `.md` 时同步 `turbo.json` 的 `test.inputs`（见 [`docs/agents/build.md`](../../docs/agents/build.md)）。
