# ADR-0042: Web UI 浮层定位引擎策略

- **Date**: 2026-09-07
- **Status**: 已接受

## 背景

`packages/web-ui` 的共享定位层是 `src/shared/overlay`：`defineOverlay` 封装 `@floating-ui/dom` 的 `computePosition` + `autoUpdate` 与 middleware 管线（offset、flip、shift、宽度管理），`defineAnchoredPanel` 在其上组合 portal 与 presence。语义一致的浮层全部经由共享层定位：dropdown 直接用 `defineOverlay`，tooltip、popover、select、autocomplete 经 `defineAnchoredPanel`；这些组件对 floating-ui 只保留 `type Placement` 的 type-only 引用。

`context-menu` 的定位语义与 `defineOverlay` 的能力面存在实质分歧：光标 virtual anchor、clamp-only（不 flip）、零 offset、无 `autoUpdate`（菜单刷新时重定位）、transform-origin 需从 shift 增量推导，且为普通场景保留手写的同步视口钳制快路径，仅当 panel 进入 open native dialog（fixed 坐标相对 dialog padding box 解析）时才走 Floating UI 换算。拉平到共享层需要为单一消费者新增 crossAxis、middlewareData 回调、`autoUpdate` 开关等旋钮，而快路径分支仍须存在；`defineOverlay` 预留的 `OverlayVirtualAnchor` 不足以覆盖该语义面。

## 决策

**定位引擎唯一，定位路径按语义准入分级。**

- 全库唯一定位引擎为 `@floating-ui/dom`，版本由 workspace catalog 锁定；不得引入第二定位引擎或绕过 catalog 的版本分叉。
- 语义一致的浮层默认经 `defineOverlay` / `defineAnchoredPanel` 定位；组件对 floating-ui 只允许 type-only 引用（如公共 prop 的 `Placement`）。
- 语义分歧的浮层可以拥有私有定位路径（运行时直接使用 floating-ui），准入条件：
  1. 使用同一引擎与同一 catalog 版本；
  2. 分歧理由以注释成文于组件内，并指回本 ADR；
  3. 引擎级通用知识（如 dialog 内浮层坐标换算、由 shift 增量推导 transform-origin）在第二个组件出现时必须评估下沉到 `src/shared/overlay`，不允许第三处复制。
- `defineOverlay` 不为单一消费者扩展配置旋钮；能力面扩展以出现第二个真实消费者为前提。

context-menu 是私有定位路径的首个案例：其双路径设计（普通场景同步钳制、dialog 场景 Floating UI 换算）与 clamp-only 语义保留在组件内，属有意分工而非待修复的越层。

## 后果

- 定位行为修复可能两侧同修：共享路径与私有路径需各自验证。dialog 内浮层解析的修复已经实际发生两侧同修，该成本被接受。
- review 依据从"是否走了 shared"改为"是否满足三条准入条件"；组件内直引 floating-ui 不再默认视为越层违规。
- `OverlayVirtualAnchor` 注释不再以右键菜单举例，避免误导贡献者去"补接"一个不存在的遗漏。

## 后续方向

- 出现第二个需要 dialog 内 clamp 定位的菜单类浮层时，把该路径抽为 `src/shared/overlay` 的共享 helper，context-menu 迁入。
- `defineOverlay` 出现第二个 crossAxis 或 middlewareData 类消费者时，再扩展其选项面。

## 替代方案

- 扩展 `defineOverlay`（crossAxis、middlewareData 回调、`autoUpdate` 开关）并迁移 context-menu：为单一消费者堆积旋钮，"非 dialog 绕过 Floating UI"的分支仍要进入共享层，抽象层最终还是要知道 context-menu。
- 立即抽取 dialog 定位 helper：当前只有一个组件、两处调用在同一文件内，收益不抵 YAGNI。
- 不记录本决策：`OverlayVirtualAnchor` 预留了 virtual anchor 但 context-menu 未走 `defineOverlay`，未来贡献者会反复把分叉当缺陷修复。
