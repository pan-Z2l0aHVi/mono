// @vitest-environment jsdom

import '@greypan/web-ui'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { LibraryRestoreQueueItem } from './restore'
import RestoreDialog from './RestoreDialog.vue'

function queueItem(overrides: Partial<LibraryRestoreQueueItem> = {}): LibraryRestoreQueueItem {
  return {
    id: 'queue-item',
    sourceId: 'source-1',
    resourceId: 'resource-1',
    resourceTitle: '失效资源',
    kind: 'url',
    location: 'https://example.com/post',
    replacementLocation: '',
    ...overrides
  }
}

function mountDialog(queue: LibraryRestoreQueueItem[] = []) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () =>
      h(RestoreDialog, {
        open: true,
        queue,
        busy: false,
        error: '',
        mobile: false,
        activeItemId: null
      })
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

describe('RestoreDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('token 扣掉的是实测 chrome（142），内层不再复述 chrome 常数', async () => {
    const mounted = mountDialog([queueItem()])
    try {
      await nextTick()

      const dialog = mounted.host.querySelector('web-ui-dialog')
      if (!dialog) throw new Error('web-ui-dialog was not rendered')

      // 空格必须写成下划线：字面空格会被 Tailwind 拆成三个类，整条声明静默失效。
      expect(dialog.getAttribute('class')).toContain('[--wui-dialog-max-height:calc(min(90vh,640px)_-_142px)]')

      const inner = [...mounted.host.querySelectorAll<HTMLElement>('[style]')].find(el =>
        el.style.height.includes('--wui-dialog-max-height')
      )
      if (!inner) throw new Error('inner grid was not rendered')
      expect(inner.style.height).toBe('var(--wui-dialog-max-height)')
      // 回归护栏：旧的 108 不得复活。
      expect(mounted.host.innerHTML).not.toContain('108px')
    } finally {
      mounted.close()
    }
  })
})
