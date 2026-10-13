import '@greypan/web-ui'

import type { WebUiContextMenu } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import ResourceList from '../ResourceList.vue'

import { currentScrollY, stubLayout, ROW_ESTIMATE, ROW_HEIGHT, VIEWPORT_HEIGHT } from './virtualLayout'

/*
 * 这条用例只在真实浏览器里跑：jsdom 没有 :focus-visible 的实现，
 * 也无法读到页面级 focus ring 的 computed outline 值。
 *
 * 断言读取 getComputedStyle(row).outline* —— 不靠属性字符串代理。
 * 只有方向键移动后、目标行真正 :focus-visible 时，outline 才会是非 none 的实值。
 */

if (!customElements.get('web-ui-context-menu')) {
  customElements.define(
    'web-ui-context-menu',
    class extends HTMLElement {
      openAt() {}
      close() {}
    }
  )
}

function resource(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'r1',
    title: '一条资源',
    note: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    sources: [
      {
        id: 's1',
        type: 'file',
        location: '/tmp/a.png',
        available: true,
        isPreferred: true,
        orderIndex: 0,
        metadata: null
      }
    ],
    preferred: null,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 1024,
    ...overrides
  }
}

async function mountList(resources: ResourceView[], activeResourceId: string | null = null) {
  const restoreLayout = stubLayout()
  const host = document.createElement('div')
  document.body.append(host)
  const activeId = { value: activeResourceId }
  const app = createApp({
    render: () =>
      h(ResourceList, {
        resources,
        activeResourceId: activeId.value,
        checkedIds: [],
        selectionMode: false,
        editingNameKey: null,
        editorRef: () => () => {},
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '没有符合条件的资源',
        mediaUrlFor: () => null,
        onActivate: (r: ResourceView) => {
          activeId.value = r.id
        }
      })
  })
  app.mount(host)
  await nextTick()
  return {
    host,
    rows: () => [...host.querySelectorAll<HTMLElement>('[data-resource-row]')],
    container: host.querySelector<HTMLElement>('[role="list"]'),
    activeId: () => activeId.value,
    unmount: () => {
      app.unmount()
      host.remove()
      restoreLayout()
    }
  }
}

/** 有界轮询：条件成立即刻通过，帧预算耗尽才失败。 */
async function waitFor(condition: () => boolean, label: string, maxFrames = 180): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

const hosts: HTMLElement[] = []
const apps: { unmount: () => void }[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

describe('ResourceList：页面级 focus ring 真实读数（浏览器）', () => {
  it('方向键移动后，焦点行有非 none 的 outline-style，非焦点行是 none', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    hosts.push(mounted.host)
    apps.push({ unmount: mounted.unmount })

    try {
      // 初始：第一行是活动行（activeIndex = 0，tabindex="0"），但未聚焦
      const rows = mounted.rows()
      expect(rows.length).toBe(3)

      // 先让容器获焦，再按 Enter 进入列表（enterList 逻辑）
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 模拟 Enter 键：enterList 会把焦点交给当前活动行（r1）
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      container.dispatchEvent(enterEvent)
      await waitFor(() => document.activeElement === rows[0], '焦点落到第 1 行')

      // 此时第 1 行应有 outline-style（页面级 focus ring）
      const outlineStyle1 = getComputedStyle(rows[0]).outlineStyle
      const outlineWidth1 = getComputedStyle(rows[0]).outlineWidth
      expect(outlineStyle1, '第 1 行应有 focus ring').not.toBe('none')
      expect(outlineWidth1, '第 1 行 outline-width 应非 0px').not.toBe('0px')

      // 第 2、3 行不应有 outline-style
      const outlineStyle2 = getComputedStyle(rows[1]).outlineStyle
      const outlineStyle3 = getComputedStyle(rows[2]).outlineStyle
      expect(outlineStyle2, '第 2 行不应有 focus ring').toBe('none')
      expect(outlineStyle3, '第 3 行不应有 focus ring').toBe('none')

      // 按 ArrowDown 移到第 2 行
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
      rows[0].dispatchEvent(downEvent)
      await waitFor(() => document.activeElement === rows[1], '焦点移到第 2 行')

      // 现在第 2 行应有 outline-style
      const outlineStyle2After = getComputedStyle(rows[1]).outlineStyle
      const outlineWidth2 = getComputedStyle(rows[1]).outlineWidth
      expect(outlineStyle2After, '第 2 行应有 focus ring').not.toBe('none')
      expect(outlineWidth2, '第 2 行 outline-width 应非 0px').not.toBe('0px')

      // 第 1 行 outline-style 应消失
      const outlineStyle1After = getComputedStyle(rows[0]).outlineStyle
      expect(outlineStyle1After, '第 1 行 outline-style 应消失').toBe('none')

      // 第 3 行仍无 outline-style
      const outlineStyle3After = getComputedStyle(rows[2]).outlineStyle
      expect(outlineStyle3After, '第 3 行仍无 focus ring').toBe('none')

      // 再按 ArrowDown 移到第 3 行
      rows[1].dispatchEvent(downEvent)
      await waitFor(() => document.activeElement === rows[2], '焦点移到第 3 行')

      const outlineStyle3Final = getComputedStyle(rows[2]).outlineStyle
      const outlineWidth3 = getComputedStyle(rows[2]).outlineWidth
      expect(outlineStyle3Final, '第 3 行应有 focus ring').not.toBe('none')
      expect(outlineWidth3, '第 3 行 outline-width 应非 0px').not.toBe('0px')

      // 第 2 行 outline-style 应消失
      const outlineStyle2Final = getComputedStyle(rows[1]).outlineStyle
      expect(outlineStyle2Final, '第 2 行 outline-style 应消失').toBe('none')
    } finally {
      mounted.unmount()
    }
  })

  it('End 键跳到最后一行，该行有 focus ring', async () => {
    const resources = ['r1', 'r2', 'r3', 'r4', 'r5'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    hosts.push(mounted.host)
    apps.push({ unmount: mounted.unmount })

    try {
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 进入列表
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      container.dispatchEvent(enterEvent)
      await waitFor(() => document.activeElement === mounted.rows()[0], '焦点落到第 1 行')

      // 按 End 跳到最后一行
      const endEvent = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
      mounted.rows()[0].dispatchEvent(endEvent)
      await waitFor(() => document.activeElement === mounted.rows()[4], '焦点跳到第 5 行')

      const rows = mounted.rows()
      const outlineStyleLast = getComputedStyle(rows[4]).outlineStyle
      const outlineWidthLast = getComputedStyle(rows[4]).outlineWidth
      expect(outlineStyleLast, '第 5 行应有 focus ring').not.toBe('none')
      expect(outlineWidthLast, '第 5 行 outline-width 应非 0px').not.toBe('0px')

      // 其他行无 outline-style
      for (let i = 0; i < 4; i++) {
        expect(getComputedStyle(rows[i]).outlineStyle, `第 ${i + 1} 行不应有 focus ring`).toBe('none')
      }
    } finally {
      mounted.unmount()
    }
  })
})
