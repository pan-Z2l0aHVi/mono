# ADR-0031: Layout 页面结构、Banner 与可折叠 Sidebar

## 背景

`web-ui-layout` 需要提供桌面端可折叠 Sidebar 与移动端 Drawer，同时保持页面级滚动。原 CSS Grid 方案将 Sidebar、Header 和内容区绑定在一个高度模型中，难以同时处理可选 Banner、sticky 定位、窄视口 Overlay 与 Consumer 自定义 Sidebar 内部布局。

## 决策

### 1. 页面级布局

组件采用 Flexbox 页面壳：Banner 位于顶部，正文由 Sidebar 与内容区组成。

```text
┌─────────────────────────────────────────┐
│                 Banner                  │
├───────────┬─────────────────────────────┤
│ Sidebar   │ Header（sticky）             │
│ （sticky）├─────────────────────────────┤
│           │ Main Content（页面滚动）     │
└───────────┴─────────────────────────────┘
```

- 页面使用自然文档滚动；不创建内容区滚动容器。
- `header` 仅在内容区内 sticky。
- `banner` 是可选全宽区域，随页面滚动。
- 断点保持 `640px`；暂不引入平板专用模式。

### 2. Banner 与 Desktop Sidebar 的可见高度

Sidebar 使用 relative wrapper + `position: sticky`。当 Banner 仍出现在视口内时，组件以 Banner 的**当前可见高度**缩短 Sidebar；Banner 完全滚出后可用高度恢复为整个视口。

```text
Banner 可见： Sidebar top = Banner 可见区域下方，bottom 保留卡片间距
Banner 滚出： Sidebar top = 0，bottom 保留卡片间距
```

实现通过观察 Banner 尺寸并在页面滚动时更新内部 CSS custom property 完成。不能只使用“是否存在 Banner”的布尔值：Banner 高度可变，并且它在滚出过程中的可见高度会连续变化。

这项约束保证圆角 `aside-panel` 的底部与 Toggle 始终完整可见；book-fe 的连续侧栏表面可以容忍视口裁切，但本组件的浮层卡片视觉不能照搬该取舍。

### 3. Sidebar 的公共边界：单一 `sidebar` slot

仅保留一个 `sidebar` slot。Layout 负责：

- Sidebar 的可用高度、圆角 glass 卡片和桌面端折叠宽度；
- 桌面端固定在卡片底部的 Toggle；
- 移动端 headless Drawer 的 Overlay、遮罩、焦点和关闭语义。

Layout **不负责**：

- Consumer Sidebar 内部哪一部分滚动；
- Consumer 的 Logo、搜索、分组标题、用户区或多滚动区如何排列；
- Consumer 的内部 header/footer 是否固定。

因此 layout 内部的 sidebar viewport 仅提供受约束的 `flex: 1; min-height: 0` 几何区域，不设置 `overflow-y: auto`。Consumer 若要滚动，应自行传入一个高度受约束的 root，例如：

```html
<div slot="sidebar" class="sidebar-root">
  <div class="sidebar-title">组件列表</div>
  <nav class="sidebar-nav">...</nav>
</div>
```

```css
.sidebar-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.sidebar-title {
  flex-shrink: 0;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

此前的 `sidebar-header` 与 `sidebar-footer` slot 不属于公共契约。它们把 Consumer 的内部信息架构固化为“固定头部 / 强制滚动中间区 / 固定底部”，不适合作为通用组件库的默认模型。

### 4. Toggle 与 Sidebar 内容的关系

Desktop Toggle 是 layout 自己的固定 footer，而不是 `sidebar` slot 内容的一部分。它由 panel 的 Flexbox 布局固定在底部，不依赖 `position: sticky` 覆盖 Consumer 内容。

这样不再需要用 footer 背景遮住导航内容；Consumer 控制的 scrollport 与 Toggle 区不会重叠。

折叠状态：

- `sidebar-collapsed=false`：展开宽度默认 `240px`；
- `sidebar-collapsed=true`：宽度默认 `72px`；
- 仅隐藏 Consumer 的 sidebar 内容，Toggle 始终可访问；
- 状态不持久化，`sidebar-collapsed` 是桌面端受控属性；Toggle 只派发变更请求，Consumer 回写属性后才改变布局。

### 5. 移动端

在 `640px` 及以下：

- 页面仍显示 Banner、Header、默认内容与 Tabbar；
- Sidebar 使用带有 `dialog-label="主导航"` 的 `web-ui-drawer[headless][controlled]`，复用 native dialog、backdrop、placement 动画、Escape/遮罩关闭和 scroll lock；Drawer 的用户关闭行为仅请求 `sidebar-open=false`，由 Consumer 回写后才关闭；headless Drawer 必须显式提供 `dialog-label`，确保其内部原生 dialog 具有可访问名称；
- Drawer 内渲染与桌面端相同的圆角 glass Sidebar 卡片，但没有 Drawer 内置 header、footer 或关闭按钮；
- Header 行内显示打开菜单的 Toggle；移动端不显示桌面端底部 Toggle；`sidebar-open` 是移动端 Drawer 的独立受控属性。

`headless` 切换不得替换已打开的原生 `<dialog>`；组件必须保留同一个 dialog 实例，避免脱离 top layer。

### 6. 公共 API

```ts
// 属性
sidebarCollapsed: boolean // attribute: sidebar-collapsed，桌面端受控折叠状态，默认 false
sidebarOpen: boolean      // attribute: sidebar-open，移动端 Drawer 受控打开状态，默认 false
sidebarWidth: string      // attribute: sidebar-width，默认 '240px'
collapsedWidth: string    // attribute: collapsed-width，默认 '72px'

// 事件：用户交互只请求变更，Consumer 负责回写相应属性
'sidebar-collapsed-change': CustomEvent<{ collapsed: boolean }>
'sidebar-open-change': CustomEvent<{ open: boolean }>
```

插槽：`banner`、`header`、`sidebar`、`tabbar`、默认插槽。

## 后果

- Sidebar 内部结构不再被 layout 强制拆成多个 slot，Consumer 可以实现单滚动区、多滚动区或完全不滚动的 Sidebar。
- Demo 必须显式展示 Consumer-owned scrollport：其根元素填满可用高度，真正的导航元素使用 `flex: 1; min-height: 0; overflow-y: auto`。
- React 与 Vue demo 都必须将 `sidebar-collapsed-change` / `sidebar-open-change` 回写到对应的受控属性，作为两个状态模型的集成验证。
- Banner 的可见高度成为 Sidebar 尺寸计算的一部分，增加了 ResizeObserver 与滚动同步实现，但保证圆角卡片在 Banner 出现、收缩和消失时视觉完整。
- 不引入 `sidebar-header` / `sidebar-footer`：它们曾作为候选设计被否决，因为会将 Consumer 的内部信息架构固化为固定头部、强制滚动中间区和固定底部。

### 7. 桌面端 Sidebar 拖拽调宽

`sidebar-resizable` 启用后，桌面 Sidebar 右缘渲染 resize handle（折叠态隐藏）。拖拽调宽与折叠解耦：仅夹紧在 `[min, max]` 与视口内，不联动 `sidebar-collapsed`。

- `sidebar-min-width`（默认回退 `collapsed-width`）：拖拽下限，防止拖到不可用宽度（单位按 px 解析）；
- `sidebar-max-width`：调用方可配置上限（单位按 px 解析）；组件内置硬上限为视口宽度的一半（50vw）且优先于配置值生效，Sidebar 永远不会占据超过一半视口。

**受控契约**：拖拽中组件内部实时更新宽度（禁用 `width` transition，跟手），`pointerup` 派发 `sidebar-width-change`（`CustomEvent<{ width: string }>`，如 `'312px'`）；Consumer 回写 `sidebar-width` 后新宽度正式生效。`pointercancel` 清临时宽度并恢复 prop 管辖宽度，不派发事件。零位移松手（点击）不派发。这与现有的 `sidebar-collapsed-change` 受控模型一致（ADR-0007）。

**键盘交互**：handle 采用 WAI-ARIA splitter 模式（`role="separator"` + 方向键）。←/→ 以 16px 步进（Shift 64px）调整临时宽度，Home/End 到 min/max，Enter 以同一 `sidebar-width-change` 请求提交，Escape 撤回。键盘调整与指针拖拽共用同一临时宽度字段；指针抓取会隐式放弃键盘未提交的调整。

宽度状态由 prop 持有，组件不持久化、不引入“第三种宽度”。双击重置等额外手势不在范围内。
