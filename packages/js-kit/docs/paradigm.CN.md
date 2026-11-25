# paradigm

[English](./paradigm.md) | 简体中文

受 Rust 启发的无异常 `Result<T, E>` 错误处理范式。既可通过 `@greypan/js-kit` 的 `rust` 命名空间引入，也可通过独立子路径 `@greypan/js-kit/rust` 按需导入。

## 示例

### 使用 `ok`、`err`、`to`、`andThen` 与 `unwrap`

```ts demo=result-flow
import { andThen, err, isOk, ok, to, unwrap, type Result } from '@greypan/js-kit/rust'

function parsePositive(raw: string): Result<number, string> {
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return err('Expected a positive number')
  return ok(num)
}

const parsed = parsePositive('42')
const doubled = await andThen(parsed, n => ok(n * 2))
const asyncResult = await to(Promise.resolve('done'))

if (isOk(doubled) && isOk(asyncResult)) {
  console.log(unwrap(doubled), unwrap(asyncResult))
}
```

```js
import { andThen, err, isOk, ok, to, unwrap } from '@greypan/js-kit/rust'

function parsePositive(raw) {
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return err('Expected a positive number')
  return ok(num)
}

const parsed = parsePositive('42')
const doubled = await andThen(parsed, n => ok(n * 2))
const asyncResult = await to(Promise.resolve('done'))

if (isOk(doubled) && isOk(asyncResult)) {
  console.log(unwrap(doubled), unwrap(asyncResult))
}
```

## API

| 导出（`@greypan/js-kit/rust` 或 `rust.*`） | 说明                                                           |
| ------------------------------------------ | -------------------------------------------------------------- |
| `ok(value)` / `err(error)`                 | 构造 `Ok<T>` 或 `Err<E>` 结果值。                              |
| `isOk(result)` / `isErr(result)`           | 收窄 `Result<T, E>` 类型的类型守卫。                           |
| `to(promise)`                              | 将 `Promise<T>` 安全转换为 `Promise<Result<T, E>>`，不抛异常。 |
| `andThen(result, fn)`                      | 在 `Ok` 分支继续链式转换，`Err` 分支自动短路透传。             |
| `unwrap(result, fallback?)`                | 取出 `Ok` 值，或在 `Err` 时按兜底策略返回/抛出。               |
