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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrap<S extends Result<any, any>>(
  result: S
): S extends Ok<infer T> ? T : S extends Err<infer E> ? E : never {
  return result.ok ? result.value : result.error
}
