import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { run } from '../script-tests.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-'))
const nonGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-nongit-'))

try {
  execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'pipe' })
  fs.writeFileSync(path.join(root, 'pass.test.mjs'), "console.log('pass-ok')\n")
  fs.writeFileSync(path.join(root, 'a b.test.mjs'), "console.log('space-ok')\n")
  // 本包的测试由 `node --test src` 承担，这里必须被排除；用一个会失败的文件证明它真的没跑，
  // 否则「排除了」与「恰好没被 git 收进索引」两种状态分不开。
  fs.mkdirSync(path.join(root, 'packages', 'monorepo-kit', 'src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'packages', 'monorepo-kit', 'src', 'own.test.mjs'), 'process.exit(9)\n')
  execFileSync('git', ['add', 'pass.test.mjs', 'a b.test.mjs', 'packages/monorepo-kit/src/own.test.mjs'], {
    cwd: root,
    stdio: 'pipe'
  })

  assert.equal(await run({ root }), '2 script test file(s) passed')

  fs.writeFileSync(path.join(root, 'fail.test.mjs'), 'process.exit(3)\n')
  execFileSync('git', ['add', 'fail.test.mjs'], { cwd: root, stdio: 'pipe' })
  await assert.rejects(run({ root }), /script test failed: fail\.test\.mjs \(exit 3\)/)

  // git 不可用时必须失败，不能返回「没有测试」。
  await assert.rejects(run({ root: nonGitRoot }), /git ls-files failed/)
  assert.equal(fs.existsSync(path.join(nonGitRoot, '.git')), false)

  process.stdout.write('packages/monorepo-kit/src/policy/__tests__/script-tests.test.mjs: all assertions passed\n')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(nonGitRoot, { recursive: true, force: true })
}
