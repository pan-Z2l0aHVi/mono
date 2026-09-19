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

## 7. 开启态浮层归属

「哪一层正开着」由 `src/shared/overlay/open-overlay.ts` 独占，组件不再各自监听 Escape。合并前由三个模块分担同一件事（逻辑父子树、Escape 仲裁、帧事务失效），不变量没有主人，8 个浮层组件各自把它拼成三步登记协议。

- **唯一仲裁者**：document 捕获阶段监听 keydown，按「逻辑组合树下的最内层」归属一次 Escape，然后 `preventDefault()` + `stopPropagation()`。`preventDefault()` 同时压掉原生 `<dialog>` 的 cancel，因此 dialog / drawer / image-preview 的原生机制也由它统一接管——三者都必须自己登记，否则原生 cancel 被压掉后它们既不在候选里、也等不到兜底
- **身份是句柄而非面板**：`claim(panel)` 返回会话句柄，`release()` 幂等——调用方不必回忆当初传了哪个 panel。**登记即开启**，开启状态是声明而非询问，仲裁时不再回调宿主问 `isConnected()` / `isOpen()` / `isEscapeCloseEnabled()`
- **两种作用域分离**：实例作用域（`claim` / `scheduleFrame` / `invalidate` / `suspend` / `resume`）跨开合与断连存活；会话作用域（`setInert` / `adopt` / `contains` / `containsEvent` / `hasFocusWithin` / `release`）与一次开启同寿命。帧事务不能压进会话句柄，否则 `release()` 会误杀事务
- **「暂时不可关闭」只有一个通道**：`handle.setInert(boolean)`。静态策略（`no-escape-close`）与瞬时状态（drawer 拖拽中）都走它，不设第三个仲裁枚举值——属性可在开启期间改写，claim 时冻结的枚举会随属性切换而失效
- **惰性与会话同 lifetime**：新 claim 出来的层一律非惰性，因此「重新 claim」的路径（`anchored-panel.reconfigure`、同一 panel 重复 `open()`）之后必须按当前状态重推一次。这一步承重与否取决于该组件在 reconfigure 后是否会渲染：`updated()` 里每次渲染都同步的（select / autocomplete）会把紧随 claim 的那一行掩盖成防御性备份，而 `reconfigure` 不引发渲染的（popover）必须自己重推——两种形态都有判别锁。这是把静态策略做成动态通道的代价，也是该通道唯一需要调用方记住的义务
- **只表达两件真事**：`arbitration: 'none'` 表示「在树里但不参与仲裁」（tooltip）；多级子菜单用 `handle.adopt(panel)` 显式指名父级，因为 portal 面板与宿主物理分离，祖先链推不出组合关系
- **撤销时机与 `open` 同拍**，不等退场动画：关闭中的面板若仍是最内层，会把紧接着的 Escape 吞掉，外层永远等不到自己那一次
- **边界**：presence、滚动锁与 drawer 的层序（nested layers）仍归各自模块——它们回答视觉问题，与「谁是最内层」正交

## 后果

- 每个 Overlay 遵循明确的焦点模型；定位引擎唯一，私有路径需满足三条准入条件
- 调用方拥有祖先层叠上下文；库不修改也不兜底
- 组件对消费者节点的写入面严格受限
- Escape 归属由唯一仲裁者裁决，组件只声明「我开着」；新增浮层必须 `claim` 才参与仲裁，关闭时与 `open` 同拍 `release`
- 新增受管组合时以 GroupController 承担成员与上行逻辑，@lit/context 仅下行
- 旧 token 命名不保留兼容别名；新组件属于哪一族就用哪个语义 radius token
