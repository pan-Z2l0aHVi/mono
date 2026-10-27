# ADR-0029: web-ui 内置无障碍文案固定英文回退，覆盖通道统一挂 aria 前缀

- **Date**: 2026-10-27
- **Status**: 已接受
- **Relates to**: [ADR-0005](./0005-web-ui-component-architecture.md)（公共组件契约）

## 背景

`web-ui` 的图标控件（dialog/drawer 的关闭 button、input/textarea 的清除 button、input-number 的步进 button、back-top、layout 的侧栏 Toggle 与 resize handle、badge 的 status、image-preview 的控件组）必须在 Shadow DOM 内自带 accessible name——无名称的图标按钮是默认的无障碍违规，而这些控件不在消费方模板里，页面无处补名字。因此组件库不可避免要内置一批无障碍文案。

#471 之前的实现是散落在各组件里的英文字面量（badge、image-preview、textarea 至今如此），同一个语义在库内有 N 份拷贝、且没有任何覆盖通道。#471 把其中六个组件收口到 `src/shared/locale/builtin-labels.ts`，但选择了「跟随文档 `lang` 的 en/zh 双语表 + `LocaleController` 监听」方案，且 badge、image-preview、textarea 没有被收编，库内同时存在两套做法。本 ADR 重新裁定这批文案的定位与方案。

## 决策

### 1. 定位：无障碍名不是内容文案

「内容全部外部传入」的原则继续成立——empty 的 title/description、option、placeholder、菜单项等可见内容一律不内置。图标控件的 accessible name 是可访问性契约要求的组件内置部分，不属于内容文案：它必须有回退值，否则组件的默认用法即无障碍违规。

### 2. 回退固定英文，不做运行时本地化

词表只有英文一份；删除 `lang` 跟随、`LocaleController` 与 zh 词表。理由：

- 组件库没有消费方的语言上下文可用（无全局 provider，也不引入）；按 `lang` 猜语言只能覆盖 en/zh 两类文档，其余语言静默回落英文，语义上是个半成品。
- 运行期 `lang` 变化要靠 MutationObserver 驱动重渲染，为一个回退文案引入全局监听不成比例。
- 需要本地化的消费方走覆盖通道（下条），通道是完备的——这正是覆盖通道存在的意义。

### 3. 覆盖通道统一挂 aria 前缀，分界规则只有一条

所有「只喂 aria 属性、不影响功能」的 prop 统一以 `aria` 开头，消费方一眼可辨：

- **单标签组件**（一个控件一个名字）用专用 string attribute：`aria-dialog-label`、`aria-close-label`（dialog/drawer）、`aria-clear-label`（input/textarea）、`aria-decrease-label`/`aria-increase-label`（input-number）；back-top/badge 复用标准 `aria-label`。
- **多 key 成套组件**（一处 UI 多个名字）用成组对象 property `ariaLabels`（`attribute: false`，沿 `overlayContainer` 的对象 property 先例）：`ImagePreviewAriaLabels`（close/previousImage/nextImage/zoomIn/zoomOut/resetZoom）、`LayoutAriaLabels`（collapseSidebar/expandSidebar/resizeSidebar/openNavigationMenu/mainNavigation）。

badge 的宿主 `aria-label` 设置后三种状态（dot/计数/零）共用，支持 `{count}` 占位插值。样表、解析（覆盖优先）与插值统一住在 `src/shared/locale/builtin-labels.ts`，badge、image-preview、textarea 同批收编，库内不再有游离字面量。

### 4. 不建全局 locale provider

消费方级别的批量本地化（例如整站中文）目前没有真实需求；等需求出现再引入 provider 或全局注册表，避免为未到来的需求固化 API。覆盖通道在单组件粒度是完备的。

## 后果

- 内置名不再随 `lang` 变化：中文文档默认读到英文可访问名，需要本地化的页面逐组件设置覆盖属性。这是明确接受的取舍——旧方案的 en/zh 之外本来就静默回落英文，新方案把这一点变成一致行为并写进文档。
- `close-label`/`clear-label`/`decrease-label`/`increase-label` 随 #471 引入且尚未发布，直接以 aria 前缀形态发版；`dialog-label` 自 11.1.0 已发布，改名属破坏性变更，因此保留旧 attribute 作为 deprecated 转发别名（canonical 名为 `aria-dialog-label`），下个 major 移除。
- `src/shared/locale/builtin-labels.ts` 不在包导出面，样表是内部实现；各组件文档的 API 表是它对外的唯一投影。
- 新增图标控件时必须从样表取词并登记 key（多 key 组件加进对应 `*AriaLabels` 接口），不允许模板内写 aria 文案字面量。
