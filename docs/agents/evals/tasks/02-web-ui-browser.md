# Eval 02：Portal Select Escape 焦点恢复

## 固定夹具

- **Task ID**: `eval-02-select-escape-focus`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: implementation + browser
- **目标文件**: `packages/web-ui/src/components/select/index.ts`，`WebUiSelect._onKeydown()` 的 `Escape` 分支
- **测试文件**: `packages/web-ui/src/components/select/__tests__/select.browser.spec.ts`
- **允许修改**: Select 实现、对应 unit/browser test、必要 demo 验证代码
- **禁止修改**: overlay ADR、公共事件/属性契约、无关组件、生成文件、依赖和 Git 配置

## 已知失败行为

baseline 的 `Escape` 分支只调用 `_close()`，没有显式恢复 `.select-trigger` 焦点。临时 task worktree 应用 [`fixtures/02-select-escape-focus.patch`](../fixtures/02-select-escape-focus.patch) 后，固定 browser fixture 创建 `portal = true` 的 Select，点击 `[role="combobox"]` 打开，将 trigger blur 后派发 `Escape`；关闭后的 oracle 是：

```ts
expect(select.open).toBe(false)
expect(select.shadowRoot?.activeElement).toBe(trigger)
```

该 fixture 在 baseline 上失败，修复后必须通过。

## 提示

目标：Portal Select 按 Escape 关闭后，将键盘焦点恢复到 combobox trigger。

成功标准：

- portal 模式下的固定 fixture 通过；
- 非 portal Escape 关闭、option 选择、outside click 和 disabled 行为不回归；
- 运行相关 browser-mode 测试；
- 在真实 React 或 Vue demo 中验证：打开 → 将焦点置于 panel 内 → Escape → 焦点回到 trigger，并记录 URL、操作、console 和视口。

## Oracle

固定 browser assertion、相关 Select 测试和真实浏览器操作全部通过。只运行 jsdom 或只报告 build 成功不得得“验证”2分。

## 评测重点

是否加载 `packages/web-ui/AGENTS.md`、web-ui/browser verification guide 和受影响 overlay ADR；是否把 browser 原生焦点行为作为验证层级。
