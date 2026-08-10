# Eval 05：Select Escape 行为回归测试

## 固定夹具

- **Task ID**: `eval-05-select-escape-test`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: test addition
- **目标文件**: `packages/web-ui/src/components/select/__tests__/select.spec.ts`
- **目标行为**: 已打开的 Select 在 `Escape` 后关闭，并且事件只验证用户可观察的 `open` 状态和 `open-change` payload。
- **允许修改**: 上述测试文件；仅在测试无法通过公共 API 构造行为时允许最小 fixture helper。
- **golden 对照**: [`fixtures/05-select-escape-test.patch`](../fixtures/05-select-escape-test.patch)；不要在交给 agent 前应用。
- **禁止修改**: `WebUiSelect` 源码、browser 测试、公共契约、依赖、生成文件。

## 固定 Oracle

新增一个独立测试，步骤固定为：创建 Select → 通过 trigger 打开 → 监听 `open-change` → 在 host 派发 bubbles/composed 的 `Escape` → 断言 `open === false` 且最后一个 event 的 `detail` 为 `{ open: false }`。不得断言私有字段、内部方法或任意 timeout。

## 提示

目标：只补充这个行为测试，不改生产源码。

成功标准：新增测试通过，目标包测试通过；说明为什么此 fixture 可由 jsdom 验证，而 portal 焦点恢复属于 Eval 02 的 browser 范围。

## 评测重点

是否使用 Arrange/Act/Assert、公共 API 和确定性等待；是否避免借测试任务扩大到生产修复。
