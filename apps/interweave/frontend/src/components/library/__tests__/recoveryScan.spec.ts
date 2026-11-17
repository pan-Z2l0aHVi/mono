import { describe, expect, it, vi } from 'vite-plus/test'

import {
  createRecoveryScanController,
  RECOVERY_SCAN_POLL_INTERVAL_MS,
  type RecoveryScanErrorStage,
  type RecoveryScanHost,
  type RecoveryScanTimers
} from '../recoveryScan'
import type { RecoveryScanUpdate } from '../restore'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function update(overrides: Partial<RecoveryScanUpdate> = {}): RecoveryScanUpdate {
  return {
    candidates: [],
    checked: 0,
    currentDirectory: '',
    skipped: 0,
    done: false,
    cancelled: false,
    error: '',
    ...overrides
  }
}

/** 手动推进的计时器：断言 250ms 轮询已挂起，再按需触发一次。 */
function createTimers() {
  let nextId = 0
  const pending = new Map<number, () => void>()
  const timers: RecoveryScanTimers = {
    setTimeout(callback) {
      const id = ++nextId
      pending.set(id, callback)
      return id as unknown as ReturnType<typeof setTimeout>
    },
    clearTimeout(handle) {
      pending.delete(handle as unknown as number)
    }
  }
  return {
    timers,
    pending: () => pending.size,
    tick() {
      const callbacks = [...pending.values()]
      pending.clear()
      for (const callback of callbacks) callback()
    }
  }
}

function createHost() {
  return {
    start: vi.fn<RecoveryScanHost['start']>(async () => 'scan'),
    poll: vi.fn<RecoveryScanHost['poll']>(),
    cancel: vi.fn<RecoveryScanHost['cancel']>(async () => {}),
    discard: vi.fn<RecoveryScanHost['discard']>(async () => {})
  }
}

describe('recovery scan controller', () => {
  it('按 250ms 轮询推进，done 后收敛为完成态', async () => {
    const host = createHost()
    host.poll.mockResolvedValueOnce(update({ checked: 1 })).mockResolvedValueOnce(update({ checked: 2, done: true }))
    const timers = createTimers()
    const onProgress = vi.fn<(update: RecoveryScanUpdate) => void>()
    const onDone = vi.fn<(update: RecoveryScanUpdate) => void>()
    const scan = createRecoveryScanController(host, { timers: timers.timers, onProgress, onDone })

    await scan.beginScan('/dir', ['s1', 's2'])

    expect(host.start).toHaveBeenCalledWith(['s1', 's2'], '/dir')
    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(scan.scanning.value).toBe(true)
    expect(timers.pending()).toBe(1)

    timers.tick()
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ done: true })))
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(scan.scanning.value).toBe(false)
    expect(scan.stopping.value).toBe(false)
    expect(scan.incomplete.value).toBe(false)
    expect(RECOVERY_SCAN_POLL_INTERVAL_MS).toBe(250)
  })

  it('stop 作废在途启动，晚到的 scan id 被清扫', async () => {
    const host = createHost()
    const started = deferred<string>()
    host.start.mockReturnValue(started.promise)
    const scan = createRecoveryScanController(host, { timers: createTimers().timers })

    const beginning = scan.beginScan('', ['s1'])
    scan.stop()
    started.resolve('late-scan')
    await beginning

    expect(host.discard).toHaveBeenCalledWith('late-scan')
    expect(host.poll).not.toHaveBeenCalled()
    expect(scan.scanning.value).toBe(false)
  })

  it('start 未决时停止且 cancel 失败：清扫已启动的会话', async () => {
    const host = createHost()
    const started = deferred<string>()
    host.start.mockReturnValue(started.promise)
    host.cancel.mockRejectedValue(new Error('cancel failed'))
    const onError = vi.fn<(stage: RecoveryScanErrorStage, cause: unknown) => void>()
    const scan = createRecoveryScanController(host, { timers: createTimers().timers, onError })

    const beginning = scan.beginScan('', ['s1'])
    scan.requestStop()
    started.resolve('scan')
    await beginning

    // cancel 失败后会话仍在后端跑：必须 discard，否则 runner 一直报 already running。
    expect(host.discard).toHaveBeenCalledWith('scan')
    expect(onError).toHaveBeenCalledWith('start', expect.any(Error))
    expect(scan.scanning.value).toBe(false)
    expect(scan.stopping.value).toBe(false)
  })

  it('停止请求早于 scan id 时，拿到 id 后补发 cancel', async () => {
    const host = createHost()
    const started = deferred<string>()
    host.start.mockReturnValue(started.promise)
    host.poll.mockResolvedValue(update({ done: true, cancelled: true }))
    const scan = createRecoveryScanController(host, { timers: createTimers().timers })

    const beginning = scan.beginScan('', ['s1'])
    scan.requestStop()
    started.resolve('scan')

    await beginning
    expect(host.cancel).toHaveBeenCalledWith('scan')
    expect(scan.scanning.value).toBe(false)
    expect(scan.stopping.value).toBe(false)
    expect(scan.incomplete.value).toBe(true)
  })

  it('扫描中请求停止先 cancel，done 后退出停止态并标记不完整', async () => {
    const host = createHost()
    host.poll
      .mockResolvedValueOnce(update({ checked: 1 }))
      .mockResolvedValueOnce(update({ done: true, cancelled: true }))
    const timers = createTimers()
    const onDone = vi.fn<(update: RecoveryScanUpdate) => void>()
    const scan = createRecoveryScanController(host, { timers: timers.timers, onDone })

    await scan.beginScan('', ['s1'])
    scan.requestStop()

    expect(host.cancel).toHaveBeenCalledWith('scan')
    expect(scan.stopping.value).toBe(true)
    expect(scan.incomplete.value).toBe(true)

    timers.tick()
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(scan.stopping.value).toBe(false)
    expect(scan.incomplete.value).toBe(true)
  })

  it('轮询失败：清扫扫描、标记不完整并上报 poll 阶段错误', async () => {
    const host = createHost()
    host.poll.mockRejectedValue(new Error('poll failed'))
    const onError = vi.fn<(stage: RecoveryScanErrorStage, cause: unknown) => void>()
    const scan = createRecoveryScanController(host, { timers: createTimers().timers, onError })

    await scan.beginScan('', ['s1'])

    expect(host.discard).toHaveBeenCalledWith('scan')
    expect(onError).toHaveBeenCalledWith('poll', expect.any(Error))
    expect(scan.scanning.value).toBe(false)
    expect(scan.incomplete.value).toBe(true)
  })

  it('启动失败上报 start 阶段错误，不进入扫描态', async () => {
    const host = createHost()
    host.start.mockRejectedValue(new Error('start failed'))
    const onError = vi.fn<(stage: RecoveryScanErrorStage, cause: unknown) => void>()
    const scan = createRecoveryScanController(host, { timers: createTimers().timers, onError })

    await scan.beginScan('', ['s1'])

    expect(onError).toHaveBeenCalledWith('start', expect.any(Error))
    expect(scan.scanning.value).toBe(false)
    expect(scan.stopping.value).toBe(false)
    expect(host.poll).not.toHaveBeenCalled()
  })

  it('取消失败上报 cancel 阶段错误并退出停止态', async () => {
    const host = createHost()
    host.poll.mockResolvedValue(update())
    host.cancel.mockRejectedValue(new Error('cancel failed'))
    const onError = vi.fn<(stage: RecoveryScanErrorStage, cause: unknown) => void>()
    const scan = createRecoveryScanController(host, { timers: createTimers().timers, onError })

    await scan.beginScan('', ['s1'])
    scan.requestStop()

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('cancel', expect.any(Error)))
    expect(scan.stopping.value).toBe(false)
  })

  it('重新开始会作废旧会话，旧结果不再轮询', async () => {
    const host = createHost()
    const firstStart = deferred<string>()
    host.start.mockReturnValueOnce(firstStart.promise).mockResolvedValueOnce('scan-b')
    host.poll.mockResolvedValue(update({ done: true }))
    const scan = createRecoveryScanController(host, { timers: createTimers().timers })

    const first = scan.beginScan('', ['a'])
    await scan.beginScan('', ['b'])
    firstStart.resolve('scan-a')
    await first

    expect(host.discard).toHaveBeenCalledWith('scan-a')
    expect(host.poll).toHaveBeenCalledTimes(1)
    expect(host.poll).toHaveBeenCalledWith('scan-b')
  })

  it('stop 清掉挂起的轮询计时器，之后不再 poll', async () => {
    const host = createHost()
    host.poll.mockResolvedValue(update())
    const timers = createTimers()
    const scan = createRecoveryScanController(host, { timers: timers.timers })

    await scan.beginScan('', ['s1'])
    expect(timers.pending()).toBe(1)
    scan.stop()

    expect(timers.pending()).toBe(0)
    expect(host.discard).toHaveBeenCalledWith('scan')
    timers.tick()
    expect(host.poll).toHaveBeenCalledTimes(1)
    expect(scan.scanning.value).toBe(false)
  })
})
