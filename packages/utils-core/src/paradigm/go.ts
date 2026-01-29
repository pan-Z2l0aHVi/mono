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

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result[0] === null && result[1] !== null
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result[0] !== null && result[1] === null
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
  const [error, value] = result
  return isOk(result) ? value : error
}
