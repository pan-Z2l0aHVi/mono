/**
 * @description Go 范式，用于统一处理成功/失败返回值
 */

export type Ok<T> = readonly [null, T]
export type Err<E> = readonly [E, null]
export type Result<T, E> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return [null, value]
}

export function err<E>(error: E): Err<E> {
  return [error, null]
}

// 只以 error 位（首位）判别：value 位无法承担判别——ok(null) 的 tuple 与 err 的
// 形状重叠，检查 value 会把 ok(null) 误判为既非 Ok 也非 Err。代价是 err(null)
// 与 ok(null) 同形而退化为 Ok（Go typed-nil 陷阱的镜像），在此编码下不可表示。
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result[0] === null
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result[0] !== null
}

export async function to<T, E = unknown>(promise: Promise<T>): Promise<Result<Awaited<T>, E>> {
  try {
    return ok(await promise)
  } catch (error) {
    return err(error as E)
  }
}

// oxlint-disable-next-line typescript/no-explicit-any -- `S` retains caller types; `any` only admits either Result branch.
export function unwrap<S extends Result<any, any>>(
  result: S
): S extends Ok<infer T> ? T : S extends Err<infer E> ? E : never {
  const [error, value] = result
  return isOk(result) ? value : error
}
