/**
 * 交接区：目录布局、权限、轮次文件与降级读取。
 *
 * 用真实临时目录（不 mock fs），守 0700 权限与「缺失 handoff 不回退旧轮」两条契约。
 */

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
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
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
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

  it('capture 日志落盘到 worker 目录', async () => {
    const store = await makeStore()
    await store.ensureWorkerDir('claude-1')
    const written = await store.writeCaptureLog('claude-1', 'screen')
    expect(written).toMatch(/claude-1\/capture-.*\.log$/)
    expect(await readFile(written, 'utf8')).toBe('screen')
  })
})
