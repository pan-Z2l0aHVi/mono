import assert from 'node:assert/strict'

import { it } from 'vite-plus/test'

import { commandOutput, defineExec, exec, failureEvidence } from '../exec'

it('exec', () => {
  assert.equal(
    commandOutput({ ok: false, status: 3, stdout: 'partial output', stderr: 'Error: boom\n' }),
    'partial output\nError: boom',
    'stdout 与 stderr 必须分行，拼在一起会造出一个不存在的字符串'
  )
  assert.equal(commandOutput({ ok: false, stdout: '', stderr: 'Error: boom\n' }), 'Error: boom')
  assert.equal(commandOutput({ ok: false, stdout: 'only stdout', stderr: '' }), 'only stdout')

  // spawn 失败时 Node 给的是 status: null、两路输出 undefined；归一后才能用 `=== undefined`
  // 判「命令起不来」，否则报出 `exit null` 这种不存在的退出码。
  const spawnFailure = exec('definitely-not-an-installed-command-greypan', [])
  assert.equal(spawnFailure.ok, false)
  assert.equal(spawnFailure.status, undefined)
  assert.match(failureEvidence(spawnFailure), /could not be launched/)
})

it('defineExec 的 options.env 补进注入环境，而不是整份替换', () => {
  const made = defineExec().make({
    root: process.cwd(),
    env: { PATH: process.env.PATH ?? '', INJECTED: 'from-ctx' }
  })
  const result = made.exec(
    process.execPath,
    ['-e', 'process.stdout.write(process.env.INJECTED + "/" + process.env.EXTRA)'],
    { env: { EXTRA: 'from-options' } }
  )

  assert.equal(result.ok, true, `command failed: ${commandOutput(result)}`)
  assert.equal(result.stdout, 'from-ctx/from-options')
})
