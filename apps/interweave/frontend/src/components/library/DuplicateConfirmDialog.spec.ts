// @vitest-environment jsdom

import type { WebUiButton } from '@greypan/web-ui'
import { describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceLocationMatchDTO } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'

import type { LibraryDuplicatePrompt } from './addQueue'
import DuplicateConfirmDialog from './DuplicateConfirmDialog.vue'

function prompt(overrides: Partial<LibraryDuplicatePrompt> = {}): LibraryDuplicatePrompt {
  return {
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
  it('Escape 关闭时按取消裁决', async () => {
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

  it('「取消」与「仍要添加」各自回到对应裁决', async () => {
    const onAccept = vi.fn<() => void>()
    const onCancel = vi.fn<() => void>()
    const mounted = mountDialog({ onAccept, onCancel })
    try {
      await nextTick()
      footerButton(mounted.host, '取消').click()
      footerButton(mounted.host, '仍要添加').click()

      expect(onCancel).toHaveBeenCalledOnce()
      expect(onAccept).toHaveBeenCalledOnce()
    } finally {
      mounted.close()
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
    } finally {
      mounted.close()
    }
  })
})
