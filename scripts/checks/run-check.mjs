/**
 * 门禁入口的失败语义收在一处：链上 `Err` 与逃逸的异常都写成一行 stderr 加非零退出码，
 * 静默通过不产出任何证据。
 *
 * `defineCatch()` 只包 `run()`，而 js-kit 的 `.make()` 会同步执行插件工厂；装配期抛错
 * （`getWorkspaceRoot()` 找不到根、插件工厂读取权威输入时抛）不在它的射程内，由这里
 * 收敛成 `throw: ` 一行 stderr 加 exit 1，而不是未捕获堆栈。
 *
 * 对 `run()` 期逃逸，这里的 catch 只是漏挂 `defineCatch()` 时的最后一道格式兜底：链内
 * 短路、归因与「不让异常跳过前面的判定」仍由 `defineCatch()` 负责，它不能被这层替代。
 *
 * @param {() => { run: () => Promise<{ ok: boolean, error?: string }> }} makeKit
 */
export async function runCheck(makeKit) {
  try {
    const result = await makeKit().run()
    if (!result.ok) {
      process.stderr.write(`${result.error}\n`)
      process.exitCode = 1
    }
  } catch (error) {
    process.stderr.write(`throw: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
