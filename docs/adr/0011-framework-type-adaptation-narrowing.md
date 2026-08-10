# ADR-0011: Web UI 框架类型适配收窄

- **Date**: 2026-08-09
- **Status**: 已接受
- **Supersedes**: [ADR-0003](0003-web-component-strategy.md) 中「框架类型封装」与「新组件需要同时更新两个类型辅助文件」的相应部分

## 背景

ADR-0003 确立了 Lit 自定义元素 + 框架类型封装（`types/react.ts`、`types/vue.ts`）的路线。该路线可以工作，但存在四类问题：

- **Vue 全局污染**：`types/vue.ts` 通过 `declare module 'vue'` 全局扩展 `ComponentCustomProps extends HTMLAttributes`，把全部 DOM 属性和原生事件 handler 注入**每一个** Vue 组件，并导致 web-ui 组件的 `@input`/`@change` 在「组件 emit」与「全局原生 `onInput`」之间形成联合类型，`$event.target` 退化为 `EventTarget | WebUiXxx | null`——这是多数 Vue cast 的根因。
- **React 非惯用别名**：`ExactEventListeners` 同时生成 `onInput`（惯用）与 `oninput`（lowercase，非惯用），后者与 React 19 的 camelCase 事件体系重复。
- **宿主 target 重复书写**：每个组件的 `$events` 条目手写 `& { target: WebUiXxx }`。宿主类型本就是包装器泛型，应在适配层自动注入，而不是在 20 个组件里重复。
- **标签清单重复**：React/Vue 各手写一份完整组件映射，与组件 barrel 应派生的 `WebUiElementMap` 不一致；新增组件需同步更新两处。
- **`ExtractProps` 为启发式提取**：TypeScript 无法从 Lit decorator 精确反射 reactive properties。本次不引入 Custom Elements Manifest 或 codegen。

## 决策

采用纯类型适配，不新增运行时 wrapper 或 npm 依赖。

### 1. `WebUiElementMap` 单一权威来源

组件 barrel（`components/index.ts`）从各组件 `declare global { interface HTMLElementTagNameMap }` 派生并导出：

```ts
export type WebUiElementMap = {
  [K in keyof HTMLElementTagNameMap as K extends `web-ui-${string}` ? K : never]: HTMLElementTagNameMap[K]
}
```

React/Vue 的 `WebUiComponents` 通过 mapped type 生成全部标签，删除两份手写组件 import 与映射清单。新增组件只需添加 `HTMLElementTagNameMap` 声明。

### 2. 事件分层

- 组件 `$events` 只声明事件本体：`input: Event`、`focus: FocusEvent`、`'open-change': CustomEvent<{ open: boolean }>`。宿主 target 注入发生在适配层（`types/utils.ts` 的 `WithHost`），统一收窄为 `TYPE & { readonly target: WebUiXxx; readonly currentTarget: WebUiXxx }`。
- 导出 `WebUiEvent<Component, EventName>`，供 Vue 命名 handler 等无法从上下文推导 `$event` 的位置显式标注。
- 无公共事件的组件不声明空 `$events`；`web-ui-option` 的注册/更新事件是 select 的内部协议，不作为框架公共事件类型暴露。
- 保留 `$events` 作为既有类型级协议；类型层本身不改运行时事件名或派发顺序。复合控件的事件冒泡边界变更是有意为之的运行时收敛（见第 4 节），与类型层解耦。

### 3. React 适配

- 标准 DOM 事件（`input`/`change`/`focus`/`blur`）使用 React 19 惯用 camelCase handler，保留对应 SyntheticEvent 类型，`currentTarget` 经 `HTMLAttributes<T>` 收窄到组件实例；`target` 遵循 React SyntheticEvent 语义（`EventTarget`），**不承诺**为组件实例——这是 React 合成事件中可靠且惯用的读取位置。
- kebab-case 自定义事件（`open-change`/`toast-close`）仅生成精确的 `onopen-change`/`ontoast-close` 绑定，handler 参数携带宿主化的 `CustomEvent<T>`（`target`/`currentTarget` 均收窄）。
- 移除非惯用的 lowercase `oninput`/`onchange` 类型别名。

### 4. 复合控件事件边界

`checkbox-group`/`radio-group`/`segmented` 管理各自子项（checkbox/radio/segmented-trigger）。为保证 `WithHost` 对 `target`/`currentTarget` 的收窄在 group 上成立：

- group 管理的子项仍向自身直接监听器派发标准 `input`/`change`，但事件以 `bubbles: false, composed: false` 派发，不再冒泡或穿越 Shadow DOM 外泄同名事件。
- group 以 capture 相位监听子项 `change`，在 slot/mutation 同步时无需逐子订阅，并在断连时释放监听。
- group 只派发一次自己的 `input` 再 `change`，两者 `target`/`currentTarget` 均为 group；独立使用子控件时保持 `bubbles: true, composed: true`。

### 5. Vue 适配

- **删除全局 `ComponentCustomProps extends HTMLAttributes`**，不再污染其他 Vue 组件。
- 每个 `LitVueWrapper` 局部合并 `HTMLAttributes`，排除与该组件 emit 重名的 handler（如 emit `input` → 排除 `onInput`）后再加入精确 emit，消除联合类型，`$event.target` 直接是组件实例。
- 未声明对应 emit 的原生事件（如 checkbox/radio 的 `@focus`/`@blur`、无 `$events` 组件的 `@click`/`@keydown`）仍通过各包装器的局部 `HTMLAttributes` 支持。
- 使用 Vue 3.5 的 element 类型参数（`DefineComponent` 的 `TypeEl`）声明实际 Custom Element host，模板 `ref`/`$el` 为具体元素类型。

### 6. 框架版本基线

`@types/react` peer 收窄到 `>=19`，`vue` peer 收窄到 `>=3.5`。作为破坏性变更发布（major bump）。

## 后果

- **类型改进**：Vue 消费端 `@input`/`@change` cast-free；React 无 lowercase 别名；模板 ref 类型精确；非 web-ui 组件不再被全局添加 HTML attrs。
- **维护简化**：新增/重命名组件只需维护 `HTMLElementTagNameMap` 声明；适配层从 `WebUiElementMap` 自动覆盖。
- **破坏性变更**：Vue 全局 `ComponentCustomProps` 移除、React lowercase 事件别名移除、peer 基线提升、复合控件中 group 管理的子项事件不再冒泡到 group 外（group 上只收到一次 host 事件）。对既有消费者需相应调整（本仓库 demo 与类型 fixtures 已同步清理）。
- **不引入**：运行时 wrapper、Custom Elements Manifest、codegen。`ExtractProps` 保持启发式提取，公共边界按需显式标注。

## 替代方案

- **保留全局 `ComponentCustomProps`**：会使 Vue cast 继续存在并持续污染所有组件，已由 ADR-0007 的 P1 评审否决。
- **运行时框架 wrapper**：为每个组件生成 React/Vue 包装组件。与「单一 Lit 实现服务所有框架」冲突，增加运行时成本与维护面，不采用。
- **Custom Elements Manifest / codegen**：可精确反射属性与事件，但引入生成管线与依赖，与当前纯类型方案收益不匹配，不采用。
