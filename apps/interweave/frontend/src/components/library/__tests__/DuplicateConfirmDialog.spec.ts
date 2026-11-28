// @vitest-environment jsdom

import * as browserKit from '@greypan/browser-kit'
import type { WebUiButton } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { ResourceLocationMatchDTO } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import type { LibraryDuplicatePrompt } from '../addQueue'
import DuplicateConfirmDialog from '../DuplicateConfirmDialog.vue'

function prompt(overrides: Partial<LibraryDuplicatePrompt> = {}): LibraryDuplicatePrompt {
  return {
    kind: 'file',
    location: '/tmp/photo.png',
    matches: [
      new ResourceLocationMatchDTO({
        resource_id: 'resource-1',
        title: '既有图片',
        location: '/library/photo.png'
      })
    ],
    ...overrides
  }
}

function mountDialog(
  listeners: { onAccept?: () => void; onCancel?: () => void } = {},
  value: LibraryDuplicatePrompt = prompt()
) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () => h(DuplicateConfirmDialog, { open: true, prompt: value, ...listeners })
  })
  app.mount(host)
  return {
    host,
    close: () => {
      app.unmount()
      host.remove()
    }
  }
}

function footerButton(host: HTMLElement, label: string) {
  const element = [...host.querySelectorAll<WebUiButton>('web-ui-button')].find(
    candidate => candidate.textContent?.trim() === label
  )
  if (!element) throw new Error(`button ${label} not found`)
  return element
}

describe('DuplicateConfirmDialog', () => {
  it('收到 open-change(false) 时按取消裁决', async () => {
    const onCancel = vi.fn<() => void>()
    const onAccept = vi.fn<() => void>()
    const mounted = mountDialog({ onAccept, onCancel })
    try {
      await nextTick()
      const dialog = mounted.host.querySelector('web-ui-dialog') as HTMLElement & {
        dispatchEvent: (event: Event) => boolean
      }
      dialog.dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
      await nextTick()

      expect(onCancel).toHaveBeenCalledOnce()
      expect(onAccept).not.toHaveBeenCalled()
    } finally {
      mounted.close()
    }
  })

  it('列出已有资源的标题与位置', async () => {
    const mounted = mountDialog()
    try {
      await nextTick()
      const text = mounted.host.textContent ?? ''
      expect(text).toContain('既有图片')
      expect(text).toContain('/library/photo.png')
      expect(mounted.host.querySelectorAll('li')).toHaveLength(1)
    } finally {
      mounted.close()
    }
  })

  it('「跳过」与「仍要导入」各自回到对应裁决，且仍要导入在左、跳过在右为主按钮', async () => {
    const onAccept = vi.fn<() => void>()
    const onCancel = vi.fn<() => void>()
    const mounted = mountDialog({ onAccept, onCancel })
    try {
      await nextTick()
      expect(mounted.host.textContent).toContain('存在多个指向同一位置的条目')
      const buttons = [...mounted.host.querySelectorAll<WebUiButton>('[slot="footer"] web-ui-button')]
      expect(buttons.map(button => button.textContent?.trim())).toEqual(['仍要导入', '跳过'])
      expect(buttons[0]?.getAttribute('variant')).toBe('secondary')
      expect(buttons[1]?.getAttribute('variant')).toBe('primary')

      footerButton(mounted.host, '跳过').click()
      footerButton(mounted.host, '仍要导入').click()

      expect(onCancel).toHaveBeenCalledOnce()
      expect(onAccept).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
    }
  })

  it('点击重复项左侧复制按钮仅当前条显示已复制状态，不联动同路径其他条目', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    )
    const copySpy = vi.spyOn(browserKit, 'copyToClipboard').mockResolvedValue(undefined)
    const mounted = mountDialog(
      {},
      prompt({
        matches: [
          new ResourceLocationMatchDTO({
            resource_id: 'resource-1',
            title: '较早的记录',
            location: '/library/photo.png'
          }),
          new ResourceLocationMatchDTO({
            resource_id: 'resource-2',
            title: '较晚的记录',
            location: '/library/photo.png'
          })
        ]
      })
    )
    try {
      await nextTick()
      const copyButtons = mounted.host.querySelectorAll<HTMLElement>(
        'web-ui-button[aria-label="复制 /library/photo.png"]'
      )
      expect(copyButtons).toHaveLength(2)
      copyButtons[0]!.click()
      await nextTick()

      expect(copySpy).toHaveBeenCalledExactlyOnceWith('/library/photo.png')
      expect(copyButtons[0]!.getAttribute('aria-label')).toBe('已复制 /library/photo.png')
      expect(copyButtons[1]!.getAttribute('aria-label')).toBe('复制 /library/photo.png')
    } finally {
      copySpy.mockRestore()
      vi.unstubAllGlobals()
      mounted.close()
    }
  })

  it('导入链接重复时标题显示「资源库中已有这个链接」', async () => {
    const mounted = mountDialog(
      {},
      prompt({
        kind: 'url',
        location: 'https://example.com',
        matches: [
          new ResourceLocationMatchDTO({
            resource_id: 'resource-1',
            title: '示例网页',
            location: 'https://example.com'
          })
        ]
      })
    )
    try {
      await nextTick()
      expect(mounted.host.textContent).toContain('资源库中已有这个链接')
      expect(mounted.host.textContent).not.toContain('资源库中已有这个文件')
    } finally {
      mounted.close()
    }
  })

  it('关闭时 prompt 置空仍保留已渲染列表，避免退场动画期间高度跳变', async () => {
    const open = ref(true)
    const currentPrompt = ref<LibraryDuplicatePrompt | null>(prompt())
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      setup: () => () =>
        h(DuplicateConfirmDialog, {
          open: open.value,
          prompt: currentPrompt.value,
          onAccept: () => {},
          onCancel: () => {}
        })
    })
    app.mount(host)
    try {
      await nextTick()
      expect(host.querySelectorAll('li')).toHaveLength(1)
      open.value = false
      currentPrompt.value = null
      await nextTick()

      expect(host.querySelectorAll('li')).toHaveLength(1)
      expect(host.textContent).toContain('/library/photo.png')
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('同一位置命中多个资源时逐条列出', async () => {
    const mounted = mountDialog(
      {},
      prompt({
        matches: [
          new ResourceLocationMatchDTO({
            resource_id: 'resource-1',
            title: '较早的记录',
            location: '/library/photo.png'
          }),
          new ResourceLocationMatchDTO({
            resource_id: 'resource-2',
            title: '较晚的记录',
            location: '/library/photo.png'
          })
        ]
      })
    )
    try {
      await nextTick()
      expect(mounted.host.querySelectorAll('li')).toHaveLength(2)
      expect(mounted.host.textContent).toContain('较早的记录')
      expect(mounted.host.textContent).toContain('较晚的记录')
      const tooltips = [...mounted.host.querySelectorAll('li web-ui-tooltip')]
      expect(tooltips).toHaveLength(2)
      expect(tooltips.every(tooltip => tooltip.hasAttribute('portal'))).toBe(true)
    } finally {
      mounted.close()
    }
  })
})
