# Web UI Portal 层调研：现成库 vs 手写

> 针对 `packages/web-ui` 的 portal 层（调用链：Lit 组件 → `src/shared` 封装 → 底层库）能否用现成成熟库替代的调研。结论先行，所有论断附一手来源（官方文档原文、GitHub 源码、npm registry 数据）。本调研已考虑 release/260909 worktree 的未提交优化影响（select 的 trigger-slot 迁移过滤），portal 基础设施（`portal.ts` / `menu-portal.ts`）在该 worktree 未改动。

---

## 结论

**维持手写。** 本仓库 portal 需求面中真正有难度的条目——theme overlay root 解析、open native dialog（top layer）内容器解析、Shadow DOM CSS 自定义属性镜像、消费者节点**选择性**迁移（含 slot 归属边界）、menu 族关闭态 slot 属性隐藏、presence 进出场协调——全部是本仓库领域语义，没有任何候选库覆盖；而"通用 portal 语义"部分（append 到容器 + 移除恢复）我们的 `defineOverlayPortal` 核心只有约 50 行，引入库收益趋近于零。生态侧证据：Floating UI 官方明确 portal 不是定位库职责（React 包装层才有 `FloatingPortal`）；Lit 官方（`@lit-labs` 全部 14 个包）无 portal/overlay 原语；npm 上无活跃维护的独立 Web Component / Lit portal 库（`lit-portal` 停滞于 2023-04，`@lion/overlays` 停滞于 2022-09）。成熟组件库的做法也佐证手写是常态：Radix / React Aria 的 portal 只是 React 内建 `createPortal` 的薄封装（Web Components 没有等价物，我们的手写 portal 恰是其等价物）；Vaadin 整条 overlay 栈自研；Shoelace / Web Awesome 干脆不 portal（popup 原地渲染）。

---

## 1. 本仓库 portal 需求面（评估候选库的标尺）

| #   | 需求条目                                                                                                                                                                                                                                                                                             | 实现位置                                                                                                                                                      | 语义类别                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | 容器解析策略链：显式 `overlayContainer` → open native `<dialog>`（top layer）内解析（跨 shadow host、`slot.assignedNodes()` 判定归属）→ 最近 `web-ui-theme` 的 `getOverlayRoot()`（`preferRootTheme` 时用 root theme）→ 惰性 fallback root（`data-wui-overlay-root` + shadow root + 共享样式预注入） | `src/shared/overlay/portal.ts`（`resolveOverlayContainer`、`findEnclosingOpenDialog`）、`src/shared/theme/theme-scope.ts`、`src/shared/theme/overlay-root.ts` | **领域**                                    |
| 2   | Shadow DOM 样式边界：portal host `display: contents` + open shadow root，panel 在 shadow 内；组件级 style 注入                                                                                                                                                                                       | `portal.ts`                                                                                                                                                   | 领域（通用库假设 light DOM）                |
| 3   | CSS 自定义属性跨 shadow 镜像（宿主解析后的变量不沿渲染树继承到 panel）                                                                                                                                                                                                                               | `portal.ts`（`applyOverlayVariables`，select/autocomplete 使用）                                                                                              | **领域**                                    |
| 4   | 消费者节点**选择性**迁移：打开迁入、关闭迁回原位；节点身份追踪；必须尊重命名 slot 归属——popover 过滤 `slot === 'trigger'`；select 在 release/260909 新增 `child.slot !== 'trigger'` 过滤（自定义 trigger 留在宿主）；autocomplete 按节点分拣不同目标                                                 | `portal.ts`（`moveContent`/`appendContent`/`restoreContent`）、`popover/index.ts:209`、`select/index.ts`（worktree diff）、`autocomplete/index.ts:619`        | **领域**（多数通用 portal 只做整体 append） |

release/260909 worktree 的 select diff（未提交，本调研已纳入需求面）：

```ts
// 自定义 trigger 必须留在宿主内，不能随 options 迁入 portal 面板
portal.moveContent(
  Array.from(this.children).filter(child => child.slot !== 'trigger'),
  content
)
```

| 5 | 与消费者框架 vdom 的冲突补偿：`onContentChange` MutationObserver → `scheduleRefresh`；已删除节点 `removeContent` 防关闭时"复活" | `select/index.ts:437,589`、`select/__tests__/conditional-combo.spec.ts` | 领域（React/Vue 内建 portal 由 vdom 拥有节点，无此问题） |
| 6 | menu 族专用形态：无 shadow 共享面板（复用容器预注入样式）；dialog 容器例外自注入；submenu 独立 overlay；关闭态 slot 属性隐藏（`context-menu-hidden` / `web-ui-menu-level-*-hidden`） | `src/shared/menu-portal/menu-portal.ts`、ADR-0033 | **领域** |
| 7 | presence 进出场协调：`data-wuiPresence` 状态机（entering/open/closing）、可中断、transitionend + duration+80ms 兜底、jsdom 短路；native dialog top layer 退出动画生命周期 | `src/shared/overlay/presence.ts`、`native-dialog-presence.ts` | 领域 |
| 8 | 与定位引擎分层：portal 只管容器与内容归属，定位由 `defineOverlay`（`@floating-ui/dom`）负责，`defineAnchoredPanel` 组合三者 | `src/shared/overlay/anchored-panel.ts`、ADR-0038 | 通用（该分层正是业界共识） |

ADR-0033 还约束了组件对消费者节点的写入边界（仅位置移动 + menu 关闭态 slot 属性两类）——需求 #4 的契约化表述。

## 2. Floating UI：明确不提供 portal（官方立场）

- Getting Started（官网文档仓库 MDX 源文）列出两大能力：**Positioning** 与 **Interactions**；且 Interactions 明确是 "Floating UI's **React package** offers a toolkit of primitive Hooks"——vanilla 包（`@floating-ui/dom`）只有定位。https://github.com/floating-ui/floating-ui/blob/master/website/pages/docs/getting-started.mdx
- `FloatingPortal` 文档原文："**Portals the floating element into a given container element** — by default, outside of the app root and into the body. … `<PackageLimited>@floating-ui/react only</PackageLimited>`"。https://floating-ui.com/docs/floatingPortal （源文 https://github.com/floating-ui/floating-ui/blob/master/website/pages/docs/FloatingPortal.mdx ）
- 即官方立场：**portal 属于渲染层（框架包装）的职责，定位库不做**。本仓库 ADR-0038 的分层与此一致。

## 3. Lit 官方生态：无 portal/overlay 原语

lit.dev「Lit Labs」页列出全部 14 个 `@lit-labs` 包（scoped-registry-mixin、eleventy-plugin-lit、motion、observers、signals、ssr、testing、virtualizer、analyzer、cli、compiler、preact-signals、router 等），**无任何 portal、overlay、popup、tooltip 或浮层定位项目**。https://lit.dev/docs/libraries/labs/

## 4. npm 独立 WC / Lit portal 库：未找到活跃维护者

npm registry 搜索（`lit portal`、`web components portal`、`dom portal`、`lit overlay`、`web component overlay floating`）结果中非 React 的候选：

| 包                                                               | 最新版本 | 最近发布   | 周下载 | 协议                                  | 状态                                                                              |
| ---------------------------------------------------------------- | -------- | ---------- | ------ | ------------------------------------- | --------------------------------------------------------------------------------- |
| [lit-portal](https://www.npmjs.com/package/lit-portal)           | 1.0.5    | 2023-04-25 | 6,685  | **无 license/repo 字段**，共 6 个版本 | 停滞 3 年，单维护者小包                                                           |
| [@lion/overlays](https://www.npmjs.com/package/@lion/overlays)   | 0.33.2   | 2022-09-08 | 3,236  | MIT                                   | 停滞约 4 年（[ing-bank/lion](https://github.com/ing-bank/lion) 的 overlays 系统） |
| [@vaadin/overlay](https://www.npmjs.com/package/@vaadin/overlay) | 25.2.10  | 2026-09-03 | 94,623 | Apache-2.0                            | 活跃，但见 §5：非通用 portal 库，是 Vaadin 自用 overlay 元素                      |

其余结果（`@rc-component/portal`、`react-reverse-portal`、`react-portal`、`@fluentui/react-portal` 等）均为 React 生态。**结论：未找到活跃维护、框架无关的 Web Component 通用 portal 库**（数据来源：registry.npmjs.org 与 api.npmjs.org，2026-09-07 查询）。

## 5. 成熟组件库的 portal 实现策略

- **Radix UI**（[`packages/react/portal/src/portal.tsx`](https://github.com/radix-ui/primitives/blob/main/packages/react/portal/src/portal.tsx)）：全文件约 40–45 行，核心约 10 行——`ReactDOM.createPortal(<Primitive.div {...portalProps} ref={forwardedRef} />, container)`；`containerProp || (mounted && globalThis?.document?.body)`，SSR 前返回 null。语义 = 薄薄 append 到 body + container 透传，无 shadow/theme/top-layer 概念。
- **React Aria**（[`packages/react-aria/src/overlays/Overlay.tsx`](https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/overlays/Overlay.tsx)、[`useModal.tsx`](https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/overlays/useModal.tsx)）：`Overlay` = `ReactDOM.createPortal` 到 `portalContainer ?? document.body` + `FocusScope` + PortalProvider context；`OverlayContainer` = createPortal 到 body 末尾 + `OverlayProvider`（useModal.tsx:157 `return ReactDOM.createPortal(contents, portalContainer);`），配套 `ariaHideOutside`（对 overlay 外内容 aria-hidden）与 `usePreventScroll`。**解决**：portal 到 body、a11y 屏蔽、scroll lock、焦点域。**不解决**：定位（`useOverlayPosition` 用自家 `calculatePosition`，非 floating-ui）；Shadow DOM 样式继承与选择性内容迁移（React vdom 拥有 children，物理迁移问题不存在——这正是 web component 场景的本质差异）。
- **Vue Teleport**（[官方指南](https://vuejs.org/guide/built-ins/teleport)）：内置 `<Teleport to>`（CSS selector 或 DOM 节点）、`disabled`、`defer`（3.5+）；"only alters the rendered DOM structure — it does not affect the logical hierarchy"；不处理样式继承/定位/动画（需自行组合 `<Transition>`）。目标须已存在于 DOM。能力边界 = 移动"框架自己的模板"，节点由 vdom 拥有。
- **Vaadin**（[`packages/overlay/src/vaadin-overlay.js`](https://github.com/vaadin/web-components/blob/main/packages/overlay/src/vaadin-overlay.js)）：**自研** `<vaadin-overlay>` 元素，overlay 元素本身是 portal 单元（mixin 文档："When true, the overlay is visible and **attached to body**"），内容由 `renderer(root)` **命令式填充**进 overlay 元素——消费者"把内容交给 overlay 渲染"而非物理迁移 light DOM。定位/层叠/焦点全自研（`vaadin-overlay-position-mixin.js`、`-stack-mixin.js`、`-focus-mixin.js`；其 DOM 观察工具注释声明 "Based on the idea from … Floating UI" 但未引其库，代码搜索全仓库无 `@floating-ui/dom` import）。
- **Shoelace / Web Awesome**（[`popup.component.ts`](https://github.com/shoelace-style/shoelace/blob/current/src/components/popup/popup.component.ts)、[`popup.ts`](https://github.com/shoelace-style/webawesome/blob/next/packages/webawesome/src/components/popup/popup.ts)）：`sl-popup` / `wa-popup` 是基于 `@floating-ui/dom`（`computePosition` + `autoUpdate`，middleware：offset → size/flip/shift → arrow）的**定位组件**：panel 原地渲染在自己 shadow root 内，仅写坐标（`Object.assign(this.popup.style, {left, top})`），**不 portal、不迁移内容**；`composed-offset-position` 依赖用于 Shadow DOM offset-parent 修正。DOM 归属策略 = 靠定位坐标规避 stacking 问题，portal 留给上层组件/消费者。

## 6. 候选承载能力判定

| 需求条目（§1 编号）                      | Radix/React Aria                | Vue Teleport           | Vaadin                                                     | Shoelace/WA                      | Floating UI            |
| ---------------------------------------- | ------------------------------- | ---------------------- | ---------------------------------------------------------- | -------------------------------- | ---------------------- |
| 1 容器策略链（theme/top-layer/fallback） | 不承载（仅 container prop）     | 不承载（仅 to prop）   | 部分（自研 attached-to-body，无 theme/top-layer 对外契约） | 不承载（不 portal）              | 不承载（官方明确不管） |
| 2–3 Shadow DOM 边界与变量镜像            | 不承载（light DOM 假设）        | 不承载                 | 部分（自身即 shadow 元素，但内容走 renderer）              | 部分（原地 shadow，不跨树）      | 不承载                 |
| 4–5 选择性迁移 + vdom 补偿               | 不承载（vdom 模型无此问题）     | 不承载（同左）         | 模式不同（renderer 命令式，无迁移契约）                    | 不承载                           | 不承载                 |
| 6 menu 族 slot 隐藏形态                  | 无对应物                        | 无对应物               | 无对应物                                                   | 无对应物                         | 无对应物               |
| 7 presence 状态机                        | 外部关注点（另有 animation 库） | 需组合 `<Transition>`  | 自研 opening/closing 属性                                  | 外部关注点                       | 不承载                 |
| 8 定位分层                               | —（React 生态）                 | —（需 floating-ui 等） | 自研引擎                                                   | 采用 floating-ui（与 §1.8 一致） | 提供                   |

## 7. 维持手写的理由汇总

1. **需求面错位**：通用库只覆盖 §1 中的"通用"行（约 1/8），且我们已有等价物；"领域"行全部要自写适配层，引入库反而多一层间接。
2. **生态空位**：Lit 官方无原语（§3），npm 无活跃独立库（§4），没有"现成成熟"可选。
3. **架构分层已正确**：ADR-0038 已把定位交给 `@floating-ui/dom`（Shoelace/Web Awesome 同款策略），portal 独立成层与 Floating UI 官方立场（§2）一致。
4. **演进方向是更细的所有权边界**：release/260909 的 select trigger-slot 过滤表明需求在向"选择性迁移 + slot 归属"深化（ADR-0033 的写入边界约束），这类细粒度控制没有任何通用 portal 库预置。
5. **可借鉴而非引入**：Radix/React Aria 的"薄 portal + a11y/scroll-lock 关注点分离"、Vaadin 的 renderer 式内容归属、Shoelace 的 `composed-offset-position` Shadow DOM 修正，均为后续 portal 层演进时的参考模式，不需要以依赖形式获得。

## 8. 来源与方法说明

- 所有第三方能力论断均核查一手来源：官方文档的仓库 MDX 源文（floating-ui）、GitHub raw 源码（radix-ui/primitives、adobe/react-spectrum、vaadin/web-components、shoelace-style/shoelace、shoelace-style/webawesome）、lit.dev 官方页面、npm registry API（registry.npmjs.org 包元数据 + api.npmjs.org 下载统计）。查询日期：2026-09-07。
- Vaadin 是否使用 Floating UI 的核查方式：GitHub code search `floating-ui repo:vaadin/web-components` 仅命中 `packages/overlay/src/vaadin-overlay-utils.js` 的注释（"Based on the idea from … Floating UI"），全仓库无 `@floating-ui/dom` import——其定位引擎为自研，引用 Floating UI 的仅为 DOM 观察思路。
- 未深入评估的相邻项：`@lion/overlays` 的 OverlayController 内部机制（因其 2022-09 起停滞，不构成候选）；各家 fullscreen/popover API（Popover/Anchor Positioning CSS）与 portal 层无替代关系，不在本次范围。
