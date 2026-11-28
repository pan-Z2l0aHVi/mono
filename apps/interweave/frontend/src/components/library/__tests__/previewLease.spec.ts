import { describe, expect, it, vi } from 'vite-plus/test'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime } from '../../../services/library'
import { createPreviewLease } from '../previewLease'

type PreparePreview = LibraryRuntime['resources']['prepareFilePreview']
type ReleasePreview = LibraryRuntime['resources']['releaseFilePreview']
type RevokeListener = (tokens: string[]) => void

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function createLease(prepareFilePreview: PreparePreview, releaseFilePreview: ReleasePreview = async () => {}) {
  const listeners = new Set<RevokeListener>()
  const runtime = {
    isAvailable: true,
    resources: { prepareFilePreview, releaseFilePreview },
    events: {
      onPreviewRevoked: (listener: RevokeListener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    }
  } as unknown as LibraryRuntime
  return {
    lease: createPreviewLease(runtime),
    emitRevoked: (tokens: string[]) => listeners.forEach(listener => listener(tokens))
  }
}

function preview(path: string, token: string) {
  return { kind: ResourceKind.ResourceKindImage, token, media_url: `/media/${token}` }
}

describe('preview lease', () => {
  it('prepare 生效前重新校验 validity，过期结果立即释放', async () => {
    const preparation = deferred<Awaited<ReturnType<PreparePreview>>>()
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const { lease } = createLease(() => preparation.promise, releaseFilePreview)

    let valid = true
    const pending = lease.prepare('row', '/tmp/a.png', () => valid)
    valid = false
    preparation.resolve(preview('/tmp/a.png', 'late-token'))

    expect(await pending).toBeNull()
    expect(releaseFilePreview).toHaveBeenCalledWith('late-token')
    expect(lease.entries.value.row).toBeUndefined()
  })

  it('同一 key 的新一轮 prepare 作废旧一轮，晚到的 token 被释放', async () => {
    const first = deferred<Awaited<ReturnType<PreparePreview>>>()
    const second = deferred<Awaited<ReturnType<PreparePreview>>>()
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const preparations = [first.promise, second.promise]
    const { lease } = createLease(() => preparations.shift()!, releaseFilePreview)

    const older = lease.prepare('row', '/tmp/old.png', () => true)
    const newer = lease.prepare('row', '/tmp/new.png', () => true)
    second.resolve(preview('/tmp/new.png', 'new-token'))
    expect(await newer).toMatchObject({ token: 'new-token', mediaUrl: '/media/new-token', path: '/tmp/new.png' })
    first.resolve(preview('/tmp/old.png', 'old-token'))
    expect(await older).toBeNull()

    expect(releaseFilePreview).toHaveBeenCalledTimes(1)
    expect(releaseFilePreview).toHaveBeenCalledWith('old-token')
    expect(lease.entries.value.row).toMatchObject({ token: 'new-token' })
  })

  it('revoke 幂等，且在途 prepare 结算后才返回', async () => {
    const preparation = deferred<Awaited<ReturnType<PreparePreview>>>()
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const { lease } = createLease(() => preparation.promise, releaseFilePreview)

    const pending = lease.prepare('row', '/tmp/a.png', () => true)
    const revoking = lease.revoke('row')
    preparation.resolve(preview('/tmp/a.png', 'late-token'))
    await revoking
    expect(releaseFilePreview).toHaveBeenCalledWith('late-token')
    await lease.revoke('row')
    expect(releaseFilePreview).toHaveBeenCalledTimes(1)
    expect(lease.entries.value).toEqual({})
    expect(await pending).toBeNull()
  })

  it('clear 释放已有条目并等待在途 prepare 释放晚到 token', async () => {
    const preparation = deferred<Awaited<ReturnType<PreparePreview>>>()
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const { lease } = createLease(
      async path => (path === '/tmp/late.png' ? preparation.promise : preview(path, `token-${path}`)),
      releaseFilePreview
    )

    await lease.prepare('ready', '/tmp/ready.png', () => true)
    const pending = lease.prepare('late', '/tmp/late.png', () => true)
    const clearing = lease.clear()
    preparation.resolve(preview('/tmp/late.png', 'late-token'))
    await clearing

    expect(lease.entries.value).toEqual({})
    expect(releaseFilePreview).toHaveBeenCalledWith('token-/tmp/ready.png')
    expect(releaseFilePreview).toHaveBeenCalledWith('late-token')
    expect(await pending).toBeNull()
  })

  it('驱逐事件早于 prepare 兑现时，晚到的 token 不入账也不再释放', async () => {
    const preparation = deferred<Awaited<ReturnType<PreparePreview>>>()
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const { lease, emitRevoked } = createLease(() => preparation.promise, releaseFilePreview)

    const pending = lease.prepare('row', '/tmp/a.png', () => true)
    // 后端在响应到达前就淘汰了这个 token：事件先到，entries 里还没有 key。
    emitRevoked(['token-a'])
    preparation.resolve(preview('/tmp/a.png', 'token-a'))

    expect(await pending).toBeNull()
    expect(lease.entries.value.row).toBeUndefined()
    // 后端已删除授权，重复 release 没有意义。
    expect(releaseFilePreview).not.toHaveBeenCalled()
  })

  it('驱逐事件只移除命中的条目，后端已撤销的 token 不再重复释放', async () => {
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const { lease, emitRevoked } = createLease(async path => preview(path, `token-${path}`), releaseFilePreview)
    await lease.prepare('first', '/tmp/first.png', () => true)
    await lease.prepare('second', '/tmp/second.png', () => true)

    emitRevoked(['token-/tmp/first.png'])

    expect(lease.entries.value.first).toBeUndefined()
    expect(lease.entries.value.second).toMatchObject({ token: 'token-/tmp/second.png' })
    expect(releaseFilePreview).not.toHaveBeenCalled()
  })

  it('dispose 后不再响应急逐事件', async () => {
    const { lease, emitRevoked } = createLease(async path => preview(path, `token-${path}`))
    await lease.prepare('row', '/tmp/a.png', () => true)
    lease.dispose()
    emitRevoked(['token-/tmp/a.png'])
    expect(lease.entries.value.row).toMatchObject({ token: 'token-/tmp/a.png' })
  })

  it('awaitSettled 等到 key 的 prepare 结算', async () => {
    const preparation = deferred<Awaited<ReturnType<PreparePreview>>>()
    const { lease } = createLease(() => preparation.promise)
    const pending = lease.prepare('row', '/tmp/a.png', () => true)
    let settled = false
    const waiting = lease.awaitSettled('row').then(() => {
      settled = true
    })
    expect(settled).toBe(false)
    preparation.resolve(preview('/tmp/a.png', 'token'))
    await waiting
    expect(settled).toBe(true)
    await pending
  })

  it('无媒体 token 的 JSON/代码文件仍记录权威 kind，且撤销时不调用 releaseFilePreview', async () => {
    const releaseFilePreview = vi.fn<ReleasePreview>(async () => {})
    const { lease } = createLease(
      async () => ({ kind: ResourceKind.ResourceKindJSON, token: '', media_url: '' }),
      releaseFilePreview
    )

    const entry = await lease.prepare('row', '/tmp/config.json', () => true)
    expect(entry).toEqual({
      kind: ResourceKind.ResourceKindJSON,
      token: null,
      mediaUrl: null,
      path: '/tmp/config.json'
    })
    expect(lease.entries.value.row).toEqual(entry)

    await lease.revoke('row')
    expect(lease.entries.value.row).toBeUndefined()
    expect(releaseFilePreview).not.toHaveBeenCalled()
  })
})
