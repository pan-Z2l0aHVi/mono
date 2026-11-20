/**
 * Rex CLI 封装：参数装配、防递归前缀、错误保留与事件流分帧。
 */

import { describe, expect, it, vi } from 'vite-plus/test'

import { RexAdapter, resolveRexBin, withAntiRecursionPrefix } from '../rex-adapter'

type ExecCall = { command: string; args: string[] }
type ExecResult = { stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }

function makeAdapter(resultFor?: (call: ExecCall) => ExecResult) {
  const calls: ExecCall[] = []
  const exec = vi.fn<(command: string, args: string[]) => Promise<ExecResult>>(
    async (command: string, args: string[]) => {
      const call = { command, args }
      calls.push(call)
      if (resultFor) return resultFor(call)
      return { stdout: '', stderr: '', code: 0, killed: false, truncated: false }
    }
  )
  const adapter = new RexAdapter({ exec, bin: '/rex', session: 'session:s1' })
  return { adapter, calls }
}

describe('rex 二进制解析', () => {
  it('REX_BIN_DIR 优先，回退 PATH', () => {
    expect(resolveRexBin({ REX_BIN_DIR: '/Rex Server.app/Contents/MacOS' })).toBe('/Rex Server.app/Contents/MacOS/rex')
    expect(resolveRexBin({})).toBe('rex')
  })
})

describe('runBlock 参数装配', () => {
  it('带 -s/-c/--label/--json 与命令段，keepOpen 可控，focus 默认收走', async () => {
    const { adapter, calls } = makeAdapter(() => ({
      stdout: '{"window_id":"w","block_ids":["b1"]}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    await adapter.runBlock({
      cwd: '/repo',
      label: 'w-1',
      keepOpen: true,
      focus: false,
      commandSegments: withAntiRecursionPrefix('/opt/claude', ['-p', 'hi'])
    })
    expect(calls[0]?.command).toBe('/rex')
    expect(calls[0]?.args).toEqual([
      'run',
      '-s',
      'session:s1',
      '-c',
      '/repo',
      '--label',
      'w-1',
      '--keep-open',
      '--focus=false',
      '--json',
      '--',
      '/usr/bin/env',
      'PI_REX_ORCH=0',
      '/opt/claude',
      '-p',
      'hi'
    ])
  })

  it('interactiveShell 为真时传 --interactive（PR 审查 Should fix）', async () => {
    const { adapter, calls } = makeAdapter(() => ({
      stdout: '{"window_id":"w","block_ids":["b1"]}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    await adapter.runBlock({
      cwd: '/r',
      label: 'l',
      keepOpen: false,
      focus: true,
      interactiveShell: true,
      commandSegments: []
    })
    expect(calls[0]?.args).toContain('--interactive')
  })

  it('focus=true 时不传 --focus=false', async () => {
    const { adapter, calls } = makeAdapter(() => ({
      stdout: '{"window_id":"w","block_ids":["b1"]}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    await adapter.runBlock({ cwd: '/r', label: 'l', keepOpen: false, focus: true, commandSegments: [] })
    expect(calls[0]?.args.includes('--focus=false')).toBe(false)
  })

  it('失败时错误文本保留 stderr 与退出码', async () => {
    const { adapter } = makeAdapter(() => ({
      stdout: '',
      stderr: 'no such session',
      code: 3,
      killed: false,
      truncated: false
    }))
    await expect(
      adapter.runBlock({ cwd: '/r', label: 'l', keepOpen: false, focus: true, commandSegments: [] })
    ).rejects.toThrow('exit 3')
    await expect(
      adapter.runBlock({ cwd: '/r', label: 'l', keepOpen: false, focus: true, commandSegments: [] })
    ).rejects.toThrow('no such session')
  })

  it('创建结果 JSON 解析', async () => {
    const { adapter } = makeAdapter(() => ({
      stdout: '{"window_id":"w9","block_ids":["block:9"],"revision":1}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    expect(
      await adapter.runBlock({ cwd: '/r', label: 'l', keepOpen: false, focus: true, commandSegments: [] })
    ).toEqual({
      windowId: 'w9',
      blockIds: ['block:9']
    })
  })
})

describe('capture 尾部裁剪', () => {
  it('tailLines 只取末尾若干行', async () => {
    const { adapter } = makeAdapter(() => ({
      stdout: 'l1\nl2\nl3\nl4',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    expect(await adapter.capture('block:1', 2)).toBe('l3\nl4')
    expect(await adapter.capture('block:1')).toBe('l1\nl2\nl3\nl4')
  })
})

describe('blockCallProgramStatus', () => {
  it('读实测 {records:[...]} 形状', async () => {
    const { adapter } = makeAdapter(() => ({
      stdout: '{"records":[{"state":"working","app":"claude-code","msg":"m","updated_at":"t"}]}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    const changes = await adapter.blockCallProgramStatus('block:1')
    expect(changes).toEqual([
      {
        id: 'claude-code',
        record: { state: 'working', kind: undefined, msg: 'm', app: 'claude-code', updatedAt: 't' }
      }
    ])
  })

  it('call 失败如实抛错', async () => {
    const { adapter } = makeAdapter(() => ({
      stdout: '',
      stderr: 'block gone',
      code: 1,
      killed: false,
      truncated: false
    }))
    await expect(adapter.blockCallProgramStatus('block:1')).rejects.toThrow('block gone')
  })
})

describe('blockCallLastExit（对账补 child_exited 用）', () => {
  it('读实测 last_exit 形状；无记录返回 undefined', async () => {
    const withExit = makeAdapter(() => ({
      stdout: '{"last_exit":{"exit_code":0},"home":"/Users/u"}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    expect(await withExit.adapter.blockCallLastExit('block:1')).toBe(0)

    const errored = makeAdapter(() => ({
      stdout: '{"last_exit":{"exit_code":1,"error":"exit status 1"}}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    expect(await errored.adapter.blockCallLastExit('block:1')).toBe(1)

    const idle = makeAdapter(() => ({
      stdout: '{"last_exit":null,"home":"/Users/u"}',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    expect(await idle.adapter.blockCallLastExit('block:1')).toBeUndefined()

    const gone = makeAdapter(() => ({
      stdout: '',
      stderr: 'block gone',
      code: 1,
      killed: false,
      truncated: false
    }))
    await expect(gone.adapter.blockCallLastExit('block:1')).rejects.toThrow('block gone')
  })
})

describe('事件流分帧', () => {
  interface FakeStream {
    emit(name: string, ...data: unknown[]): void
  }

  interface FakeChild {
    stdout: FakeStream
    stderr: FakeStream
    emit(name: string, ...data: unknown[]): void
  }

  /**
   * 逐流独立的 fake：stdout / stderr 各自拥有监听器容器，子进程级事件（error/close）
   * 单独一路。共用容器的 fake 无法证明「stderr 不直通 stdout listener」之类的接线。
   * `options` 被记录，供断言 spawn 的 stdio 配置。
   */
  function fakeSpawn() {
    const captured: { options?: { stdio?: unknown } } = {}
    const spawnFn = vi.fn<(_bin: string, _args: string[], _options: unknown) => FakeChild>(
      (_bin: string, _args: string[], options: unknown) => {
        captured.options = options as { stdio?: unknown }
        const makeEmitter = () => {
          const listeners: Record<string, Array<(data?: unknown) => void>> = {}
          return {
            on: (name: string, fn: (data?: unknown) => void) => {
              ;(listeners[name] ??= []).push(fn)
            },
            emit: (name: string, ...data: unknown[]) => {
              for (const fn of listeners[name] ?? []) fn(...data)
            }
          }
        }
        const childListeners: Record<string, Array<(data?: unknown) => void>> = {}
        const child = {
          stdout: { setEncoding: () => undefined, ...makeEmitter() },
          stderr: { setEncoding: () => undefined, ...makeEmitter() },
          stdin: { end: () => undefined },
          on: (name: string, fn: (data?: unknown) => void) => {
            ;(childListeners[name] ??= []).push(fn)
          },
          kill: () => undefined,
          emit: (name: string, ...data: unknown[]) => {
            for (const fn of childListeners[name] ?? []) fn(...data)
          }
        }
        return child
      }
    )
    return { spawnFn, captured }
  }

  function makeAdapterWithSpawn(spawnFn: ReturnType<typeof fakeSpawn>['spawnFn']) {
    const exec = vi.fn<() => Promise<ExecResult>>(async () => ({
      stdout: '',
      stderr: '',
      code: 0,
      killed: false,
      truncated: false
    }))
    const adapter = new RexAdapter({ exec, bin: '/rex', session: 'session:s1', spawnFn: spawnFn as never })
    return { adapter }
  }

  it('跨 chunk 的行完整送达，残行不丢', async () => {
    const { spawnFn } = fakeSpawn()
    const { adapter } = makeAdapterWithSpawn(spawnFn)
    const lines: string[] = []
    adapter.startEventsStream({ onLine: line => lines.push(line), onExit: () => undefined })
    const child = spawnFn.mock.results[0]?.value as FakeChild
    child.stdout.emit('data', '{"a":1}\n{"b')
    child.stdout.emit('data', '":2}\n')
    expect(lines).toEqual(['{"a":1}', '{"b":2}'])
  })

  it('close(code=0) 归为正常退出，非零归为错误', async () => {
    const { spawnFn } = fakeSpawn()
    const { adapter } = makeAdapterWithSpawn(spawnFn)
    const exits: Array<Error | undefined> = []
    adapter.startEventsStream({ onLine: () => undefined, onExit: error => exits.push(error) })
    const child = spawnFn.mock.results[0]?.value as FakeChild
    child.emit('close', 1, 'SIGKILL')
    expect(exits[0]).toBeInstanceOf(Error)
    expect(exits[0]?.message).toContain('code=1')
  })

  it('spawn 失败的 error 与 close 只结算一次 onExit（review #11）', async () => {
    const { spawnFn } = fakeSpawn()
    const { adapter } = makeAdapterWithSpawn(spawnFn)
    const exits: Array<Error | undefined> = []
    adapter.startEventsStream({ onLine: () => undefined, onExit: error => exits.push(error) })
    const child = spawnFn.mock.results[0]?.value as FakeChild
    child.emit('error', new Error('ENOENT'))
    child.emit('close', 1, 'SIGKILL')
    expect(exits).toHaveLength(1)
    expect(exits[0]?.message).toBe('ENOENT')
  })

  it('stderr 尾部随断连错误上浮，不直通也不丢弃（codex exec #4 / 十轮 #3）', async () => {
    const { spawnFn, captured } = fakeSpawn()
    const { adapter } = makeAdapterWithSpawn(spawnFn)
    const exits: Array<Error | undefined> = []
    const lines: string[] = []
    adapter.startEventsStream({ onLine: line => lines.push(line), onExit: error => exits.push(error) })
    const child = spawnFn.mock.results[0]?.value as FakeChild
    // 只向 stderr 注入：若实现误接到 stdout 或 stdio 仍为 inherit，此用例不再可能通过。
    child.stderr.emit('data', 'Rex server unavailable\n')
    child.emit('close', 1, 'SIGKILL')
    expect(exits[0]?.message).toContain('code=1')
    expect(exits[0]?.message).toContain('Rex server unavailable')
    // 诊断不外泄为事件行，也证明 stdio 三路都是 pipe。
    expect(lines).toEqual([])
    expect(captured.options?.stdio).toEqual(['pipe', 'pipe', 'pipe'])
  })
})
