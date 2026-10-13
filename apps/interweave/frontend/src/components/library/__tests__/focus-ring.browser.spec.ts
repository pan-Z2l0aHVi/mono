import '@/assets/global.css'
import '@greypan/web-ui'

import type { WebUiContextMenu } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, ref } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import ResourceList from '../ResourceList.vue'

import { currentScrollY, stubLayout, ROW_ESTIMATE, ROW_HEIGHT, VIEWPORT_HEIGHT } from './virtualLayout'

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
  host.id = 'app'
  document.body.append(host)

  const activeId = ref(activeResourceId)
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

async function waitFor(condition: () => boolean, label: string, maxFrames = 180): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

describe('ResourceList：页面级 focus ring 真实读数（浏览器）', () => {
  it('方向键移动后，焦点行有非 none 的 outlineStyle，非焦点行是 none', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    hosts.push(mounted.host)

    try {
      // 初始：第一行是活动行（activeIndex = 0，tabindex="0"），但未聚焦
      const rows = mounted.rows()
      expect(rows.length).toBe(3)

      // 先让容器获焦，再按 Enter 进入列表（enterList 逻辑）
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 用真实输入模拟 Enter 键：enterList 会把焦点交给当前活动行（r1）
      await userEvent.keyboard('{Enter}')
      await waitFor(() => document.activeElement === rows[0], '焦点落到第 1 行')

      // 此时第 1 行应有 outlineStyle（页面级 focus ring：solid 浅蓝）
      const outlineStyle1 = getComputedStyle(rows[0]).outlineStyle
      const outlineWidth1 = getComputedStyle(rows[0]).outlineWidth
      const outlineColor1 = getComputedStyle(rows[0]).outlineColor
      const outlineOffset1 = getComputedStyle(rows[0]).outlineOffset
      expect(outlineStyle1, '第 1 行应有 focus ring').not.toBe('none')
      expect(outlineWidth1, '第 1 行 outline-width 应非 0px').not.toBe('0px')
      expect(outlineColor1, '第 1 行 outline-color 应为页面级半透明浅蓝').toMatch(
        /(rgba?\(0,\s*136,\s*255|rgb\(0,\s*95,\s*204\))/
      )

      // 第 2、3 行不应有 outlineStyle
      const outlineStyle2 = getComputedStyle(rows[1]).outlineStyle
      const outlineStyle3 = getComputedStyle(rows[2]).outlineStyle
      expect(outlineStyle2, '第 2 行不应有 focus ring').toBe('none')
      expect(outlineStyle3, '第 3 行不应有 focus ring').toBe('none')

      // 用真实输入按 ArrowDown 移到第 2 行
      await userEvent.keyboard('{ArrowDown}')
      await waitFor(() => document.activeElement === rows[1], '焦点移到第 2 行')

      // 现在第 2 行应有 outlineStyle
      const outlineStyle2After = getComputedStyle(rows[1]).outlineStyle
      const outlineWidth2 = getComputedStyle(rows[1]).outlineWidth
      const outlineColor2 = getComputedStyle(rows[1]).outlineColor
      expect(outlineStyle2After, '第 2 行应有 focus ring').not.toBe('none')
      expect(outlineWidth2, '第 2 行 outline-width 应非 0px').not.toBe('0px')
      expect(outlineColor2, '第 2 行 outline-color 应为页面级半透明浅蓝').toMatch(
        /(rgba?\(0,\s*136,\s*255|rgb\(0,\s*95,\s*204\))/
      )

      // 第 1 行 outlineStyle 应消失
      const outlineStyle1After = getComputedStyle(rows[0]).outlineStyle
      expect(outlineStyle1After, '第 1 行 outlineStyle 应消失').toBe('none')

      // 第 3 行仍无 outlineStyle
      const outlineStyle3After = getComputedStyle(rows[2]).outlineStyle
      expect(outlineStyle3After, '第 3 行仍无 focus ring').toBe('none')

      // 再按 ArrowDown 移到第 3 行
      await userEvent.keyboard('{ArrowDown}')
      await waitFor(() => document.activeElement === rows[2], '焦点移到第 3 行')

      const outlineStyle3Final = getComputedStyle(rows[2]).outlineStyle
      const outlineWidth3 = getComputedStyle(rows[2]).outlineWidth
      const outlineColor3 = getComputedStyle(rows[2]).outlineColor
      expect(outlineStyle3Final, '第 3 行应有 focus ring').not.toBe('none')
      expect(outlineWidth3, '第 3 行 outline-width 应非 0px').not.toBe('0px')
      expect(outlineColor3, '第 3 行 outline-color 应为页面级半透明浅蓝').toMatch(
        /(rgba?\(0,\s*136,\s*255|rgb\(0,\s*95,\s*204\))/
      )

      // 第 2 行 outlineStyle 应消失
      const outlineStyle2Final = getComputedStyle(rows[1]).outlineStyle
      expect(outlineStyle2Final, '第 2 行 outlineStyle 应消失').toBe('none')
    } finally {
      mounted.unmount()
    }
  })

  it('End 键跳到最后一行，该行有 focus ring', async () => {
    const resources = ['r1', 'r2', 'r3', 'r4', 'r5'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    hosts.push(mounted.host)

    try {
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 进入列表
      await userEvent.keyboard('{Enter}')
      await waitFor(() => document.activeElement === mounted.rows()[0], '焦点落到第 1 行')

      // 按 End 跳到最后一行
      await userEvent.keyboard('{End}')
      await waitFor(() => document.activeElement === mounted.rows()[4], '焦点跳到第 5 行')

      const rows = mounted.rows()
      const outlineStyleLast = getComputedStyle(rows[4]).outlineStyle
      const outlineWidthLast = getComputedStyle(rows[4]).outlineWidth
      const outlineColorLast = getComputedStyle(rows[4]).outlineColor
      expect(outlineStyleLast, '第 5 行应有 focus ring').not.toBe('none')
      expect(outlineWidthLast, '第 5 行 outline-width 应非 0px').not.toBe('0px')
      expect(outlineColorLast, '第 5 行 outline-color 应为页面级半透明浅蓝').toMatch(
        /(rgba?\(0,\s*136,\s*255|rgb\(0,\s*95,\s*204\))/
      )

      // 其他行无 outlineStyle
      for (let i = 0; i < 4; i++) {
        expect(getComputedStyle(rows[i]).outlineStyle, `第 ${i + 1} 行不应有 focus ring`).toBe('none')
      }
    } finally {
      mounted.unmount()
    }
  })

  it('Space 键把焦点所在行写成当前行', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    hosts.push(mounted.host)

    try {
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 进入列表
      await userEvent.keyboard('{Enter}')
      let rows = mounted.rows()
      await waitFor(() => document.activeElement === rows[0], '焦点落到第 1 行')

      // 此时第 1 行是当前行（有焦点环和激活底色）
      expect(rows[0].getAttribute('tabindex')).toBe('0')
      expect(rows[1].getAttribute('tabindex')).toBe('-1')

      // 确保焦点在第 1 行
      expect(document.activeElement).toBe(rows[0])

      // 用真实按键按 Space：把焦点所在行写成当前行
      await userEvent.keyboard(' ')
      await waitFor(() => document.activeElement === rows[0], '焦点仍在第 1 行')

      // 断言：焦点仍在第 1 行，当前行仍是第 1 行
      rows = mounted.rows()
      expect(rows[0].getAttribute('tabindex'), '第 1 行仍是 roving tabindex 为 0 的行').toBe('0')
      expect(rows[1].getAttribute('tabindex'), '第 2 行仍是 -1').toBe('-1')
      expect(mounted.container!.dataset.activeIndex, 'activeIndex 仍是 0').toBe('0')
      expect(document.activeElement, '焦点仍在第 1 行').toBe(rows[0])

      // 第 1 行应有激活底色
      const activeBg = getComputedStyle(rows[0]).backgroundColor
      const normalBg = getComputedStyle(rows[1]).backgroundColor
      expect(activeBg, '第 1 行应有激活底色').not.toBe(normalBg)
    } finally {
      mounted.unmount()
    }
  })

  it('先用 ArrowDown 让焦点与当前行分离，再按 Space 让当前行跟上焦点', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
    const mounted = await mountList(resources)
    hosts.push(mounted.host)

    try {
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 进入列表
      await userEvent.keyboard('{Enter}')
      await waitFor(() => document.activeElement === mounted.rows()[0], '焦点落到第 1 行')

      // 先按 ArrowDown 让焦点与当前行都移到第 2 行（ArrowDown 会同时移动焦点和当前行）
      await userEvent.keyboard('{ArrowDown}')
      await waitFor(() => document.activeElement === mounted.rows()[1], '焦点移到第 2 行')

      // 此时焦点和当前行都在第 2 行（activeIndex 变为 1）
      let rows = mounted.rows()
      expect(mounted.container!.dataset.activeIndex).toBe('1')
      expect(document.activeElement).toBe(rows[1])
      expect(rows[0].getAttribute('tabindex')).toBe('-1')
      expect(rows[1].getAttribute('tabindex')).toBe('0')

      // 按 Space：当前行应保持在焦点所在的第 2 行
      await userEvent.keyboard(' ')
      await waitFor(() => mounted.container!.dataset.activeIndex === '1', 'activeIndex 仍为 1')

      // 断言：当前行保持在第 2 行，焦点仍在第 2 行
      rows = mounted.rows()
      expect(mounted.container!.dataset.activeIndex, 'activeIndex 仍为 1').toBe('1')
      expect(document.activeElement, '焦点仍在第 2 行').toBe(rows[1])
      expect(rows[1].getAttribute('tabindex')).toBe('0')
      expect(rows[0].getAttribute('tabindex')).toBe('-1')

      // 第 2 行应有激活底色
      const activeBg = getComputedStyle(rows[1]).backgroundColor
      const normalBg = getComputedStyle(rows[0]).backgroundColor
      expect(activeBg, '第 2 行应有激活底色').not.toBe(normalBg)
    } finally {
      mounted.unmount()
    }
  })
})
