# ADR-0023: Layout 暴露派生视口状态，app 不再自持移动端断点

- **Date**: 2026-10-07
- **Status**: 已接受
- **Relates to**: [ADR-0005](0005-web-ui-component-architecture.md)（三面 API 与事件模型）、[ADR-0006](0006-web-ui-composition-rendering-architecture.md)（`resolved-appearance` 的派生输出先例与 @lit/context 组合模式）

## 背景

issue #195 修好了「桌面的折叠偏好泄漏进移动端 drawer」，但把机制留成了两份判定：

- `web-ui-layout` 内部用 `window.innerWidth <= 640` 加 100ms 的 `resize` 去抖决定渲染桌面树还是 drawer；
- 三个 app（`apps/interweave/frontend` 的 `AppLayout.vue`、`apps/vue-web-ui-demo`、`apps/react-web-ui-demo`）各自用 `matchMedia('(max-width: 640px)')` 判断同一个条件，好让 drawer 宽度与折叠闸门跟着换。

两个来源有两个后果。其一，app 侧立即翻转、layout 侧最多晚 100ms，跨进移动端的那段时间里 layout 还渲染着桌面树，而它自己的 CSS 已经按 `@media (width <= 640px)` 把 `aside` 藏了起来——侧栏整块消失；跨回桌面时反过来只剩 drawer。其二，同一条 640 边界被复制进每个 app：JS 侧一份判定，CSS 侧还有一批 `max-[640px]:` / `sm:` 工具类按同一数字各自表述，任何一边改动都要靠人记得去改其余几边。

当时的处置是把义务写进文档：layout README（中英）与 `sidebarCollapsed` 的 JSDoc 都要求 Consumer「必须自行按视口收窄那个条件」。文档不构成可消费的 API——消费者仍然只能自己再写一份判定，错位依旧。

## 决策

### 1. 由组件暴露派生状态，三面 API 齐备

`web-ui-layout` 新增 `mobile`：

| 面        | 形态                                                |
| --------- | --------------------------------------------------- |
| Property  | `mobile: boolean`，只读 getter                      |
| Attribute | `mobile`，反射                                      |
| Event     | `mobile-change`，`CustomEvent<{ mobile: boolean }>` |

它是**派生输出，不是第二个输入**：组件独占写入；property 只读（赋值不生效，严格模式下抛错），写 attribute 在同一次 attribute reaction 内被恢复（值也归位成组件自己写的空串），两种写法都不派发事件。`mobile-change` 每次跨断点派发一次，元素在窄视口挂载时连接那一刻的求值也算一次。

形态沿 [ADR-0006](0006-web-ui-composition-rendering-architecture.md) 里 `resolved-appearance` 的先例：那个属性同样是只读派生、由组件独占写入、外部改动被恢复的对外状态，区别只是 `mobile` 是布尔且带一个变化事件。

**消费侧的时序有框架差异，且是实测出来的**：layout 自己在 microtask 里重渲染，Vue 在模板里绑 `@mobile-change` 即可（监听挂在插入之前，flush 也在 microtask，早于 layout 的更新）；React 必须用 ref + `useLayoutEffect` 先读后订阅、并用 `flushSync` 回写——React 对 DOM 监听里的 setState 走 scheduler 宏任务，否则每次跨进移动端都会留下一帧「drawer 已按新状态渲染、consumer 的 sidebar-width 还是桌面值」（本仓 React demo 修复前实测 2/221 帧，修复后 0）。这两个用法写进了 README（中英）。

### 2. 判定源换成媒体查询，去掉 resize 去抖

内部判定改为订阅 `window.matchMedia('(width <= 640px)')`，与 `layout/style.css` 的 `@media (width <= 640px)` 是同一条条件；`window.innerWidth <= 640` 与那 100ms 去抖整体删除。

去抖原本要挡的是「`resize` 事件流」，但这里要维护的是一个布尔量：媒体查询每次跨断点只派发一次 `change`，没有事件流可挡。留着它反而制造了上面那种「树与 CSS 错开」的空档。删掉之后，树切换、CSS 与对外状态在同一时刻翻转，误差为 0。

两份 TS 与两份 CSS 的 640 字面量相等由 `components/drawer/__tests__/breakpoint-parity.spec.ts` 守卫（media query 读不到 CSS 自定义属性，无法真正单源化，这是既有边界）。

### 3. app 侧不再持有断点判断（含 CSS）

三个 app 改为消费 layout 的 `mobile` / `mobile-change`。interweave 的应用壳把它 provide 下去，页面（`LibraryPage.vue` 的抽屉与对话框族）inject 同一个只读值，避免页面再挂一次订阅、也避免页面被绑定在「自己是 layout 的 DOM 后代」这一事实上。app 侧 JS 里不再出现断点字面量，`useMediaQuery` composable 随之删除。

**CSS 侧的 max-width 那一半同样收口。** 三个 app 各声明一条 Tailwind v4 自定义变体，把 `max-[640px]:`（以及 interweave 的 `max-sm:`）换成 `mobile:`：

```css
@custom-variant mobile (&:where(web-ui-layout[mobile], web-ui-layout[mobile] *));
```

形态沿用 interweave 已有的 `dark:`（同样挂在 `web-ui-theme[resolved-appearance]` 这个派生属性上）。

**min-width 那一半没有跟着换，这是实测的结果，不是遗漏。** 两个 demo 里还有 4 处 `sm:grid-cols-*`（`sm` = 640，与 layout 同一条边界）。我先把它们换成 `desktop:`（`web-ui-layout:not([mobile])` 与它的宿主形式），review 实测出**它把网格改坏了**：Tailwind v4 把 `@custom-variant` 生成的规则排在主题断点之后，`:where()` 又不抬特异性，于是同属性同权、后出现者胜——`desktop:grid-cols-4` 会在 ≥768 全段压掉 `md:grid-cols-4` 与 `lg:grid-cols-5`，home 页三档全变 2 列（基线 3）、svg 示例页全变 3 列（基线 5）。把变体改成媒体形态 `@media (width > 640px)` 后仍然是同样的结果，说明这是自定义变体的排序位置决定的，不是选择器写法能绕开的。因此 `sm:` 与 demo 的 `--breakpoint-sm` token 保留，这条陷阱连实测数字一起写进了三份 `global.css` 的注释。

代价与边界，逐条记下：

- **只对 layout 子树内的节点生效。** 被 overlay 的 portal 搬到 `document.body` 的内容够不到这条属性选择器（菜单/选项、popover、tooltip、select、autocomplete、image-preview、toast 都走那条路径）。已逐个核对：当前三个 app 里带 `mobile:` 的节点没有一个是 portal 内容；新增时要么留在 layout 子树内，要么继续用媒体查询。
- **只有 640 这一条边界、且只有 max-width 一侧被这样处理。** `sm:`/`md:`/`lg:`/`xl:` 与 `max-[900px]:` 仍是媒体查询：后三者 layout 不建模，`sm:` 则受上面那条排序限制。
- 首帧前（layout 未连接、attribute 未写）`mobile:` 不命中。实测三个 app 冷启动逐帧采样：移动端第一帧起这些工具类就已生效，没有桌面样式的空档——layout 由框架在挂载时创建并同步写 attribute，早于首次绘制。

## 为什么不是 context，也不是方法

**`@lit/context` 够不到调用方。** context 只向下流动，且只有 Lit 消费者能读。重复判断的宿主（Vue 的 `AppLayout.vue`、两个 demo 的根组件）都是 layout 的**上层**；interweave 的页面虽然在下层，但它是 Vue 组件，读不到 Lit context。context 适合「受管组合向下广播成员状态」（ADR-0006 的 `GroupController`），不适合把组件自己的环境判定交给上层。

**方法（如 `isMobile()`）只能轮询。** 它无法在翻转时通知，消费者仍要自己订阅某个信号——那正是本 ADR 要消除的第二份判定。

## 行为变化

- **跨断点的树切换提前到媒体查询变化的那一刻**，不再等 `resize` 静默 100ms；同一侧内的视口变化不再触发任何重算。
- **`web-ui-layout` 的公共契约新增一个只读属性与一个事件。** 既有的三个 `*-change` 是受控请求，新的 `mobile-change` 是派生状态通知；两者在同一个元素上并存，靠「请求要求回写、通知只报告组件自己的状态」区分。
- **三个 app 删除各自的移动端断点判断**，interweave 的 `useMediaQuery` composable 删除；`LibraryPage` 的浮层改从应用壳取该状态。
- **三个 app 的 CSS 断点改为属性变体**：`max-[640px]:` 与 interweave 的 `max-sm:` 变成 `mobile:`；min-width 一侧（`sm:` 与 demo 的 `--breakpoint-sm` token）按上文的排序限制保留。app 侧 CSS 里 640 这条断点仍由 Tailwind 主题断点声明一次，不再散落在每个工具类上。
- 无 `matchMedia` 的环境（jsdom）里 `mobile` 恒为 `false`，与旧实现下 `innerWidth` 取默认值时的桌面分支一致；消费者侧的测试因此仍需自行提供媒体查询桩。

## 后果

- layout 对外多了一个长期契约面：任何在 `640px` 处改变外形或行为的 Consumer 都应消费 `mobile`（JS 侧）或 `web-ui-layout[mobile]`（CSS 侧），而不是自己再写一份判定。README 已按此改写 `sidebarCollapsed` 的那段义务说明。
- 断点字面量仍存在于包内四处（drawer 的 TS/CSS 与 layout 的 TS/CSS），由守卫测试锁定；本 ADR 不改变 media query 无法读取自定义属性这一限制。
- app 侧的 CSS 单源化换来两条使用约束：`mobile:` 只覆盖 layout 子树内的节点（被 portal 移出的内容要用媒体查询），且不能拿自定义变体做 min-width（会压掉 `md:`/`lg:`）。两条都写在三个 app 的 `global.css` 变体注释里，与 `dark:` 的既有写法并列。
- `mobile` 参与 layout 的渲染分支、attribute 反射与事件派发三者同一时刻变化，因此消费者不会读到「已翻转但树还没换」的中间态。
