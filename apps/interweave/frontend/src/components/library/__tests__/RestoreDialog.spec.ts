// @vitest-environment jsdom
import { toast } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRestoreQueueItem } from '../restore'
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
    const chooseFilePath = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('/new/file')
    const submit = vi.fn()
    const scanToast = vi.spyOn(toast, 'info').mockReturnValue('scan-toast')
    const releaseFilePreview = vi.fn(async () => undefined)
    const prepareFilePreview = vi.fn(async () => ({
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
          prepareFilePreview,
          releaseFilePreview,
          onSubmit: submit
        })
    })
    app.mount(host)
    try {
      const scan = [...host.querySelectorAll<HTMLElement>('web-ui-button')].find(button =>
        button.textContent?.includes('一键扫描')
      )!
      scan.click()
      expect(scanToast).toHaveBeenCalledWith('一键扫描暂不可用，请手动选择资源位置', expect.anything())
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
      const urlDialog = dialogs[1]
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
      scanToast.mockRestore()
      app.unmount()
      host.remove()
    }
  })
})
