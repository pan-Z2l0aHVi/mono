# Eval 03：Select `open-change` 契约影响报告

## 固定夹具

- **Task ID**: `eval-03-select-open-change-contract`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: analysis only
- **变更请求**: 将 `web-ui-select` 的 `open-change` 从 `CustomEvent<{ open: boolean }>` 改为 `CustomEvent<{ open: boolean; reason: 'trigger' | 'escape' | 'outside' | 'selection' }>`。
- **目标证据**: `packages/web-ui/src/components/select/index.ts` 的 `_dispatchOpenChange()`、`packages/web-ui/src/types/react.ts`、React/Vue type fixture、Select 测试与 demo。
- **禁止修改**: 所有源码、测试、依赖、文档和 Git 状态。

## 固定 Oracle

报告必须明确：

1. 现有事件的 `detail` 只有 `{ open }`，且事件使用 `bubbles: true`、`composed: true`；
2. 必须同步的表面至少包括 Select 事件测试、React/Vue 类型适配或 type fixture、消费该事件的 demo；
3. `reason` 的语义、程序性开闭是否派发事件、option selection 是否属于 `selection` 都是需要先决策的兼容边界；
4. 给出最小实施方案、根级验证要求和不能自行决定的取舍。

## 提示

目标：只输出兼容影响报告与实施选项，不改代码。

成功标准：按固定 Oracle 完成、列出精确文件路径和验证命令；不得将“查找所有 open-change”替代 Select 的具体契约结论。

## 评测重点

是否使用公共契约、类型适配和消费者源码作为事实来源，是否将长期事件语义升级为待批准决策。
