import '@/assets/global.css'
import '@greypan/web-ui'

import { describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import DetailDrawer from '../DetailDrawer.vue'

describe('资源详情抽屉', () => {
  it('无标签时提示和编辑按钮同处标签区域，主要操作并列显示', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const source = {
      id: 's',
      type: 'file' as const,
      location: '/tmp/example.png',
      available: true,
      isPreferred: true,
      orderIndex: 0,
      mediaUrl: null,
      thumbnailUrl: null,
      metadata: null
    }
    const app = createApp({
      render: () =>
        h(DetailDrawer, {
          open: true,
          mobile: false,
          editingNameKey: null,
          editorRef: () => () => {},
          replacingSourceIds: [],
          resolveDefaultOpenWith: async () => '',
          resource: {
            id: 'r',
            title: '图片',
            note: '',
            createdAt: 0,
            updatedAt: 0,
            sources: [source],
            preferred: source,
            tags: [],
            tagNames: [],
            available: true,
            kind: ResourceKind.ResourceKindImage,
            sizeBytes: 1024
          }
        })
    })
    try {
      app.mount(host)
      await nextTick()
      const drawer = host.querySelector('web-ui-drawer')!
      const panel = drawer.shadowRoot!.querySelector('dialog')!
      for (let frame = 0; !panel.open && frame < 300; frame++)
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      expect(panel.open).toBe(true)
      const empty = [...host.querySelectorAll('span')].find(element => element.textContent === '暂未添加标签')!
      const edit = host.querySelector<HTMLElement>('web-ui-button[aria-label="编辑标签"]')!
      const a = empty.getBoundingClientRect()
      const b = edit.getBoundingClientRect()
      expect(a.width).toBeGreaterThan(0)
      expect(b.left).toBeGreaterThan(a.right)
      expect(Math.abs((a.top + a.bottom - b.top - b.bottom) / 2)).toBeLessThan(3)
      const preview = [...host.querySelectorAll('button')].find(element => element.textContent?.includes('预览'))!
      const open = host.querySelector<HTMLElement>('web-ui-dropdown button[slot="trigger"]')!
      expect(open.getBoundingClientRect().left).toBeGreaterThan(preview.getBoundingClientRect().right)
    } finally {
      app.unmount()
      host.remove()
    }
  })
})
