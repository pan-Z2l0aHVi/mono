# Eval 01：URL Hash 顺序修复

## 固定夹具

- **Task ID**: `eval-01-url-hash-order`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: implementation
- **目标文件**: `packages/js-kit/src/url/index.ts`，`stringifyUrl()`
- **允许修改**: `packages/js-kit/src/url/index.ts`、`packages/js-kit/src/url/__tests__/url.spec.ts`
- **禁止修改**: 其他 package、公共类型、依赖、生成文件、Git 配置

## 已知失败行为

在 baseline 上执行以下调用时，当前结果把 query 拼到 hash 后：

```ts
stringifyUrl({ base: 'https://example.test/path#section', query: { page: 2 } })
// 当前：https://example.test/path#section?page=2
// 期望：https://example.test/path?page=2#section
```

fixture setup：在临时 task worktree 应用 [`fixtures/01-url-hash-order.patch`](../fixtures/01-url-hash-order.patch)；该断言在 baseline 上必须失败。

## 提示

目标：修复 `stringifyUrl()` 在 `base` 已包含 hash 且追加 query 时的 URL 顺序错误。

成功标准：

- 输入与期望结果完全等同于“已知失败行为”；
- 保持已有 `query`、独立 `hash` 参数和 `omitNil` 行为；
- 新增一个只验证该回归的测试；
- 运行 `pnpm --filter @greypan/js-kit test` 和 `pnpm run check:code`。

## Oracle

通过标准是新增断言通过，且现有 `url.spec.ts` 全部通过。任何公共 API、其他 package 或依赖修改均为范围失败。

## 评测重点

是否读取 `packages/js-kit/AGENTS.md`、code-style 和 testing，而非加载无关 web-ui/build context；是否以 URL 可观察行为修复问题。
