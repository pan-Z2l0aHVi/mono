# ADR-0044: Web UI 语义 Radius Token 体系

- **Date**: 2026-09-08
- **Status**: 已接受

## 背景

组件圆角长期是各组件 CSS 里的散点字面量：`calc(infinity * 1px)`、`20px`、`24px`、`28px`、`32px` 混用，同一视觉族（浮动菜单面板 20px、覆盖层卡片 24/28/32px）没有统一来源，Consumer 只能逐组件覆盖。glass 描边光影的 `--wui-glass-corner-radius` 也由各组件写死字面量，与自身 border-radius 靠人工保持同步，覆盖 border radius 时光影脱节。

候选方案：

1. **数字 scale（xs/sm/md/lg…）**：命名与尺寸绑定，语义仍需二次映射，且暗示可自由取档，与「组件族决定形状」的意图冲突。
2. **公开 shape 层**：再引入一层 `--wui-shape-*`，在 control/menu/overlay 之上重复表达同一概念。
3. **三个语义 radius token**：按组件族的形状语义命名，值即视觉事实。

## 决策

- `<web-ui-theme>` 新增三个公开语义 token，不引入数字 scale，不引入公开 shape 层：
  - `--wui-radius-control: calc(infinity * 1px)` — pill 形小控件（button、input、input-number、select trigger、option、dropdown item、segmented、button group、badge、avatar circle、slider、switch、autocomplete input wrapper、spinner 内条、toast close、drawer drag bar 及 pill 形 focus outline）。
  - `--wui-radius-menu: 18px` — menu/popover 类浮动面板与多行输入（textarea、select panel、autocomplete panel、tooltip、popover、menu portal）。
  - `--wui-radius-overlay: 28px` — 大型覆盖层与独立浮动卡片（dialog、drawer、layout sidebar、toast）。
- 兼容 token 保留并默认联动：`--wui-drawer-radius` 与 `--wui-layout-sidebar-radius` 的 fallback 改为 `var(--wui-radius-overlay, 28px)`，仍可独立覆盖。sidebar 默认值因此从 24px 统一为 28px。
- 非 pill radius 与 glass corner 联动：menu/overlay 族玻璃表面把 `--wui-glass-corner-radius` 指向自身语义 radius（drawer 指向 `--wui-drawer-radius`），覆盖 token 时 border-radius 与对角光影一起变化。pill 控件例外——glass 光影渐变是锚定角点的固定物理尺寸径向圆，infinity 无法作为渐变半径，pill 使用自身实际尺寸或内部尺寸 token 派生的有限几何值。
- 方形小形状不进入公共 theme，作为组件内部值以 `--wui-internal-*` 接线命名留在组件 CSS 的 var fallback 中：checkbox `6px`、avatar square `12px`、empty icon 容器 `16px`。Consumer 覆盖语义 radius 不影响这些形状；组件自身如需暴露形状覆盖，另按组件 token 契约另行开放。

## 后果

- 视觉上浮动面板族统一收紧到 18px（原 20px），覆盖层族统一到 28px（dialog 原 32px、sidebar 原 24px、toast 原 20px）；这是对「大圆角」视觉语言的收敛，属公共可见变更，由 changeset 记 minor。
- 组件 CSS 不再各自决定族默认值：新组件属于哪一族就用哪个 token，不再新增圆角字面量。
- glass corner 与 radius 的同步从人工约定变成 token 引用；新增非 pill 玻璃表面时必须同样引用语义 radius，否则覆盖 token 时光影脱节。
- `--wui-drawer-radius`、`--wui-layout-sidebar-radius` 仍是组件级覆盖入口，优先级高于语义 token。
- 本文接续 ADR-0030（语义 token 体系）与 ADR-0032（drawer 浮动卡片，其 `--wui-drawer-radius` fallback 语义由本文改为联动 overlay）。
