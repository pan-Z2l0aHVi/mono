import type { execFile as execFileType } from 'node:child_process'

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

/*
 * herdr CLI 的 spawn 层（G6）：解析函数（tabs.ts / activation.ts）已有专项，这里补
 * execFile 接线——bin 解析（HERDR_BIN_PATH 覆盖与默认值）、参数表、超时、非零退出时
 * 读 error.stdout 里的 JSON 再解析（herdr 失败以退出码表达、JSON 仍在 stdout），
 * 以及没有 stdout 可读时降级成 spawn 错误文案。
 *
 * execFile 的 promisify 走 Node 的 custom promisify 通道（promise 解析 { stdout, stderr }），
 * mock 把该符号指到同一个 vi.fn 上，断言与排队应答都在它身上。
 */
const { execFileCallable, execFileRun, queue } = vi.hoisted(() => {
  type HerdrOutcome = { ok: true; stdout: string } | { ok: false; message: string; stdout: string }
  const queue: HerdrOutcome[] = []
  const execFileRun = vi.fn<
    (bin: string, args: string[], options?: { timeout?: number }) => Promise<{ stdout: string; stderr: string }>
  >(async (_bin, _args, _options) => {
    const outcome = queue.shift()
    if (!outcome) throw new Error('herdr-cli.spec: 未排入的 herdr 调用')
    if (outcome.ok) return { stdout: outcome.stdout, stderr: '' }
    throw Object.assign(new Error(outcome.message), { stdout: outcome.stdout })
  })
  // 回调形态的占位实现（herdr-cli 只用 promise 通道；挂 custom promisify 符号后 promisify
  // 会直接取 run，回调形态不会被走到）。
  const execFileCallable = ((
    bin: string,
    args: string[],
    options: { timeout?: number } | undefined,
    callback: (error: unknown, stdout?: string) => void
  ) => {
    void execFileRun(bin, args, options).then(
      result => callback(null, result.stdout),
      error => callback(error)
    )
  }) as unknown as typeof execFileType
  Object.defineProperty(execFileCallable, Symbol.for('nodejs.util.promisify.custom'), { value: execFileRun })
  return { execFileCallable, execFileRun, queue }
})

vi.mock('node:child_process', () => ({
  execFile: execFileCallable
}))

import { clearPaneZoomViaHerdr, listAgentsViaHerdr, movePaneViaHerdr } from '../dispatch/herdr-cli'

function respond(stdout: string) {
  queue.push({ ok: true, stdout })
}

function respondNonZero(stdout: string, message = 'exit code 1') {
  queue.push({ ok: false, message, stdout })
}

beforeEach(() => {
  queue.length = 0
  execFileRun.mockClear()
  delete process.env.HERDR_BIN_PATH
})

describe('listAgentsViaHerdr', () => {
  it('带超时调用 herdr agent list，stdout 里的 agents 原样返回', async () => {
    respond(JSON.stringify({ result: { agents: [{ name: 'worker-a' }] } }))

    await expect(listAgentsViaHerdr()).resolves.toEqual([{ name: 'worker-a' }])
    expect(execFileRun).toHaveBeenCalledExactlyOnceWith('herdr', ['agent', 'list'], { timeout: 4_000 })
  })

  it('HERDR_BIN_PATH 覆盖二进制路径', async () => {
    respond(JSON.stringify({ result: { agents: [] } }))
    process.env.HERDR_BIN_PATH = '/opt/herdr/bin/herdr'

    await listAgentsViaHerdr()

    expect(execFileRun.mock.calls[0]![0]).toBe('/opt/herdr/bin/herdr')
  })

  it('spawn 抛错时向上抛（激活探测会折算成 probe-failed）', async () => {
    respondNonZero('', 'spawn herdr ENOENT')

    await expect(listAgentsViaHerdr()).rejects.toThrow('spawn herdr ENOENT')
  })
})

describe('movePaneViaHerdr', () => {
  it('成功输出按 tabs 的解析器折算成 moved', async () => {
    respond(JSON.stringify({ result: { move_result: { moved: true } } }))

    await expect(movePaneViaHerdr('pane-1', 'slice: worker-a')).resolves.toEqual({ moved: true })
    expect(execFileRun).toHaveBeenCalledExactlyOnceWith(
      'herdr',
      ['pane', 'move', 'pane-1', '--new-tab', '--label', 'slice: worker-a', '--no-focus'],
      { timeout: 4_000 }
    )
  })

  it('非零退出但 stdout 带可读 JSON：读 stdout 再解析，不降级成 spawn 错误', async () => {
    respondNonZero(JSON.stringify({ error: { code: 'zoomed_tab', message: 'pane is zoomed' } }))

    await expect(movePaneViaHerdr('pane-1', 'label')).resolves.toEqual({
      moved: false,
      reason: 'zoomed_tab',
      zoomed: true
    })
  })

  it('非零退出且 stdout 为空：返回带原因的失败，不抛错', async () => {
    respondNonZero('', 'herdr not installed')

    await expect(movePaneViaHerdr('pane-1', 'label')).resolves.toEqual({
      moved: false,
      reason: 'herdr not installed'
    })
  })
})

describe('clearPaneZoomViaHerdr', () => {
  it('成功输出按 tabs 的解析器折算成 cleared', async () => {
    respond(JSON.stringify({ result: { zoom_changed: true, zoomed: false } }))

    await expect(clearPaneZoomViaHerdr('pane-2')).resolves.toMatchObject({ cleared: true })
    expect(execFileRun).toHaveBeenCalledExactlyOnceWith('herdr', ['pane', 'zoom', 'pane-2', '--off'], {
      timeout: 4_000
    })
  })

  it('非零退出但 stdout 带错误 JSON：解析原因而不是抛 spawn 错误', async () => {
    respondNonZero(JSON.stringify({ error: { reason: 'pane gone' } }))

    await expect(clearPaneZoomViaHerdr('pane-2')).resolves.toEqual({ cleared: false, reason: 'pane gone' })
  })

  it('非零退出且 stdout 为空：降级成 spawn 错误文案', async () => {
    respondNonZero('', 'timed out after 4000ms')

    await expect(clearPaneZoomViaHerdr('pane-2')).resolves.toEqual({ cleared: false, reason: 'timed out after 4000ms' })
  })
})
