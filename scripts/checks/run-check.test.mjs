// run-check.mjs 的测试：触发层把「链上 Err」「装配期抛错」「run 期逃逸」都收成一行 stderr
// 加 exit 1，且 `ok` 时一声不出。capture 只在本进程内换掉写出口，跑完立刻还原。
import assert from 'node:assert/strict'

import { runCheck } from './run-check.mjs'

/** @param {() => { run: () => Promise<{ ok: boolean, error?: string }> }} makeKit */
async function capture(makeKit) {
  const originalWrite = process.stderr.write
  const originalExitCode = process.exitCode
  const lines = []
  process.stderr.write = chunk => {
    lines.push(String(chunk))
    return true
  }
  try {
    await runCheck(makeKit)
    return { lines, exitCode: process.exitCode, originalExitCode }
  } finally {
    process.stderr.write = originalWrite
    process.exitCode = originalExitCode
  }
}

const ok = await capture(() => ({ run: async () => ({ ok: true }) }))
assert.deepEqual(ok.lines, [], '通过时不能产出任何证据')
assert.equal(ok.exitCode, ok.originalExitCode, '通过时不能碰 exitCode')

const err = await capture(() => ({ run: async () => ({ ok: false, error: 'turbo: broken' }) }))
assert.deepEqual(err.lines, ['turbo: broken\n'], '链上 Err 原样写一行')
assert.equal(err.exitCode, 2)

const factory = await capture(() => {
  throw new Error('factory exploded')
})
assert.deepEqual(factory.lines, ['throw: factory exploded\n'], '装配期抛错收敛成 throw: 一行，不打印堆栈')
assert.equal(factory.exitCode, 1)

const escaped = await capture(() => ({
  run: async () => {
    throw new Error('run escaped')
  }
}))
assert.deepEqual(
  escaped.lines,
  ['throw: run escaped\n'],
  '漏挂 defineCatch 时仍有一行 throw: 兜底；链内短路语义不在这里'
)
assert.equal(escaped.exitCode, 1)

console.log('scripts/checks/run-check.test.mjs: all assertions passed')
