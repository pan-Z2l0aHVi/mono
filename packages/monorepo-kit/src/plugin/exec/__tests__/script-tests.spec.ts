import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineScriptTests } from '../script-tests'

const scriptTests = defineScriptTests()
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-'))
const nonGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-nongit-'))

it('script-tests', async () => {
  execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'pipe' })
  fs.writeFileSync(path.join(root, 'pass.test.mjs'), "console.log('pass-ok')\n")
  fs.writeFileSync(path.join(root, 'a b.test.mjs'), "console.log('space-ok')\n")
  execFileSync('git', ['add', 'pass.test.mjs', 'a b.test.mjs'], { cwd: root, stdio: 'pipe' })

  assert.equal(await scriptTests.run({ root }), '2 script test file(s) passed')

  fs.writeFileSync(path.join(root, 'fail.test.mjs'), 'process.exit(3)\n')
  execFileSync('git', ['add', 'fail.test.mjs'], { cwd: root, stdio: 'pipe' })
  await assert.rejects(scriptTests.run({ root }), /script test failed: fail\.test\.mjs \(exit 3\)/)

  // git 不可用时必须失败，不能返回「没有测试」。
  await assert.rejects(scriptTests.run({ root: nonGitRoot }), /git ls-files .*failed/)
  assert.equal(fs.existsSync(path.join(nonGitRoot, '.git')), false)
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(nonGitRoot, { recursive: true, force: true })
})
