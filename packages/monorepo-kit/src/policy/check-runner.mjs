// 同一执行面的检查并发运行；Promise.all 让首个失败成为整体失败。
// 检查必须只读：取消不会传播，已被启动的同级检查会被遗弃而不是中止。
export async function runChecks(checks, context = {}) {
  const results = await Promise.all(
    checks.map(async check => {
      try {
        return { check, detail: await check.run(context) }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`${check.name} failed: ${message}`, { cause: error })
      }
    })
  )
  for (const { check, detail } of results) {
    process.stdout.write(`${check.name} passed${detail ? ` (${detail})` : ''}\n`)
  }
  return results
}

export async function runEntrypoint(checks, context = {}) {
  try {
    await runChecks(checks, context)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
