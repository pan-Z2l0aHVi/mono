import '@/assets/global.css'
import '@greypan/web-ui'

import { describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import PreviewDrawer from '../PreviewDrawer.vue'

describe('失效资源预览操作', () => {
  it('指针进入时文字和箭头相互靠近，离开后复原', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const source = {
      id: 's',
      type: 'file' as const,
      location: '/missing.png',
      available: false,
      isPreferred: true,
      orderIndex: 0,
      mediaUrl: null,
      thumbnailUrl: null,
      metadata: null
    }
    const app = createApp({
      render: () =>
        h(PreviewDrawer, {
          open: true,
          mobile: false,
          openExternal: async () => {},
          resource: {
            id: 'r',
            title: '失效图片',
            note: '',
            createdAt: 0,
            updatedAt: 0,
            sources: [source],
            preferred: source,
            tags: [],
            tagNames: [],
            available: false,
            kind: ResourceKind.ResourceKindImage,
            sizeBytes: null
          }
        })
    })
    try {
      app.mount(host)
      await nextTick()
      const button = host.querySelector<HTMLElement>('web-ui-button[slot="action"]')!
      const text = button.querySelector<HTMLElement>('.converge-label')!
      const icon = button.querySelector<HTMLElement>('.converge-suffix')!
      const settle = async () => {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        await Promise.all([text, icon].flatMap(element => element.getAnimations().map(animation => animation.finished)))
      }
      const positions = () => {
        const origin = button.getBoundingClientRect().left
        return [text.getBoundingClientRect().left - origin, icon.getBoundingClientRect().left - origin]
      }
      /*
       * 悬停反馈是过渡：指针动作返回时首帧样式可能还没落定，等一个可观察位置再断言，
       * 不赌固定时长。超时信息带上 :hover 与 media，区分「过渡没开始」与「hover 没命中」。
       */
      const waitForPositions = async (
        expected: (current: [number, number]) => boolean,
        label: string
      ): Promise<void> => {
        for (let frame = 0; frame < 300; frame++) {
          if (expected(positions() as [number, number])) return
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        }
        throw new Error(
          `300 帧内未满足：${label}（:hover=${button.matches(':hover')}，` +
            `hover media=${matchMedia('(hover: hover)').matches}）`
        )
      }
      const drawer = host.querySelector('web-ui-drawer')!
      const panel = drawer.shadowRoot!.querySelector('dialog')!
      for (let frame = 0; !panel.open && frame < 300; frame++)
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      expect(panel.open).toBe(true)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await Promise.all(
        [...panel.getAnimations(), ...document.documentElement.getAnimations()].map(animation =>
          animation.finished.catch(() => undefined)
        )
      )
      await userEvent.hover(host.querySelector<HTMLElement>('web-ui-empty > web-ui-icon[slot=icon]')!)
      await settle()
      const initial = positions()
      await userEvent.hover(button)
      await waitForPositions(
        ([textLeft, iconLeft]) => textLeft > initial[0] && iconLeft < initial[1],
        '悬停后文字与箭头应相互靠近'
      )
      await settle()
      expect(button.matches(':hover')).toBe(true)
      expect(matchMedia('(hover: hover)').matches).toBe(true)
      expect(matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(true)
      const hovered = positions()
      expect(hovered[0]).toBeGreaterThan(initial[0])
      expect(hovered[1]).toBeLessThan(initial[1])
      await userEvent.hover(host.querySelector<HTMLElement>('web-ui-empty > web-ui-icon[slot=icon]')!)
      await waitForPositions(
        ([textLeft, iconLeft]) => Math.abs(textLeft - initial[0]) < 0.5 && Math.abs(iconLeft - initial[1]) < 0.5,
        '离开后文字与箭头应复原'
      )
      await settle()
      const restored = positions()
      expect(Math.abs(restored[0] - initial[0])).toBeLessThan(0.5)
      expect(Math.abs(restored[1] - initial[1])).toBeLessThan(0.5)
    } finally {
      app.unmount()
      host.remove()
    }
  })
})
