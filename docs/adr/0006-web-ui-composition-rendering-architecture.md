# ADR-0006: Web UI Composition & Rendering Architecture

- **Date**: 2026-07-30
- **Status**: 已接受

## 1. Overlay 交互策略

Overlay 组件族共享滚动锁定与焦点管理两类横切行为；按组件显式声明，不由全局默认隐式推导。

- `no-scroll-lock` 可选择退出背景文档的滚动锁定；Dialog 保持原生模态行为；Select、Dropdown 和 Context Menu 暴露 `no-scroll-lock`，Popover 和 Tooltip 始终不锁定滚动
- Select 打开时焦点保持在其 combobox 触发器上，通过 `aria-activedescendant` 暴露当前选中项
- Dropdown 和 Context Menu 使用循环方向键导航、Home/End 键、子菜单导航、Enter/Space 激活
- Escape 的归属不是各组件的私有交互策略，由共享仲裁者统一裁决（见 §7）
- Popover 仅聚焦其第一个可用的 `[autofocus]` 后代元素

## 2. Overlay 定位引擎

**定位引擎唯一，定位路径按语义准入分级。**

- 全库唯一定位引擎为 `@floating-ui/dom`，版本由 workspace catalog 锁定
- 语义一致的浮层默认经 `defineOverlay` / `defineAnchoredPanel` 定位
- 语义分歧的浮层可拥有私有定位路径，准入条件：(a) 同一引擎与版本；(b) 分歧理由成文于组件内；(c) 引擎级通用知识在第二个组件出现时下沉到 shared
- `defineOverlay` 不为单一消费者扩展配置旋钮；能力面扩展以出现第二个真实消费者为前提

## 3. 布局层叠

- `web-ui-layout` 管理同级区域的层叠顺序：基础内容和侧边栏位于固定头部下方
- 默认保留本地 Overlay；Portal Overlay 使用独立语义层叠顺序：锚定 Portal → Toast → 加载 Overlay
- 原生 Dialog 和 Drawer 始终位于浏览器 top layer
- 显式 `overlayContainer` 的层叠上下文由调用方拥有；库不修改祖先样式

## 4. 覆盖层内容迁移

覆盖层面板在文档流外（portal），消费者以声明式框架编写内容，组件在打开时物理迁移节点。

1. **打开态内容迁移**：tooltip、select、dropdown、context-menu 使用「打开迁入 portal、关闭迁回 + 身份追踪与注入补偿」
2. **menu 族关闭态隐藏**：通过 slot 属性改写实现「未分配 → 不渲染」；节点始终留在文档流原位
3. **slot 属性边界约束**：组件对消费者节点的写入仅限上述两类；其余公开 DOM 属性一律不得写入

## 5. Group Management（@lit/context 下行通道）

受管子元素组合（segmented、radio-group、checkbox-group、button-group）使用 `ContextProvider` / `ContextConsumer`（`@lit/context`）：

- **载荷形状**：`ReadonlyMap<HTMLElement, Context>`——root 上单个 provider 以整表广播，子项按自身元素取条目
- **通信边界**：仅下行（disabled 继承、direction/isLast 展示态）；成员追踪、点击归因、选中态上行写回由 GroupController 直驱
- **离开组语义**：子项被移出 provider 子树时 `ContextConsumer` 静默退订；`defineGroupManaged` 在 `hostDisconnected` 显式清空上下文

## 6. Design Token 体系

### 6.1 语义命名

文本前景使用稳定层级：`--wui-color-text` / `text-secondary` / `text-tertiary` / `text-disabled`。不使用 `muted`、`faint`。

Focus token 只定义颜色与宽度：`--wui-color-focus-ring` / `--wui-focus-ring-width`。

中性交互面 `--wui-color-surface-control`；Slider/Switch 轨道 `--wui-color-surface-track`；40px 控件尺寸 `--wui-control-size`；浮动面板阴影 `--wui-shadow-panel`；浮层卡片 `--wui-color-surface-overlay`。

对外 CSS custom property 使用 `--wui-*`；内部接线变量使用 `--wui-internal-*` 前缀。

### 6.2 Duration / Easing / Scale

- `--wui-duration-focus: 200ms`；`--wui-duration-trigger`（原 `--wui-duration-fast`）；`--wui-duration-drawer-enter: 280ms` / `--wui-duration-drawer-exit: 240ms`；`--wui-duration-float-enter: 240ms` / `--wui-duration-float-exit: 160ms`
- `--wui-ease-enter`（原 `--wui-ease-out`）；`--wui-ease-slide`（原 `--wui-ease-standard`）；`--wui-ease-float`（锚定浮动面板专用的无回弹弹簧拟合曲线）
- `--wui-scale-enter: 0.95`（锚定浮动面板与 image-preview 由小到大展开；image-preview 的缩放只落在图片舞台层，控件层原地淡入）；`--wui-dialog-scale-enter: 1.1`（dialog 由大到小收缩，越界条件为静止宽度 > `(100/s)vw`，零越界上限是 `1/0.9 ≈ 1.111`；260919 由 1.2 下调至 1.1，默认值不再触发越界）

### 6.3 语义 Radius Token

三个公开语义 token，不引入数字 scale 或 shape 层：

- `--wui-radius-control: calc(infinity * 1px)` — pill 形小控件
- `--wui-radius-menu: 18px` — menu/popover 类浮动面板
- `--wui-radius-overlay: 28px` — 大型覆盖层与独立浮动卡片

非 pill radius 与 glass corner 联动：覆盖 token 时 border-radius 与对角光影一起变化。

### 6.4 排版族与间距族

在 §6.3 的 radius 决策之上补两族尺度。族内所有 token 定义在 theme 的 `:host` 基础块，不进
light/dark——它们与外观无关，主题切换不应改变字号或间距。

**排版族按角色命名，不引入数字阶。** 这与 §6.3 同构：名字回答「这块文字是什么」，
不回答「它是第几号」。

- 字号四档：`--wui-font-size-caption: 12px`（密集 chrome 标签）、
  `--wui-font-size-readout: 13px`（数字读数）、`--wui-font-size: 14px`（正文基准）、
  `--wui-font-size-title: 18px`（有界卡片标题）。
- 字重两档：`--wui-font-weight-medium: 500`、`--wui-font-weight-semibold: 600`。
- 行高四档：`tight: 1.2`、`snug: 1.4`、`normal: 1.5`、`relaxed: 1.6`。

`line-height: 1` 与 `0` 刻意不 token 化：前者是控件内单行标签的垂直居中手段，后者是
让 inline-flex 包裹盒高收缩到内容的技巧，两者都不是排版行高。`font-size: 0` 同理，是
消除 inline 基线缝隙的技巧。

**间距族是 4px 基准的六级数字阶** `--wui-space-1..6` = 4/8/12/16/20/24px。这是本 ADR
对 §6.3「不引入数字 scale」的一处**有意偏离**，理由是 radius 与 spacing 的角色结构不同：

- radius 是「组件形状选择」，只有少数几档、每档语义强，角色命名完全可行；
- spacing 是 50 余处调用点的节奏值，角色命名不可行——同一个 8px 同时是控件间距、
  group 间距和行内间距，命名它 `control-gap` 或 `group-gap` 只会把一个数字复制成
  多枚互相漂移的 token。

外部生态里「语义色 + 数字间距阶」是常见组合（Radix / shadcn 一系即如此），这是**外部
先例**；本仓此前只在 radius 上做过角色命名的刻意选择（§6.3），spacing 是第一处偏离。

级数止于 6 是由实测决定的：组件层**生效的静态 CSS** 里 padding/gap/margin 的最大节奏值就是
24px，4px 阶上恰好落在这六级。（唯一超出的是 empty 的 padding，默认 `32px 24px`，
但它由 `--wui-empty-size` 尺寸档在 JS 侧派生、属另一根轴，见下。）预留 32/40 会引入
两枚没有任何消费者的死 token，而 `theme-tokens.spec.ts` 要求每枚 token 都进双语文档
——死 token 要付出双份文档成本却换不到任何组件受益。需要更宽留白的嵌入方直接写 px 即可。

本族刻意不含 1px / 2px / 6px / 7.5px / 10px 与负值：1px 是发丝线与描边环的结构宽度，
2px、6px、7.5px 是光学修正，10px 是 4px 阶之外的半档耦合值，负 margin 用来抵消 flex
gap 或按钮 padding。它们的「为什么是这个数」各自独立，不共享间距语义。

另有一类按**语义**而非取值排除：对齐视口边缘或宿主内容边缘的偏移量。它们即使正好落在
4px 阶上也不挂阶——`--wui-image-preview-edge-gap`、`--wui-toast-viewport-gap`、
`--wui-layout-mobile-toggle-inset`、`--wui-back-top-right/left/bottom`、
`--wui-drawer-inset`、`--wui-drawer-close-right`。这些值的参照系是屏幕、宿主的内容边缘
或容器边缘，不是相邻元素之间的节奏；把它们并进间距阶会让「覆盖 `--wui-space-2` 调整
密度」意外推移组件与边缘的距离。

`--wui-drawer-close-right`（默认 `16px`）归入这一族值得单独说明，因为它容易被误挂：
drawer header padding 是 `16px 20px`，而 close 按钮的 `right` 是 `16px`，**20 ≠ 16，二者
并不对齐**——组件原有注释声称二者对齐，实测不成立（该注释已在本轮改正）。挂到
`--wui-space-4` 本身并不会造成视觉变化——该级默认仍是 `16px`——所以不挂阶的理由是
**语义归属**（参照系是容器边缘），不是视觉风险。相比之下同组的
`--wui-drawer-close-top` 已挂 `--wui-space-4`，因为它确实等于 header padding 的垂直
分量（都是 `16px`），两者必须同源，否则覆盖该级会把这条对齐关系打断。

组件层落在 4px 阶上的**节奏**字面量已全部挂阶（含 dialog 的 `--wui-dialog-title-gap` /
`--wui-dialog-desc-gap`、dropdown-divider 的行内 margin、layout 侧栏按钮的 margin、
drawer header padding 与 close 按钮的 `top`），因此「组件层**生效的静态** padding/gap/margin
的最大节奏值就是 24px」成立。这句只就节奏值立论，不声称穷举所有 4px 阶取值：

- empty 的 padding 由 `--wui-empty-size` 尺寸档在 JS 侧派生（40 / 56 / 72 三档实测
  `23px 17px` / `32px 24px` / `41px 31px`）。六个值里四个是奇数，4px 阶根本表示不了；
  `56` 档的 `32px 24px` 落在基准上纯属尺寸选值的巧合：`56` 是三档里唯一被 7 整除的，
  商恰为 8，而 8 本身是 4 的倍数，取整在这档根本没有发生。一根在三个尺寸中两个静默
  失效、只在第三个上碰巧生效的密度杠杆比没有杠杆更糟，何况它挂进间距阶还会让一次密度
  覆盖顺手改掉占位块尺寸；
- 组件内部几何同样落在阶上却不挂阶，例如 segmented 指示 thumb 在 track 内的
  `top`/`bottom: 4px`、switch 滑块的 `translateX()` 行程、slider 的 thumb 尺寸，以及各类
  `blur(4px)`。它们不是公开覆盖 token，参照系是组件自身的盒子而非相邻元素的节奏。

> 这两类归属目前只由本节 prose 记录，**没有机器守卫**：守卫覆盖的是族是否连续、当前
> 最大级、以及 fallback 与族值是否一致，不检查「未挂阶的阶上节奏字面量」。所以上面这份
> 清单会随代码漂移，后来者若新增此类取值需手工回填本节。

**间距族不替代组件局部覆盖 token**（`--wui-button-px`、`--wui-dialog-padding` 等），
而是充当那些 token 的 fallback 默认值。组件继续决定「我的 padding 是多少」，本族提供
「这个值在整套尺度里的位置」，嵌入方因此拿到一根密度杠杆：覆盖某一级会同时移动所有
**已挂阶**的调用点。

杠杆的作用域是节奏，不是结构：上一节排除的那些值不跟随。覆盖还必须落在
`<web-ui-theme>` 作用域内——`:host` 只向自己的子树声明，设在 theme 之上不生效。
另有一条已知边界：`assets/*.css` 的浮层样式有两条注入路径，经 theme 自带的 overlay root
注入时能看到族内 token，退到 document 级 fallback overlay root（一个普通 `div`）时看不到，
那条路径下浮层间距恒取字面量 fallback。

`--wui-radio-group-gap` 与 `--wui-checkbox-group-gap` 的默认值由 `8px` 改为引用
`--wui-space-2`，因此这两枚既有 token 现在与该级耦合：覆盖 `--wui-space-2` 会连带改变
group 成员间距。显式覆盖 group token 本身仍然优先（嵌入方未破坏），但这个耦合是行为变化，
故在此记录。

三处刻意留在族外：

- `max(16px, var(--wui-font-size, 14px))`（input/textarea/input-number 的粗指针钳制）
  是 iOS Safari focus zoom 的平台下限，不是排版选择。
- `calc(var(--wui-avatar-size, 40px) * 0.4)`（avatar 字母）按组件尺寸派生。
- empty 的标题/描述字号由 `--wui-empty-size` 尺寸档在 JS 侧驱动
  （`--wui-internal-empty-*`），是另一根轴；tooltip 自有公开 token
  `--wui-tooltip-font-size`，其默认值本身即角色定义。

**防漂移**由 `theme/__tests__/typography-spacing-scale.spec.ts` 承担，方向与
`theme-token-parity.spec.ts` 互补：parity 锁「fallback 与定义一致」，本文件锁
「组件不写裸字面量」与「族内 token 全部被消费」。后者同时挡住新增即死 token。

## 7. 开启态浮层归属

「哪一层正开着」由 `src/shared/overlay/open-overlay.ts` 独占，组件不再各自监听 Escape。合并前由三个模块分担同一件事（逻辑父子树、Escape 仲裁、帧事务失效），不变量没有主人，8 个浮层组件各自把它拼成三步登记协议。

- **唯一仲裁者**：document 捕获阶段监听 keydown，按「逻辑组合树下的最内层」归属一次 Escape，然后 `preventDefault()` + `stopPropagation()`。`preventDefault()` 同时压掉原生 `<dialog>` 的 cancel，因此 dialog / drawer / image-preview 的原生机制也由它统一接管——三者都必须自己登记，否则原生 cancel 被压掉后它们既不在候选里、也等不到兜底
- **身份是句柄而非面板**：`claim(panel)` 返回会话句柄，`release()` 幂等——调用方不必回忆当初传了哪个 panel。**登记即开启**，开启状态是声明而非询问，仲裁时不再回调宿主问 `isOpen()` / `isEscapeCloseEnabled()`；宿主除 `requestClose()` 外只再提供一个 `isConnected()`，且只被惰性回收读取——读 DOM 连接状态不是询问「我开着吗」
- **两种作用域分离**：实例作用域（`claim` / `scheduleFrame` / `invalidate` / `suspend` / `resume`）跨开合与断连存活；会话作用域（`setInert` / `adopt` / `contains` / `containsEvent` / `hasFocusWithin` / `release`）与一次开启同寿命。帧事务不能压进会话句柄，否则 `release()` 会误杀事务
- **「暂时不可关闭」只有一个通道**：`handle.setInert(boolean)`。静态策略（`no-escape-close`）与瞬时状态（drawer 拖拽中）都走它，不设第三个仲裁枚举值——属性可在开启期间改写，claim 时冻结的枚举会随属性切换而失效
- **惰性与会话同 lifetime**：新 claim 出来的层一律非惰性，因此「重新 claim」的路径（`anchored-panel.reconfigure`、同一 panel 重复 `open()`）之后必须按当前状态重推一次。这一步承重与否取决于该组件在 reconfigure 后是否会渲染：`updated()` 里每次渲染都同步的（select / autocomplete）会把紧随 claim 的那一行掩盖成防御性备份，而 `reconfigure` 不引发渲染的（popover）必须自己重推——两种形态都有判别锁。这是把静态策略做成动态通道的代价，也是该通道唯一需要调用方记住的义务
- **只表达两件真事**：`arbitration: 'none'` 表示「在树里但不参与仲裁」（tooltip）；多级子菜单用 `handle.adopt(panel)` 显式指名父级，因为 portal 面板与宿主物理分离，祖先链推不出组合关系
- **撤销时机跟随退场，不提前也不拖过动画**：`close()` 先把会话切到「可见但暂缓仲裁」，动画播完（或被重新 `open()` 以新会话取代）才撤销。旧实现「与 `open` 同拍立即撤销」把还在场上的面板留在未登记状态——未登记即不参与「谁是最内层」的仲裁。暂缓层只是兜底候选：仍在开启的层永远优先，所以「内层关掉后立刻再按一次 Escape」仍归属外层，「一次 Escape 关一层」不退化。与 `setInert` 的分工是所有权：惰性由调用方声明、会随渲染重推，暂缓态由生命周期进入、调用方没有途径跟着渲染重推它。动画播完而宿主仍认为开着时切回开启态（面板已隐藏，不再符合「可见但暂缓」的前提）：交还仲裁让 Escape 走宿主的关闭入口，把面板状态与宿主状态的不一致收敛掉，而不是让一个看不见的面板无限吞掉按键
- **登记表有兜底回收**：`Layer` 强引用 panel 与 host，漏 `release()` 会让整个组件无法回收，还会把 document 捕获监听永久留住。遍历登记表的入口（仲裁、release，以及建层**之前**的 claim）对 `!panel.isConnected && !host.isConnected()` 的层做惰性回收——判据取**同时**失联，因为面板可能被 portal 在容器间搬运、也可能只是短暂移除再放回。claim 路径的回收刻意跑在新层入表之前：「先 claim 再挂载」是合法时序，那一刻面板与宿主都还没连上，扫新层就会把它误判成死层删掉。dev 期另有 `__openOverlayLayerCount()` 测试钩子，让漏 release 在测试里是一个数字而不是 GC 推断
- **边界**：presence、滚动锁与 drawer 的层序（nested layers）仍归各自模块——它们回答视觉问题，与「谁是最内层」正交

## 后果

- 每个 Overlay 遵循明确的焦点模型；定位引擎唯一，私有路径需满足三条准入条件
- 调用方拥有祖先层叠上下文；库不修改也不兜底
- 组件对消费者节点的写入面严格受限
- Escape 归属由唯一仲裁者裁决，组件只声明「我开着」；新增浮层必须 `claim` 才参与仲裁，关闭时撤销时机跟随退场动画（见 §7）
- 新增受管组合时以 GroupController 承担成员与上行逻辑，@lit/context 仅下行
- 旧 token 命名不保留兼容别名；新组件属于哪一族就用哪个语义 radius token
