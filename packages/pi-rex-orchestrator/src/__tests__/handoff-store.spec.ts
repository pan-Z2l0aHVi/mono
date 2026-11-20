/**
 * 交接区：目录布局、权限、轮次文件与降级读取。
 *
 * 用真实临时目录（不 mock fs），守 0700 权限与「缺失 handoff 不回退旧轮」两条契约。
 */

import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { HandoffStore } from '../handoff-store'

const roots: string[] = []

async function makeStore(): Promise<HandoffStore> {
  const root = await mkdtemp(path.join(tmpdir(), 'pi-rex-orch-test-'))
  roots.push(root)
  return new HandoffStore({ root, sessionId: 'session-1' })
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 }))
  )
})

describe('交接区', () => {
  it('目录链为 0700，轮次文件名三段式', async () => {
    const store = await makeStore()
    const { dir, warnings } = await store.ensureWorkerDir('claude-1')
    expect(warnings).toEqual([])
    expect((await stat(dir)).mode & 0o777).toBe(0o700)
    expect(store.briefPath('claude-1', 1)).toMatch(/claude-1\/turn-001\.brief\.md$/)
    expect(store.eventsPath('claude-1', 12)).toMatch(/turn-012\.events\.jsonl$/)
    expect(store.handoffPath('claude-1', 2)).toMatch(/turn-002\.handoff\.md$/)
  })

  it('brief 写入后 handoff 读取缺失不回退、不误报', async () => {
    const store = await makeStore()
    await store.ensureWorkerDir('claude-1')
    await store.writeBrief('claude-1', 1, '# task')
    expect(await readFile(store.briefPath('claude-1', 1), 'utf8')).toBe('# task')

    expect(await store.readHandoff('claude-1', 1)).toEqual({
      status: 'missing',
      path: store.handoffPath('claude-1', 1)
    })
    // 空 handoff 同样算缺失。
    await writeFile(store.handoffPath('claude-1', 1), '   \n', 'utf8')
    expect((await store.readHandoff('claude-1', 1)).status).toBe('missing')
    // 绝不读上一轮旧文件：turn 2 缺失就是缺失。
    await writeFile(store.handoffPath('claude-1', 1), '上一轮结论', 'utf8')
    expect((await store.readHandoff('claude-1', 2)).status).toBe('missing')
  })

  it('events 落盘可追加、尾部可读；无文件返回 undefined', async () => {
    const store = await makeStore()
    await store.ensureWorkerDir('claude-1')
    await store.appendEvents('claude-1', 1, '{"a":1}\n')
    await store.appendEvents('claude-1', 1, '{"b":2}\n')
    const tail = await store.readEventsTail('claude-1', 1, 5)
    expect(tail).toBe('{"a":1}\n{"b":2}')
    expect(await store.readEventsTail('claude-1', 9, 5)).toBeUndefined()
  })

  it('并发持久化注册表：都成功、后发起快照 last-wins、无残留临时文件', async () => {
    const store = await makeStore()
    const sessionDir = path.join(store.root, 'session-1')
    const first = [{ workerId: 'claude-1', status: 'running' }]
    const second = [
      { workerId: 'codex-1', status: 'closed' },
      { workerId: 'codex-2', status: 'running' }
    ]

    // 关闭 worker 与 block.closed 事件可能同时触发持久化：两次写入必须都成功。
    await expect(Promise.all([store.saveRegistry(first), store.saveRegistry(second)])).resolves.toEqual([
      undefined,
      undefined
    ])

    // 串行链保证后发起的快照最后落盘；旧快照覆盖新快照（丢 worker）会在这里暴露。
    const raw = await readFile(path.join(sessionDir, 'registry.json'), 'utf8')
    expect(raw, '期望 last-wins：第二个快照必须最后落盘，而不是被先发起的旧快照覆盖').toBe(JSON.stringify(second))

    // 不得残留共享的 `.tmp` 中间文件。
    expect((await readdir(sessionDir)).filter(name => name.endsWith('.tmp'))).toEqual([])
  })

  it('单次持久化失败会向调用方 reject，但不毒化串行链，且不留 `.tmp` 残留', async () => {
    const store = await makeStore()
    const sessionDir = path.join(store.root, 'session-1')
    const failed = [{ workerId: 'claude-1', status: 'running' }]
    const recovered = [{ workerId: 'codex-1', status: 'running' }]

    // 真实文件系统错误：把 sessionDir 占成同名文件，让本次 `mkdir(sessionDir)` 抛 EEXIST。
    await writeFile(sessionDir, 'not a directory', 'utf8')

    // ① 失败那一次必须把错误抛给调用方，而不是被串行链吞掉。
    await expect(store.saveRegistry(failed)).rejects.toThrow(/EEXIST/)

    // ② 清掉占位文件后，紧接着的下一次写入仍要成功——链路未被前一次失败毒化。
    await rm(sessionDir, { force: true })
    await expect(store.saveRegistry(recovered)).resolves.toBeUndefined()
    expect(await readFile(path.join(sessionDir, 'registry.json'), 'utf8')).toBe(JSON.stringify(recovered))

    // ③ 失败那次不得留下 `.tmp` 中间文件。
    expect((await readdir(sessionDir)).filter(name => name.endsWith('.tmp'))).toEqual([])
  })

  it('capture 日志落盘到 worker 目录', async () => {
    const store = await makeStore()
    await store.ensureWorkerDir('claude-1')
    const written = await store.writeCaptureLog('claude-1', 'screen')
    expect(written).toMatch(/claude-1\/capture-.*\.log$/)
    expect(await readFile(written, 'utf8')).toBe('screen')
  })
})
