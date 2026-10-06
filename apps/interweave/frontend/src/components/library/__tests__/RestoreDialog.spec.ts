// @vitest-environment jsdom

import '@greypan/web-ui'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { LibraryRestoreQueueItem } from '../restore'
import RestoreDialog from '../RestoreDialog.vue'

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

  /*
   * 与 AddDialog / SettingsDialog 同一形状的高度护栏：`--wui-dialog-max-height` 的语义
   * 已从「整卡高度」改成「内容区高度」，上限改由 web-ui-dialog 内部的 `.desc` 承担，
   * 宿主因此不再复述 chrome 常数。
   *
   * 只断言「内层引用 token 而非写死像素」这一层：jsdom 没有布局引擎，解不出 Tailwind
   * 任意值里的 calc，具体几何由浏览器验证与 packages/web-ui 的
   * dialog-content-height.browser.spec.ts 覆盖。这条护栏防的是真回归——内层改回写死 px
   * 会让内容区在窄屏被压扁。
   */
  it('内容区高度走 --wui-dialog-max-height token，内层不再复述 chrome 常数', async () => {
    const mounted = mountDialog([queueItem()])
    try {
      await nextTick()

      const inner = [...mounted.host.querySelectorAll<HTMLElement>('[style]')].find(el =>
        el.style.height.includes('--wui-dialog-max-height')
      )
      if (!inner) throw new Error('inner grid was not rendered')
      expect(inner.style.height).toBe('var(--wui-dialog-max-height)')
      // 回归护栏：内层不得再出现 chrome 常数（token 里那一次是新语义下的换算）。
      expect(inner.style.height).not.toMatch(/\d+px/)
    } finally {
      mounted.close()
    }
  })
})
