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
const quietRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-quiet-'))

function init(repo: string): void {
  execFileSync('git', ['init', '-b', 'main'], { cwd: repo, stdio: 'pipe' })
}

function write(repo: string, name: string, body: string): void {
  fs.writeFileSync(path.join(repo, name), body)
}

function add(repo: string, ...names: readonly string[]): void {
  execFileSync('git', ['add', ...names], { cwd: repo, stdio: 'pipe' })
}

it('script-tests', async () => {
  init(root)
  write(root, 'pass.test.mjs', "console.log('pass.test.mjs: all assertions passed')\n")
  write(root, 'a b.test.mjs', "console.log('a b.test.mjs: all assertions passed')\n")
  add(root, 'pass.test.mjs', 'a b.test.mjs')

  assert.equal(await scriptTests.run({ root }), '2 script test file(s) passed')

  write(root, 'fail.test.mjs', 'process.exit(3)\n')
  add(root, 'fail.test.mjs')
  await assert.rejects(scriptTests.run({ root }), /script test failed: fail\.test\.mjs \(exit 3\)/)

  // git 不可用时必须失败，不能返回「没有测试」。
  await assert.rejects(scriptTests.run({ root: nonGitRoot }), /git ls-files .*failed/)
  assert.equal(fs.existsSync(path.join(nonGitRoot, '.git')), false)
})

// 退出码为 0 只证明脚本跑完了；断言全靠抛错表达失败，所以完成行才是「跑过断言」的证据。
it('script-tests requires its own completion line', async () => {
  init(quietRoot)
  write(quietRoot, 'silent.test.mjs', 'export const unused = 1\n')
  add(quietRoot, 'silent.test.mjs')
  await assert.rejects(
    scriptTests.run({ root: quietRoot }),
    /script test printed no completion line: silent\.test\.mjs \(expected "silent\.test\.mjs: all assertions passed" on stdout\)/
  )

  // 抄来的完成行不算：文件名必须是被发现的那一个。a-copy 排在 silent 之前，先被判定。
  write(quietRoot, 'a-copy.test.mjs', "console.log('silent.test.mjs: all assertions passed')\n")
  add(quietRoot, 'a-copy.test.mjs')
  await assert.rejects(
    scriptTests.run({ root: quietRoot }),
    /script test printed no completion line: a-copy\.test\.mjs \(expected "a-copy\.test\.mjs: all assertions passed" on stdout\)/
  )

  write(quietRoot, 'a-copy.test.mjs', "console.log('a-copy.test.mjs: all assertions passed')\n")
  add(quietRoot, 'a-copy.test.mjs')
  await assert.rejects(
    scriptTests.run({ root: quietRoot }),
    /script test printed no completion line: silent\.test\.mjs/
  )
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(nonGitRoot, { recursive: true, force: true })
  fs.rmSync(quietRoot, { recursive: true, force: true })
})
