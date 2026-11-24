import { describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime } from '../../../services/library'
import { createPreviewLease } from '../previewLease'
import type { LibraryRestoreQueueItem, RecoveryCandidate, RecoveryScanUpdate } from '../restore'
import { createRestoreSession, formatMatchReason, type RestorePorts } from '../restoreSession'

function createTestLease() {
  const prepareFilePreview = vi.fn<LibraryRuntime['resources']['prepareFilePreview']>(async path => ({
    kind: ResourceKind.ResourceKindImage,
    token: `token:${path}`,
    media_url: `/media${path}`
  }))
  const releaseFilePreview = vi.fn<LibraryRuntime['resources']['releaseFilePreview']>(async () => undefined)
  const runtime = {
    isAvailable: true,
    resources: { prepareFilePreview, releaseFilePreview },
    events: { onPreviewRevoked: () => () => {} }
  } as unknown as LibraryRuntime
  return { lease: createPreviewLease(runtime), prepareFilePreview, releaseFilePreview }
}

function fileItem(id: string, title = `File ${id}`): LibraryRestoreQueueItem {
  return {
    id,
    sourceId: id,
    resourceId: `res-${id}`,
    resourceTitle: title,
    resourceKind: ResourceKind.ResourceKindImage,
    kind: 'file',
    location: `/old/${id}.png`,
    replacementLocation: ''
  }
}

function urlItem(id: string): LibraryRestoreQueueItem {
  return {
    id,
    sourceId: id,
    resourceId: `res-${id}`,
    resourceTitle: `Web ${id}`,
    resourceKind: ResourceKind.ResourceKindWeb,
    kind: 'url',
    location: `https://old.example/${id}`,
    replacementLocation: `https://old.example/${id}`
  }
}

function candidate(sourceID: string, path: string, matchReasons = ['name']): RecoveryCandidate {
  return {
    sourceID,
    path,
    size: 42,
    modifiedAt: 1700000000000,
    matchReasons,
    snapshot: `snap:${path}`
  }
}

function doneUpdate(overrides: Partial<RecoveryScanUpdate> = {}): RecoveryScanUpdate {
  return {
    candidates: [],
    checked: 0,
    currentDirectory: '',
    skipped: 0,
    done: true,
    cancelled: false,
    error: '',
    ...overrides
  }
}

describe('restoreSession', () => {
  it('手动文件/链接准备、撤回草稿保留与提交载荷正确', async () => {
    const open = ref(true)
    const queue = ref<LibraryRestoreQueueItem[]>([fileItem('f1'), urlItem('u1')])
    const busy = ref(false)
    const allUnavailableFiles = ref<LibraryRestoreQueueItem[]>([])
    const failedIds = ref<string[]>([])
    const { lease, releaseFilePreview } = createTestLease()
    const onSubmit = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()

    const chooseFilePath = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('/new/f1.png')

    const session = createRestoreSession(
      {
        open: () => open.value,
        queue: () => queue.value,
        busy: () => busy.value,
        allUnavailableFiles: () => allUnavailableFiles.value,
        failedIds: () => failedIds.value
      },
      {
        chooseFilePath,
        chooseDirectory: async () => null,
        startScan: async () => 'scan-1',
        pollScan: async () => doneUpdate(),
        cancelScan: async () => undefined,
        discardScan: async () => undefined,
        lease,
        onSubmit
      }
    )

    try {
      // 取消文件选择后仍留在待找回列
      await session.prepare(queue.value[0])
      expect(session.pendingItems.value.map(i => i.id)).toEqual(['f1', 'u1'])
      expect(session.readyItems.value).toEqual([])

      // 选择文件后进入已找到列并准备预览
      await session.prepare(queue.value[0])
      expect(session.readyItems.value.map(i => i.id)).toEqual(['f1'])
      await vi.waitFor(() => expect(session.previewSource('f1')?.mediaUrl).toBe('/media/new/f1.png'))

      // 撤回文件会释放预览授权并回到待找回列
      session.cancelPrepare(queue.value[0])
      await vi.waitFor(() => expect(releaseFilePreview).toHaveBeenCalledWith('token:/new/f1.png'))
      expect(session.readyItems.value).toEqual([])

      // 链接编辑、撤回后再次打开保留上次输入的草稿
      await session.prepare(queue.value[1])
      expect(session.editingUrlItem.value?.id).toBe('u1')
      expect(session.urlDraft.value).toBe('')
      session.completeUrl('https://new.example/u1')
      expect(session.readyItems.value.map(i => i.id)).toEqual(['u1'])

      session.cancelPrepare(queue.value[1])
      await session.prepare(queue.value[1])
      expect(session.urlDraft.value).toBe('https://new.example/u1')
      session.completeUrl('https://new.example/u1-v2')

      session.submit()
      expect(onSubmit).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'u1', replacementLocation: 'https://new.example/u1-v2', scanSnapshot: undefined })
      ])
    } finally {
      session.dispose()
      lease.dispose()
    }
  })

  it('扫描单候选自动命中、多候选冲突回退待选，且手动选择后不再被后续扫描覆盖', async () => {
    const open = ref(true)
    const queue = ref<LibraryRestoreQueueItem[]>([fileItem('f1')])
    const allUnavailableFiles = ref<LibraryRestoreQueueItem[]>([fileItem('f2')])
    const { lease, releaseFilePreview } = createTestLease()
    const onAddItems = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()
    const notifyInfo = vi.fn<(message: string) => void>()
    const onSubmit = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()

    const scheduled: (() => void)[] = []
    const timers: NonNullable<RestorePorts['timers']> = {
      setTimeout: callback => {
        scheduled.push(callback)
        return scheduled.length as unknown as ReturnType<typeof setTimeout>
      },
      clearTimeout: () => {}
    }

    const pollScan = vi
      .fn<() => Promise<RecoveryScanUpdate>>()
      .mockResolvedValueOnce(doneUpdate({ done: false, checked: 1, candidates: [candidate('f1', '/a.png', ['hash'])] }))
      .mockResolvedValueOnce(doneUpdate({ done: false, checked: 2, candidates: [candidate('f1', '/b.png', ['name'])] }))
      .mockResolvedValueOnce(
        doneUpdate({ done: true, checked: 3, candidates: [candidate('f1', '/c.png', ['identity'])] })
      )

    const session = createRestoreSession(
      {
        open: () => open.value,
        queue: () => queue.value,
        busy: () => false,
        allUnavailableFiles: () => allUnavailableFiles.value,
        failedIds: () => []
      },
      {
        chooseFilePath: async () => null,
        chooseDirectory: async () => null,
        startScan: async () => 'scan-1',
        pollScan,
        cancelScan: async () => undefined,
        discardScan: async () => undefined,
        lease,
        timers,
        notifyInfo,
        onAddItems,
        onSubmit
      }
    )

    try {
      session.scanAllDisks()
      await vi.waitFor(() => expect(pollScan).toHaveBeenCalledTimes(1))
      expect(onAddItems).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'f2' })]))
      expect(notifyInfo).toHaveBeenCalledWith('已找到 2 条失效资源')
      expect(session.prepared.value.f1).toBe('/a.png')
      expect(session.matchReasonsFor('f1')).toEqual(['内容一致'])
      await vi.waitFor(() => expect(session.previewSource('f1')?.mediaUrl).toBe('/media/a.png'))

      // 第二批出现冲突候选：清空自动命中并撤销预览，等待用户手动裁决
      scheduled.shift()!()
      await vi.waitFor(() => expect(pollScan).toHaveBeenCalledTimes(2))
      expect(session.prepared.value.f1).toBeUndefined()
      expect(session.candidates.value.f1).toHaveLength(2)
      await vi.waitFor(() => expect(releaseFilePreview).toHaveBeenCalledWith('token:/a.png'))

      // 用户手动选择 /b.png 后，即使第三批再扫到 /c.png 也不覆盖手动决定
      session.chooseCandidate(session.candidates.value.f1[1])
      expect(session.prepared.value.f1).toBe('/b.png')
      expect(session.matchReasonsFor('f1')).toEqual(['文件名一致'])

      scheduled.shift()!()
      await vi.waitFor(() => expect(session.scanning.value).toBe(false))
      expect(session.prepared.value.f1).toBe('/b.png')
      expect(session.candidates.value.f1).toHaveLength(3)

      session.submit()
      expect(onSubmit).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'f1', replacementLocation: '/b.png', scanSnapshot: 'snap:/b.png' })
      ])
    } finally {
      session.dispose()
      lease.dispose()
    }
  })

  it('关闭弹窗作废在途目录/文件选择，failedIds 与队列移除时清理对应状态和预览租约', async () => {
    const open = ref(true)
    const queue = ref<LibraryRestoreQueueItem[]>([fileItem('f1'), fileItem('f2')])
    const failedIds = ref<string[]>([])
    const { lease, releaseFilePreview } = createTestLease()

    let resolvePick!: (value: string | null) => void
    const chooseFilePath = vi.fn<() => Promise<string | null>>(
      () =>
        new Promise(resolve => {
          resolvePick = resolve
        })
    )
    const startScan = vi.fn<(ids: string[], directory: string) => Promise<string>>(async () => 'scan-2')

    const session = createRestoreSession(
      {
        open: () => open.value,
        queue: () => queue.value,
        busy: () => false,
        allUnavailableFiles: () => [],
        failedIds: () => failedIds.value
      },
      {
        chooseFilePath,
        chooseDirectory: async () => '/picked-dir',
        startScan,
        pollScan: async () => doneUpdate(),
        cancelScan: async () => undefined,
        discardScan: async () => undefined,
        lease
      }
    )

    try {
      // 在途文件选择期间关闭并重新打开：旧选择结果必须被代次丢弃
      const pendingPick = session.prepare(queue.value[0])
      expect(session.picking.value).toBe('f1')
      open.value = false
      await nextTick()
      open.value = true
      await nextTick()
      resolvePick('/stale/f1.png')
      await pendingPick
      expect(session.prepared.value.f1).toBeUndefined()
      expect(session.picking.value).toBeNull()

      // 为 f1 和 f2 分别选中候选，再验证 failedIds 和队列移出各自清理
      session.chooseCandidate(candidate('f1', '/ok/f1.png'))
      session.chooseCandidate(candidate('f2', '/ok/f2.png'))
      await vi.waitFor(() => expect(session.previewSource('f1')?.mediaUrl).toBe('/media/ok/f1.png'))
      await vi.waitFor(() => expect(session.previewSource('f2')?.mediaUrl).toBe('/media/ok/f2.png'))

      failedIds.value = ['f1']
      await nextTick()
      expect(session.prepared.value.f1).toBeUndefined()
      expect(session.prepared.value.f2).toBe('/ok/f2.png')
      await vi.waitFor(() => expect(releaseFilePreview).toHaveBeenCalledWith('token:/ok/f1.png'))

      queue.value = [queue.value[0]]
      await nextTick()
      await vi.waitFor(() => expect(releaseFilePreview).toHaveBeenCalledWith('token:/ok/f2.png'))

      // 选择目录触发目录扫描
      await session.chooseScanDirectory()
      expect(startScan).toHaveBeenCalledWith(['f1'], '/picked-dir')
    } finally {
      session.dispose()
      lease.dispose()
    }
  })

  it('formatMatchReason 覆盖已知与未知匹配原因', () => {
    expect(formatMatchReason('identity')).toBe('可能是原文件')
    expect(formatMatchReason('hash')).toBe('内容一致')
    expect(formatMatchReason('name')).toBe('文件名一致')
    expect(formatMatchReason('custom')).toBe('可能匹配')
  })
})
