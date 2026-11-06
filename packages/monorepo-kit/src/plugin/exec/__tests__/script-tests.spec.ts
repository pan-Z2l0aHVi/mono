import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, it } from 'vite-plus/test'

import { defineCatch } from '../../../runner/catch'
import { defineRunner } from '../../../runner/runner'
import { defineScriptTests } from '../script-tests'

const scriptTests = defineScriptTests()
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-'))
const nonGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-nongit-'))
const quietRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-quiet-'))
const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'greypan-script-tests-evidence-'))

function init(repo: string): void {
  execFileSync('git', ['init', '-b', 'main'], { cwd: repo, stdio: 'pipe' })
}

function write(repo: string, name: string, body: string): void {
  fs.writeFileSync(path.join(repo, name), body)
}

function add(repo: string, ...names: readonly string[]): void {
  execFileSync('git', ['add', ...names], { cwd: repo, stdio: 'pipe' })
}

// 链里会 spawn git 与 node，env 显式给一份不依赖开发者 shell 的副本。
// 链尾带 defineCatch：git 不可用是抛出的装配故障，走 `throw: ` 而不是某个域名前缀。
function kit(repo: string) {
  return defineRunner()
    .use(scriptTests)
    .use(defineCatch())
    .make({ root: repo, env: { ...process.env } })
}

async function failure(repo: string): Promise<string> {
  const result = await kit(repo).run()
  if (result.ok) assert.fail('expected script-tests to fail')
  return result.error
}

it('script-tests', async () => {
  init(root)
  write(root, 'pass.test.mjs', "console.log('pass.test.mjs: all assertions passed')\n")
  write(root, 'a b.test.mjs', "console.log('a b.test.mjs: all assertions passed')\n")
  add(root, 'pass.test.mjs', 'a b.test.mjs')

  assert.ok((await kit(root).run()).ok)

  write(root, 'fail.test.mjs', 'process.exit(3)\n')
  add(root, 'fail.test.mjs')
  assert.match(await failure(root), /^script: script test failed: fail\.test\.mjs \(exit 3\)/)

  // git 不可用时必须失败，不能返回「没有测试」。
  assert.match(await failure(nonGitRoot), /^throw: git ls-files .*failed/)
  assert.equal(fs.existsSync(path.join(nonGitRoot, '.git')), false)
})

// 退出码为 0 只证明脚本跑完了；断言全靠抛错表达失败，所以完成行才是「跑过断言」的证据。
it('script-tests requires its own completion line', async () => {
  init(quietRoot)
  write(quietRoot, 'silent.test.mjs', 'export const unused = 1\n')
  add(quietRoot, 'silent.test.mjs')
  assert.match(
    await failure(quietRoot),
    /^script: script test printed no completion line: silent\.test\.mjs \(expected "silent\.test\.mjs: all assertions passed" on stdout\)/
  )

  // 抄来的完成行不算：文件名必须是被发现的那一个。a-copy 排在 silent 之前，先被判定。
  write(quietRoot, 'a-copy.test.mjs', "console.log('silent.test.mjs: all assertions passed')\n")
  add(quietRoot, 'a-copy.test.mjs')
  assert.match(
    await failure(quietRoot),
    /^script: script test printed no completion line: a-copy\.test\.mjs \(expected "a-copy\.test\.mjs: all assertions passed" on stdout\)/
  )

  write(quietRoot, 'a-copy.test.mjs', "console.log('a-copy.test.mjs: all assertions passed')\n")
  add(quietRoot, 'a-copy.test.mjs')
  assert.match(await failure(quietRoot), /^script: script test printed no completion line: silent\.test\.mjs/)
})

// 判定不转写子进程输出，失败证据只能靠 Err 文案带出来：这两条断言的就是这条唯一通道。
it('script-tests carries the failing script own output in the verdict', async () => {
  init(evidenceRoot)
  write(evidenceRoot, 'boom.test.mjs', "console.error('boom: assertion failed')\nprocess.exit(2)\n")
  add(evidenceRoot, 'boom.test.mjs')

  const message = await failure(evidenceRoot)
  assert.match(message, /^script: script test failed: boom\.test\.mjs \(exit 2\)/)
  assert.match(message, /boom: assertion failed/)
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(nonGitRoot, { recursive: true, force: true })
  fs.rmSync(quietRoot, { recursive: true, force: true })
  fs.rmSync(evidenceRoot, { recursive: true, force: true })
})
