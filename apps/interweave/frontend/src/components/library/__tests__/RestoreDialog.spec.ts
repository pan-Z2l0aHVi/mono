// @vitest-environment jsdom
import { toast } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRestoreQueueItem, RecoveryScanUpdate } from '../restore'
import RestoreDialog from '../RestoreDialog.vue'

const items: LibraryRestoreQueueItem[] = [
  {
    id: 'file',
    sourceId: 'file',
    resourceId: 'a',
    resourceTitle: '文件',
    resourceKind: ResourceKind.ResourceKindImage,
    kind: 'file',
    location: '/old',
    replacementLocation: ''
  },
  {
    id: 'url',
    sourceId: 'url',
    resourceId: 'b',
    resourceTitle: '网页',
    resourceKind: ResourceKind.ResourceKindWeb,
    kind: 'url',
    location: 'https://old.example/',
    replacementLocation: 'https://old.example/'
  }
]

describe('RestoreDialog', () => {
  it('取消文件选择保留失效项，选择后可撤回，确认只提交已准备项', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const chooseFilePath = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('/new/file')
    const submit = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()
    const addItems = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()
    const releaseFilePreview = vi.fn<(token: string) => Promise<void>>(async () => undefined)
    const prepareFilePreview = vi.fn<
      (path: string) => Promise<{ kind: ResourceKind; token?: string; media_url?: string }>
    >(async () => ({
      kind: ResourceKind.ResourceKindImage,
      token: 'preview-token',
      media_url: '/preview'
    }))
    const app = createApp({
      render: () =>
        h(RestoreDialog, {
          open: true,
          queue: items,
          busy: false,
          error: '',
          mobile: false,
          activeItemId: null,
          chooseFilePath,
          allUnavailableFiles: [{ ...items[0], id: 'other', sourceId: 'other' }],
          failedIds: [],
          chooseDirectory: async () => null,
          startScan: async () => 'scan',
          pollScan: async () => ({
            candidates: [],
            checked: 0,
            currentDirectory: '',
            skipped: 0,
            done: true,
            cancelled: false,
            error: ''
          }),
          cancelScan: async () => undefined,
          discardScan: async () => undefined,
          prepareFilePreview,
          releaseFilePreview,
          onSubmit: submit,
          onAddItems: addItems
        })
    })
    app.mount(host)
    try {
      const scan = [...host.querySelectorAll<HTMLElement>('web-ui-button')].find(button =>
        button.textContent?.includes('一键扫描')
      )!
      scan.click()
      await nextTick()
      expect(host.textContent).toContain('扫描范围')
      expect(addItems).not.toHaveBeenCalled()
      const scanDialog = host.querySelectorAll('web-ui-dialog')[1]
      ;[...scanDialog.querySelectorAll<HTMLElement>('web-ui-button')]
        .find(button => button.textContent?.trim() === '取消')!
        .click()
      await nextTick()
      expect(addItems).not.toHaveBeenCalled()
      scan.click()
      await nextTick()
      ;[...scanDialog.querySelectorAll<HTMLElement>('web-ui-button')]
        .find(button => button.textContent?.trim() === '扫描选定文件夹')!
        .click()
      await nextTick()
      expect(addItems).not.toHaveBeenCalled()
      expect(host.querySelector('[role="alert"]')).toBeNull()
      const find = (label: string) => host.querySelector<HTMLElement>(`web-ui-button[aria-label="${label}"]`)
      find('手动选择 文件')!.click()
      await vi.waitFor(() => expect(chooseFilePath).toHaveBeenCalledTimes(1))
      await nextTick()
      expect(find('手动选择 文件')).not.toBeNull()
      find('手动选择 文件')!.click()
      await vi.waitFor(() => expect(find('撤回 文件')).not.toBeNull())
      await vi.waitFor(() => expect(host.querySelector('img')?.getAttribute('src')).toBe('/preview'))
      find('撤回 文件')!.click()
      expect(releaseFilePreview).toHaveBeenCalledWith('preview-token')
      await nextTick()
      expect(find('手动选择 文件')).not.toBeNull()
      find('手动选择 网页')!.click()
      await nextTick()
      expect(find('手动选择 网页')).not.toBeNull()
      const dialogs = host.querySelectorAll('web-ui-dialog')
      const urlDialog = dialogs[3]
      const cancelUrl = [...urlDialog.querySelectorAll<HTMLElement>('web-ui-button')].find(
        button => button.textContent?.trim() === '取消'
      )!
      cancelUrl.click()
      await nextTick()
      expect(find('手动选择 网页')).not.toBeNull()
      expect(find('撤回 网页')).toBeNull()
      find('手动选择 网页')!.click()
      await nextTick()
      const complete = [...host.querySelectorAll<HTMLElement>('web-ui-button')].find(
        button => button.textContent?.trim() === '更新链接'
      )!
      const input = host.querySelector('web-ui-input[aria-label="新链接"]') as HTMLElement & { value: string }
      expect(input.value).toBe('')
      input.value = 'https://new.example/'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await nextTick()
      complete.click()
      await nextTick()
      expect(find('撤回 网页')).not.toBeNull()
      const confirm = [...host.querySelectorAll<HTMLElement>('web-ui-button')].find(button =>
        button.textContent?.includes('确认找回')
      )!
      confirm.click()
      expect(submit).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'url', replacementLocation: 'https://new.example/' })
      ])
      expect(chooseFilePath).toHaveBeenCalledTimes(2)
    } finally {
      app.unmount()
      host.remove()
    }
  })
  it('扫描增量候选发生冲突时要求选择，停止后仍接收末批结果', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const candidate = (path: string) => ({
      sourceID: 'file',
      path,
      size: 10,
      modifiedAt: 1,
      matchReasons: ['name'],
      snapshot: path
    })
    const startScan = vi.fn<(ids: string[], directory: string) => Promise<string>>(async () => 'scan')
    const addItems = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()
    const notification = vi.spyOn(toast, 'info').mockReturnValue('scan-toast')
    const cancelScan = vi.fn<(id: string) => Promise<void>>(async () => undefined)
    let finish!: (value: {
      candidates: ReturnType<typeof candidate>[]
      checked: number
      currentDirectory: string
      skipped: number
      done: boolean
      cancelled: boolean
      error: string
    }) => void
    const pollScan = vi
      .fn<(id: string) => Promise<RecoveryScanUpdate>>()
      .mockResolvedValueOnce({
        candidates: [candidate('/a')],
        checked: 1,
        currentDirectory: '/',
        skipped: 0,
        done: false,
        cancelled: false,
        error: ''
      })
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve
          })
      )
    const submit = vi.fn<(items: LibraryRestoreQueueItem[]) => void>()
    const app = createApp({
      render: () =>
        h(RestoreDialog, {
          open: true,
          queue: [items[0]],
          busy: false,
          error: '',
          mobile: false,
          activeItemId: null,
          allUnavailableFiles: [{ ...items[0], id: 'other', sourceId: 'other' }],
          failedIds: [],
          chooseFilePath: async () => null,
          chooseDirectory: async () => null,
          startScan,
          pollScan,
          cancelScan,
          discardScan: async () => undefined,
          prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindImage }),
          releaseFilePreview: async () => undefined,
          onSubmit: submit,
          onAddItems: addItems
        })
    })
    app.mount(host)
    try {
      const button = (text: string) =>
        [...host.querySelectorAll<HTMLElement>('button, web-ui-button')].find(el => el.textContent?.trim() === text)!
      button('一键扫描').click()
      await nextTick()
      expect(addItems).not.toHaveBeenCalled()
      button('扫描全盘').click()
      expect(addItems).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ sourceId: 'other' })]))
      expect(startScan).toHaveBeenCalledWith(['file', 'other'], '')
      expect(notification).toHaveBeenCalledWith('已找到 2 条失效资源', { position: 'top-center' })
      await vi.waitFor(() => expect(host.querySelector('[aria-label="撤回 文件"]')).not.toBeNull())
      await vi.waitFor(() => expect(pollScan).toHaveBeenCalledTimes(2))
      expect(host.textContent).not.toContain('一键扫描')
      expect(button('停止扫描').getAttribute('slot')).toBe('footer')
      expect(button('取消').hasAttribute('disabled')).toBe(true)
      expect(button('确认找回').hasAttribute('disabled')).toBe(true)
      button('停止扫描').click()
      expect(cancelScan).toHaveBeenCalledWith('scan')
      finish({
        candidates: [candidate('/b')],
        checked: 2,
        currentDirectory: '/',
        skipped: 0,
        done: true,
        cancelled: true,
        error: ''
      })
      await vi.waitFor(() => expect(host.textContent).toContain('找到 2 个候选'))
      expect(host.textContent).toContain('扫描未完成')
      button('找到 2 个候选，选择文件').click()
      await nextTick()
      expect(host.textContent).toContain('文件名一致')
      const choice = [...host.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.includes('/b'))!
      choice.click()
      await nextTick()
      button('确认找回').click()
      expect(submit).toHaveBeenCalledWith([expect.objectContaining({ replacementLocation: '/b', scanSnapshot: '/b' })])
    } finally {
      notification.mockRestore()
      app.unmount()
      host.remove()
    }
  })
})
