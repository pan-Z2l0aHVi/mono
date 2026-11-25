# paradigm

English | [简体中文](./paradigm.CN.md)

Rust-inspired `Result<T, E>` error handling without throwing exceptions. Available via `rust` from `@greypan/js-kit` or directly from the dedicated `@greypan/js-kit/rust` subpath.

## Examples

### `Result` flow with `ok`, `err`, `to`, `andThen`, and `unwrap`

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

| Export (`@greypan/js-kit/rust` or `rust.*`) | Description                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `ok(value)` / `err(error)`                  | Constructs an `Ok<T>` or `Err<E>` value.                                  |
| `isOk(result)` / `isErr(result)`            | Type guards narrowing `Result<T, E>`.                                     |
| `to(promise)`                               | Converts a `Promise<T>` into `Promise<Result<T, E>>` without throwing.    |
| `andThen(result, fn)`                       | Chains a transformation when `result` is `Ok`, short-circuiting on `Err`. |
| `unwrap(result, fallback?)`                 | Extracts the `Ok` value or returns/throws according to fallback behavior. |
