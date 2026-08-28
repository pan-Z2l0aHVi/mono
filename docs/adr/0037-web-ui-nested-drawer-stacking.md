# ADR-0037: Nested Drawer 声明式层叠与自适应阶梯露边

## 背景

在多级导航、详情探索和复杂确认流中，用户常在一个 Drawer 内部唤起另一个 Drawer。传统组件库处理嵌套抽屉（Nested Drawer）通常有两类问题：

1. **专有容器或强制 API**：需要引入专门的 `<DrawerRoot>` 或 `nested` prop，增加了使用心智与心智负担。
2. **同向遮挡与缺乏纵深**：后打开的抽屉直接盖住底层抽屉；若底层抽屉缩小而依然贴边，底层卡片会被顶层卡片完全挡住；若多层抽屉宽度各不相同（如父窄子宽或宽窄乱序交错），固定偏移会导致某些底层抽屉被上方更宽的抽屉完全遮挡。
3. **视觉噪声与手势竞争**：多层抽屉同时处于打开态时，若底层抽屉依然显示边缘拖拽条（drag bar），会导致边缘并排出现多条 drag bar，产生视觉混乱且容易诱发非顶层手势竞争。

## 决策

### 1. 声明式层序感知（无额外 API）

- 用户只需声明式嵌套 `<web-ui-drawer>` 实例，组件底层利用原生 Top Layer 特性（`showModal()` 的调用顺序即为 Top Layer 堆叠顺序）。
- 通过 `nested-drawer-layers.ts` 插件在全局 Set 中追踪打开的 dialog。
- 深度计算：$\text{depth} = \text{在我之后打开且仍在打开状态的抽屉数量}$。顶层抽屉 depth 为 0，下层依次递增。
- 上层抽屉关闭时，通过 `document` 捕获阶段监听原生 `close` 事件（`close` 不冒泡但在捕获阶段可观测），自动触发下层抽屉的 depth 重算并平滑回弹。

### 2. 等比缩放与自适应上方最大宽度平移补偿

- **等比缩放**：非顶层抽屉按 $S = 0.95^{\text{depth}}$ 进行几何缩放。
- **上方最大宽度感知与补偿**：
  - 计算排在当前抽屉之后的所有上层抽屉沿主轴的最大尺寸 $W_{\text{above\_max}}$；
  - 宽度差补偿：$\text{sizeDiff} = \max(0, W_{\text{above\_max}} - W)$；
  - 自身缩放内缩：$\text{shrink} = W \cdot (1 - S) / 2$；
  - 总向内侧平移位移：$\text{shift} = \text{shrink} + \text{sizeDiff} + \text{depth} \times 12\text{px}$。
- **全场景自适应支持**：
  - **等宽嵌套**（如 $320\text{px} \to 320\text{px}$）：每层等距向内露边 $12\text{px}$；
  - **级联收窄**（如 $500\text{px} \to 360\text{px} \to 260\text{px}$）：底层宽面板大面积展开，层层收窄；
  - **乱序交错**（如 $300\text{px} \to 520\text{px} \to 240\text{px} \to 400\text{px}$）：窄抽屉感知到上方的超宽抽屉后自动增大平移越过宽面板，严格保证由底至顶从左至右阶梯露边，杜绝遮挡。

### 3. 独立 `scale` 与 `translate` 属性解耦

- Nested 层叠使用现代 CSS 独立标准属性 `scale` 与 `translate`；
- 避免直接拼接写入 `transform` 字符串，使层叠过渡与拖拽关闭 / 弹簧回弹位移在 CSS 层面完全正交、互不覆写；
- 变量更新由 CSS transition 触发平滑过渡（$450\text{ms}$，`cubic-bezier(0.22, 1, 0.36, 1)`）。

### 4. 交互独占与非顶层降噪

- **键盘与遮罩独占**：Escape 键按下与遮罩点击通过 `composedPath` 拦截子 dialog 冒泡，确保仅作用于最顶层 Drawer，实现逐层退出；
- **视觉降噪**：非顶层抽屉（`depth > 0`）自动标记 `.is-nested-lower`，其 `.wui-drawer-drag-zone` 样式将 `opacity` 平滑过渡至 `0` 且 `pointer-events: none`，消除并排重复拖拽条，露出纯净的圆角卡片边框与阴影。

## 后果

- 开发者无需手动计算偏移或使用专有嵌套容器，任意组织 Drawer 均能获得对齐 Base UI / iOS Card Stack 的高级层叠体验。
- 支持任意尺寸、任意嵌套方向与任意乱序宽度的自适应对齐。
- 全量浏览器测试与 React/Vue Demo 均已覆盖并验证该机制。
