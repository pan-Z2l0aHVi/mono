# ADR-0045: Web UI autocomplete custom values

- **Date**: 2026-09-05
- **Status**: 已接受

## 背景

`web-ui-autocomplete` 的 `value` 一直是表单值，输入可以保留候选之外的文本；但组件没有把这类文本作为一次选择提交的公共契约。面板打开时，`Enter` 只在有活动 option 时触发 `change`，消费端若要支持新建标签，只能监听未拦截的 `keydown` 并自行读取 `value`。

## 决策

**新增 `allow-custom-value`（property: `allowCustomValue`），默认关闭。**

- 开启后，面板打开、无有效活动 option、且输入不精确匹配任何 option label 时，`Enter` 将当前输入原文作为 custom value 显式提交。
- 提交时关闭面板并派发 `input` + `change`；`value` 保留原文，不自动 trim。
- `selected-value` 继续表示 option identity。custom value 没有 option，因此保持空字符串。
- 组件不会自动创建 `<web-ui-option>`，也不会维护历史候选；候选集仍由消费端拥有。
- 精确匹配仍使用 trim + lowercase。若文本命中非禁用 option，即使没有 Arrow 激活项，也按 option 选择流程回填 label 并提交。
- 文本命中 disabled option 时，不选择该 option，也不允许把它当作 custom value 绕过禁用语义。
- `selected-value` 派生时忽略 disabled option，保证其只反映可选择的 option identity。
- 程序化或初始 `value` 不触发提交事件；custom value 只响应用户显式 `Enter`。

## 后果

- “补全是增强，不约束输入”的 autocomplete 语义有了显式开关；消费端不再依赖 keydown 冒泡这一实现细节。
- custom value 和 option 选择共用 `change` 事件，消费端通过 `selectedValue === ''` 区分两者，避免扩展事件模型。
- 该开关只影响 Enter 提交路径；blur、点击外部和程序化值提交仍不由组件隐式完成。

## 替代方案

- 无开关默认启用会改变现有消费者的 Enter 行为。
- 独立 `custom-change` 事件会增加事件模型分叉。
- 自动创建 option 会把业务候选集的所有权移入展示组件，违背受管子元素组合边界。
