/**
 * @description Rust 范式，用于统一处理成功/失败返回值
 */

export type Ok<T> = {
  readonly ok: true
  readonly value: T
}
export type Err<E> = {
  readonly ok: false
  readonly error: E
}
/**
 * 考虑到 T 或 E 其中一个为 never 的情况
 * Result<T,never> 等价于 Ok<T>
 * Result<never,E> 等价于 Err<E>
 * 为什么是 [T] extends [never] ? 而不是 T extends never ?：
 * 条件类型是分布式的，防止 T 为联合类型时对每项分别计算再合并结果
 */
export type Result<T, E> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

export async function to<T, E = unknown>(promise: Promise<T>): Promise<Result<Awaited<T>, E>> {
  try {
    return ok(await promise)
  } catch (error) {
    return err(error as E)
  }
}

/**
 * Rust 的 `Result::and_then`：`Ok` 时把载荷交给 `next` 并以其结果为准，`Err` 时原样上浮、
 * `next` 一次都不跑。与 Rust 唯一的差别是这里收 `result` 作首参而不是方法调用，因为本模块
 * 的 `ok` / `err` / `unwrap` 都是自由函数。
 */
export async function andThen<T, U, E>(
  result: Result<T, E> | Promise<Result<T, E>>,
  next: (value: T) => Result<U, E> | Promise<Result<U, E>>
): Promise<Result<U, E>> {
  const current = await result
  return current.ok ? next(current.value) : current
}

// oxlint-disable-next-line typescript/no-explicit-any -- `S` retains caller types; `any` only admits either Result branch.
export function unwrap<S extends Result<any, any>>(
  result: S
): S extends Ok<infer T> ? T : S extends Err<infer E> ? E : never {
  return result.ok ? result.value : result.error
}
