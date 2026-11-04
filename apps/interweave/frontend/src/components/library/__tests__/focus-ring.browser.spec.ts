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
        mediaUrl: null,
        thumbnailUrl: null,
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

async function mountList(
  resources: ResourceView[],
  activeResourceId: string | null = null,
  selectionMode = false,
  checkedIds: string[] = []
) {
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
        checkedIds,
        selectionMode,
        editingNameKey: null,
        editorRef: () => () => {},
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '没有符合条件的资源',
        resolveDefaultOpenWith: () => Promise.resolve(''),
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

describe('ResourceList：行不画 focus ring（真实读数，浏览器）', () => {
  /*
   * 用户裁决：列表行的选中态只保留暗底，不画浅蓝 ring（global.css 的行豁免规则）。
   * 键盘焦点指示由活动行的暗底承担，这里的断言钉住「行永不出现 outline」；
   * 页面级 ring 规则本身没有被废掉，用列表容器（tabindex=0 的 tab stop）验证它仍然生效。
   */
  it('方向键移动焦点，行始终无 outline，容器获焦时页面级 ring 仍在', async () => {
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

      // 容器是普通 tab stop，获焦时页面级 focus ring 照常画在它身上
      expect(getComputedStyle(container).outlineStyle, '容器应有页面级 focus ring').not.toBe('none')

      // 用真实输入模拟 Enter 键：enterList 会把焦点交给当前活动行（r1）
      await userEvent.keyboard('{Enter}')
      await waitFor(() => document.activeElement === rows[0], '焦点落到第 1 行')

      // 裁决：行不画 focus ring，选中指示是活动行的暗底
      expect(getComputedStyle(rows[0]).outlineStyle, '第 1 行不应有 focus ring').toBe('none')

      // 用真实输入按 ArrowDown 移到第 2 行
      await userEvent.keyboard('{ArrowDown}')
      await waitFor(() => document.activeElement === rows[1], '焦点移到第 2 行')
      expect(getComputedStyle(rows[1]).outlineStyle, '第 2 行不应有 focus ring').toBe('none')
      expect(getComputedStyle(rows[0]).outlineStyle, '第 1 行不应有 focus ring').toBe('none')

      // 再按 ArrowDown 移到第 3 行
      await userEvent.keyboard('{ArrowDown}')
      await waitFor(() => document.activeElement === rows[2], '焦点移到第 3 行')
      expect(getComputedStyle(rows[2]).outlineStyle, '第 3 行不应有 focus ring').toBe('none')
      expect(getComputedStyle(rows[1]).outlineStyle, '第 2 行不应有 focus ring').toBe('none')
    } finally {
      mounted.unmount()
    }
  })

  it('选择模式下保留 focus ring，键盘焦点仍有可见指示', async () => {
    const resources = ['r1', 'r2'].map(id => resource({ id }))
    const mounted = await mountList(resources, null, true, ['r1'])
    hosts.push(mounted.host)

    try {
      const container = mounted.container!
      container.focus()
      await nextTick()

      await userEvent.keyboard('{Enter}')
      await waitFor(() => document.activeElement === mounted.rows()[0], '焦点落到第 1 行')

      const row = mounted.rows()[0]
      expect(row.hasAttribute('data-selection-mode'), '选择模式标记应落在行上').toBe(true)
      expect(getComputedStyle(row).outlineStyle, '选择模式下应有 focus ring').not.toBe('none')
    } finally {
      mounted.unmount()
    }
  })

  it('End 键跳到最后一行，焦点行同样无 outline', async () => {
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
      expect(getComputedStyle(rows[4]).outlineStyle, '第 5 行不应有 focus ring').toBe('none')
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
      expect(mounted.activeId(), '当前行仍是 r1').toBe('r1')
      expect(document.activeElement, '焦点仍在第 1 行').toBe(rows[0])
    } finally {
      mounted.unmount()
    }
  })

  it('先用右键让焦点与当前行分离，再按 Space 让当前行跟上焦点', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
    // 挂载时把当前行设为 r3（index 2），焦点默认也在 r3
    const mounted = await mountList(resources, 'r3')
    hosts.push(mounted.host)

    try {
      const container = mounted.container!
      container.focus()
      await nextTick()

      // 进入列表：当前行 r3（activeIndex=2），焦点也在 r3
      await userEvent.keyboard('{Enter}')
      await waitFor(() => document.activeElement === mounted.rows()[2], '焦点落到第 3 行')

      let rows = mounted.rows()
      // 此时当前行是 r3，焦点在 rows[2]
      expect(mounted.activeId()).toBe('r3')
      expect(document.activeElement).toBe(rows[2])

      // 用 JS 直接把焦点移到第 1 行（r1），而不 emit activate
      // 这样 current row 仍是 r3（activeIndex 仍是 2），焦点与 current row 已分离
      const targetRow = rows[0] // r1 在 index 0
      targetRow.focus()
      await waitFor(() => document.activeElement === targetRow, '焦点应落到第 1 行')

      // 现在：焦点在 r1 (rows[0])，当前行仍是 r3
      rows = mounted.rows()
      const focusIdx = rows.findIndex(r => r === document.activeElement)
      // focus 在 r1 (index 0)，当前行是 r3——它们确实不同
      expect(focusIdx).toBe(0)
      expect(mounted.activeId()).toBe('r3')

      // 按 Space：当前行应切到焦点所在的第 1 行 (r1)
      await userEvent.keyboard(' ')
      await waitFor(() => mounted.activeId() === 'r1', 'Space 后当前行跟上焦点，变为 r1')

      // 断言：当前行切回了第 1 行，焦点仍在第 1 行
      rows = mounted.rows()
      expect(mounted.activeId()).toBe('r1')
      expect(document.activeElement).toBe(rows[0])
      expect(rows[0].getAttribute('tabindex')).toBe('0')
      expect(rows[2].getAttribute('tabindex')).toBe('-1')
    } finally {
      mounted.unmount()
    }
  })
})
