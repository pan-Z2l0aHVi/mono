# ADR-0016: Web UI 内置 Accessible Name

- **Date**: 2026-10-27
- **Status**: 已接受

## 背景

组件内部的图标控件需要默认 accessible name。调用方无法直接给 Shadow DOM 内部控件添加名称，同时可能需要按页面语言覆盖文案。

## 决策

`web-ui` 为内置控件提供英文 accessible name 回退；调用方通过公开 prop 覆盖。只用于 ARIA 的覆盖 prop 使用 `aria` 前缀，单个名称使用 string attribute，成组名称使用对象 property。词表和具体 API 以组件实现与文档为准。

组件库不根据 document `lang` 自动选择内置翻译，也不为此引入全局 locale provider。可见内容仍由调用方提供，accessible name 是默认无障碍契约的一部分。

## 后果

默认控件有名称，但非英文页面需要调用方提供本地化覆盖。集中词表减少同义文案漂移，新增控件仍需声明名称及覆盖方式。
