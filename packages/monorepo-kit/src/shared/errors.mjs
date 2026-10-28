/**
 * 把 `catch` 捕获到的 `unknown` 收敛成可放进错误消息的字符串。
 * 非 `Error` 值（字符串、对象、`null`）走 `String()`，不假设它一定有 `message`。
 *
 * @param {unknown} error
 * @returns {string}
 */
export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}
