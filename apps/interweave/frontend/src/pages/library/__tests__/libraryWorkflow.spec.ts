import { describe, expect, it, vi } from 'vite-plus/test'
import { computed, ref } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRestoreQueueItem } from '../../../components/library/restore'
import { createLibraryWorkflow, IMPORT_CONFIRM_THRESHOLD, type LibraryWorkflowPorts } from '../libraryWorkflow'

function createFakePorts(overrides: Partial<LibraryWorkflowPorts> = {}) {
  const submitting = ref(false)
  const progressState = ref({ done: 0, total: 0 })
  const progress = computed(() => progressState.value)

  const prepareBatchProgress = vi.fn<(total: number) => void>(total => {
    progressState.value = { done: 0, total }
  })
  const enqueueFileLocations = vi.fn<(locations: string[]) => Promise<void>>(async locations => {
    progressState.value = { done: locations.length, total: locations.length }
  })
  const enqueueURL = vi.fn<(url: string) => Promise<void>>(async () => undefined)
  const resolveDuplicate = vi.fn<(accept: boolean) => void>()
  const submit = vi.fn<LibraryWorkflowPorts['addQueue']['submit']>(async () => true)
  const close = vi.fn<() => Promise<void>>(async () => undefined)

  const expandImportEntries = vi.fn<LibraryWorkflowPorts['expandImportEntries']>(async entries => ({
    files: entries,
    folders: 0
  }))
  const chooseFilePaths = vi.fn<LibraryWorkflowPorts['chooseFilePaths']>(async () => [])
  const getClipboardFilePaths = vi.fn<LibraryWorkflowPorts['getClipboardFilePaths']>(async () => [])
  const readClipboardText = vi.fn<LibraryWorkflowPorts['readClipboardText']>(async () => '')
  const addResource = vi.fn<LibraryWorkflowPorts['addResource']>(async () => undefined)
  const replaceSource = vi.fn<LibraryWorkflowPorts['replaceSource']>(async () => undefined)
  const replaceScannedFileSource = vi.fn<LibraryWorkflowPorts['replaceScannedFileSource']>(async () => undefined)
  const consumeError = vi.fn<LibraryWorkflowPorts['consumeError']>((cause, fallback) =>
    cause instanceof Error && cause.message ? cause.message : fallback
  )
  const notifyWarning = vi.fn<LibraryWorkflowPorts['notifyWarning']>()

  const ports: LibraryWorkflowPorts = {
    addQueue: {
      submitting,
      progress,
      prepareBatchProgress,
      enqueueFileLocations,
      enqueueURL,
      resolveDuplicate,
      submit,
      close
    },
    expandImportEntries,
    chooseFilePaths,
    getClipboardFilePaths,
    readClipboardText,
    addResource,
    replaceSource,
    replaceScannedFileSource,
    consumeError,
    notifyWarning,
    ...overrides
  }

  return {
    ports,
    submitting,
    progressState,
    prepareBatchProgress,
    enqueueFileLocations,
    enqueueURL,
    resolveDuplicate,
    submit,
    close,
    expandImportEntries,
    chooseFilePaths,
    getClipboardFilePaths,
    readClipboardText,
    addResource,
    replaceSource,
    replaceScannedFileSource,
    consumeError,
    notifyWarning
  }
}

function makePaths(prefix: string, count: number) {
  return Array.from({ length: count }, (_, idx) => `/${prefix}/${idx + 1}.png`)
}

function restoreItem(id: string, kind: 'file' | 'url' = 'file', scanSnapshot?: string): LibraryRestoreQueueItem {
  return {
    id,
    sourceId: `src-${id}`,
    resourceId: `res-${id}`,
    resourceTitle: `Item ${id}`,
    resourceKind: kind === 'file' ? ResourceKind.ResourceKindImage : ResourceKind.ResourceKindWeb,
    kind,
    location: kind === 'file' ? `/old/${id}.png` : `https://old.example/${id}`,
    replacementLocation: kind === 'file' ? `/new/${id}.png` : `https://new.example/${id}`,
    scanSnapshot
  }
}

describe('libraryWorkflow', () => {
  it('确认队列严格串行排队，重复关闭幂等，失败时通过 consumeError 消费错误并保持打开', async () => {
    const ctx = createFakePorts()
    const workflow = createLibraryWorkflow(ctx.ports)
    const order: string[] = []

    workflow.openConfirmDialog({
      title: '第一项',
      message: 'msg-1',
      confirmLabel: '确认1',
      danger: false,
      action: async () => {
        order.push('first-fail')
        throw new Error('boom-1')
      }
    })
    workflow.openConfirmDialog({
      title: '第二项',
      message: 'msg-2',
      confirmLabel: '确认2',
      danger: true,
      action: () => {
        order.push('second-ok')
      }
    })

    expect(workflow.confirmOpen.value).toBe(true)
    expect(workflow.confirmRequest.value?.title).toBe('第一项')

    // 失败后保持打开并展示错误，不消费队列中的第二项
    await workflow.runConfirmedAction()
    expect(workflow.confirmOpen.value).toBe(true)
    expect(workflow.confirmError.value).toBe('boom-1')
    expect(workflow.confirmRequest.value?.title).toBe('第一项')

    // 取消第一项后自动串接第二项
    workflow.cancelConfirmDialog()
    expect(workflow.confirmOpen.value).toBe(true)
    expect(workflow.confirmRequest.value?.title).toBe('第二项')
    expect(workflow.confirmError.value).toBe('')

    await workflow.runConfirmedAction()
    expect(workflow.confirmOpen.value).toBe(false)
    expect(order).toEqual(['first-fail', 'second-ok'])

    // 已关闭时重复 closeConfirmDialog 为 no-op
    workflow.closeConfirmDialog()
    expect(workflow.confirmOpen.value).toBe(false)
  })

  it('超过阈值弹出批量导入确认、通过 prepareBatchProgress 重置进度，busy 停止只作用于当前批且保留排队批', async () => {
    let finishFirstBatch!: () => void
    const ctx = createFakePorts({
      expandImportEntries: async entries => ({ files: entries, folders: entries.length > 22 ? 2 : 0 })
    })
    const workflow = createLibraryWorkflow(ctx.ports)
    workflow.openAddDialog()

    // 未超阈值直接入队，不弹确认
    const small = makePaths('small', IMPORT_CONFIRM_THRESHOLD)
    await workflow.enqueueImportEntries(small)

    ctx.enqueueFileLocations.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finishFirstBatch = resolve
        })
    )
    expect(workflow.confirmOpen.value).toBe(false)
    expect(ctx.enqueueFileLocations).toHaveBeenCalledTimes(1)

    // 并发两批超阈值：第一批弹出，第二批排队
    const batchA = makePaths('a', IMPORT_CONFIRM_THRESHOLD + 1)
    const batchB = makePaths('b', IMPORT_CONFIRM_THRESHOLD + 5)
    await workflow.enqueueImportEntries(batchA)
    await workflow.enqueueImportEntries(batchB)

    expect(workflow.confirmOpen.value).toBe(true)
    expect(workflow.confirmRequest.value?.title).toBe('批量导入')
    expect(workflow.confirmRequest.value?.message).toContain(`共 ${batchA.length} 个文件`)
    expect(workflow.confirmRequest.value?.message).not.toContain('递归展开')

    // 模拟上一批残留进度，确认本批后应通过 prepareBatchProgress 归零并展示 0 / N
    ctx.progressState.value = { done: 20, total: 20 }
    const running = workflow.runConfirmedAction()
    expect(ctx.prepareBatchProgress).toHaveBeenCalledWith(batchA.length)
    expect(workflow.confirmBusy.value).toBe(true)
    expect(workflow.confirmButtonLabel.value).toBe(`0 / ${batchA.length}`)

    // busy 期间点「停止」调用 addQueue.close()，但不提前关闭弹窗或丢弃 batchB
    workflow.cancelConfirmDialog()
    expect(ctx.close).toHaveBeenCalledTimes(1)
    expect(workflow.confirmOpen.value).toBe(true)

    finishFirstBatch()
    await running

    // batchA 结算后自动弹出排队的 batchB（带文件夹递归展开说明）
    expect(workflow.confirmOpen.value).toBe(true)
    expect(workflow.confirmRequest.value?.message).toContain('2 个文件夹已递归展开')
    expect(workflow.confirmButtonLabel.value).toBe(`导入 ${batchB.length} 个文件`)
  })

  it('提交期间统一拦截 URL、文件展开前后与拖入入队，剪贴板按文件优先再回退有效链接', async () => {
    const ctx = createFakePorts()
    const workflow = createLibraryWorkflow(ctx.ports)
    workflow.openAddDialog()

    // submitting=true 时拦截 URL 与文件入队
    ctx.submitting.value = true
    workflow.requestAddURL('https://example.com/blocked')
    await workflow.enqueueImportEntries(['/a.png'])
    expect(ctx.enqueueURL).not.toHaveBeenCalled()
    expect(ctx.expandImportEntries).not.toHaveBeenCalled()
    expect(ctx.notifyWarning).toHaveBeenCalledTimes(2)

    // 展开进行期间进入 submitting=true：返回后复查并拦截
    ctx.submitting.value = false
    ctx.expandImportEntries.mockImplementationOnce(async entries => {
      ctx.submitting.value = true
      return { files: entries, folders: 0 }
    })
    await workflow.enqueueImportEntries(['/late.png'])
    expect(ctx.enqueueFileLocations).not.toHaveBeenCalled()
    expect(ctx.notifyWarning).toHaveBeenCalledTimes(3)

    // 恢复非提交态，测试剪贴板链接回退与无效文本提示
    ctx.submitting.value = false
    ctx.getClipboardFilePaths.mockResolvedValueOnce([])
    ctx.readClipboardText.mockResolvedValueOnce(' https://example.com/ok ')
    await workflow.pasteFilePaths()
    expect(ctx.enqueueURL).toHaveBeenCalledWith('https://example.com/ok')

    ctx.getClipboardFilePaths.mockResolvedValueOnce([])
    await workflow.pasteFilePaths('not-a-url')
    expect(ctx.notifyWarning).toHaveBeenLastCalledWith('剪切板中没有可导入的文件或有效链接')
  })

  it('找回提交部分失败时保留未完成项并记录 failedRestoreIds，全部成功时关闭弹窗', async () => {
    const ctx = createFakePorts()
    ctx.replaceSource.mockImplementationOnce(async () => undefined)
    ctx.replaceScannedFileSource.mockRejectedValueOnce(new Error('snapshot mismatch'))

    const workflow = createLibraryWorkflow(ctx.ports)
    const items = [restoreItem('ok', 'url'), restoreItem('bad', 'file', 'snap-1')]
    workflow.openRestoreDialog(items)
    expect(workflow.restoreOpen.value).toBe(true)

    await workflow.submitRestoreQueue(items)
    expect(workflow.restoreOpen.value).toBe(true)
    expect(workflow.restoreQueue.value.map(i => i.id)).toEqual(['bad'])
    expect(workflow.failedRestoreIds.value).toEqual(['bad'])
    expect(workflow.restoreError.value).toBe('snapshot mismatch')

    // 重试剩余项成功 -> 清空队列并关闭弹窗
    ctx.replaceScannedFileSource.mockResolvedValueOnce(undefined)
    await workflow.submitRestoreQueue(workflow.restoreQueue.value)
    expect(workflow.restoreQueue.value).toEqual([])
    expect(workflow.restoreOpen.value).toBe(false)
  })
})
