/**
 * `scripts/run-headless.mjs` 的进程契约（V3-03）：
 *
 * - 子进程 stdout 原始 JSONL 无损落盘；
 * - 子进程真实退出码透传；
 * - Ctrl+C（SIGINT）转发给子进程，不产生孤儿进程；
 * - 人类可读摘要打到 stdout。
 *
 * 子 CLI 用 Node 假脚本扮演，不依赖 claude / codex。
 */

import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

const RUN_HEADLESS = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../scripts/run-headless.mjs')

function runWrapper(eventsOut: string, command: string, args: string[]) {
  const child = spawn(process.execPath, [RUN_HEADLESS, '--events-out', eventsOut, '--', command, ...args], {
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', chunk => {
    stdout += chunk
  })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', chunk => {
    stderr += chunk
  })
  const exit = new Promise<number>(resolve => child.on('close', code => resolve(code ?? -1)))
  return { child, exit, stdout: () => stdout, stderr: () => stderr }
}

async function makeFixture(script: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'run-headless-spec-'))
  dirs.push(dir)
  const file = path.join(dir, 'fake-cli.mjs')
  await writeFile(file, script, 'utf8')
  return file
}

describe('run-headless 契约', () => {
  it('JSONL 无损落盘、摘要可读、退出码透传', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'run-headless-spec-'))
    dirs.push(dir)
    const fakeCli = await makeFixture(`
process.stdout.write(JSON.stringify({type:'system',subtype:'init',app:'claude-code',model:'m1'}) + '\\n')
process.stdout.write(JSON.stringify({type:'assistant',message:{content:[{type:'text',text:'正在处理'}]}}) + '\\n')
process.stdout.write(JSON.stringify({type:'result',is_error:false,result:'全部完成',session_id:'sid-7'}) + '\\n')
process.exit(7)
`)
    const eventsOut = path.join(dir, 'turn-001.events.jsonl')

    const { exit, stdout } = runWrapper(eventsOut, process.execPath, [fakeCli])
    expect(await exit).toBe(7)

    const raw = await readFile(eventsOut, 'utf8')
    expect(raw.split('\n').filter(Boolean)).toHaveLength(3)
    expect(raw).toContain('"session_id":"sid-7"')
    const summary = stdout()
    expect(summary).toContain('claude-code 会话开始')
    expect(summary).toContain('正在处理')
    expect(summary).toContain('全部完成')
  })

  it('SIGINT 转发给子进程，flush 后以子进程退出码收尾', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'run-headless-spec-'))
    dirs.push(dir)
    const fakeCli = await makeFixture(`
process.stdout.write('{"partial":"before"}\\n')
process.on('SIGINT', () => {
  process.stdout.write('{"interrupted":true}\\n')
  setTimeout(() => process.exit(42), 50)
})
setInterval(() => {}, 1000)
`)
    const eventsOut = path.join(dir, 'turn-002.events.jsonl')

    const wrapper = runWrapper(eventsOut, process.execPath, [fakeCli])
    await new Promise(resolve => setTimeout(resolve, 400))
    wrapper.child.kill('SIGINT')
    expect(await wrapper.exit).toBe(42)

    const raw = await readFile(eventsOut, 'utf8')
    expect(raw).toContain('"interrupted":true')
    // wrapper 退出即子进程已 close（close handler 等子进程先退），42 是子进程自己的码。
  })

  it('参数缺失时拒绝启动（usage 64）', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'run-headless-spec-'))
    dirs.push(dir)
    const eventsOut = path.join(dir, 'x.jsonl')
    // 直接 spawn，不给 `--`：runWrapper 的便利封装总会补 `--`。
    const child = spawn(process.execPath, [RUN_HEADLESS, '--events-out', eventsOut], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => {
      stderr += chunk
    })
    const exit = new Promise<number>(resolve => child.on('close', code => resolve(code ?? -1)))
    expect(await exit).toBe(64)
    expect(stderr).toContain('usage')
  })
})
