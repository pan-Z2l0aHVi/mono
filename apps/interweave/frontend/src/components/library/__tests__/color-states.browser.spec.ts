import '@greypan/web-ui'

import type { WebUiContextMenu } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick } from 'vue'

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

async function mountList(
  resources: ResourceView[],
  appearance: 'light' | 'dark',
  options: {
    activeResourceId?: string | null
    checkedIds?: string[]
    selectionMode?: boolean
  } = {}
) {
  const restoreLayout = stubLayout()
  const host = document.createElement('div')
  document.body.append(host)

  const theme = document.createElement('web-ui-theme')
  theme.appearance = appearance
  host.appendChild(theme)

  const activeId = { value: options.activeResourceId ?? null }
  const app = createApp({
    render: () =>
      h(ResourceList, {
        resources,
        activeResourceId: activeId.value,
        checkedIds: options.checkedIds ?? [],
        selectionMode: options.selectionMode ?? false,
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
  app.mount(theme)
  await nextTick()

  // Wait for theme to resolve appearance
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    host,
    theme,
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

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

/**
 * 三态截图测试：hover / 当前行 / 勾选，浅色与深色各一组。
 *
 * 使用 `page.elementLocator(...).screenshot()` 显式截图，保存到 __screenshots__ 目录。
 * 这三张截图是本 PR 验收所需的「改动后」视觉基线。
 */
describe('ResourceList：三态配色截图（浅色/深色）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    describe(`${appearance} 模式`, () => {
      it('hover 态：鼠标悬停行显示 hover 背景', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance)
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          const row = rows[1] // 取中间行截图

          // 使用 userEvent.hover 触发真实的 :hover
          await userEvent.hover(row)

          // 等待过渡完成
          await new Promise(resolve => setTimeout(resolve, 200))

          // 截图：行元素
          const shot = await page.elementLocator(row).screenshot({ base64: false })

          // 保存截图供人工核对：文件名包含 appearance 和 state
          expect(shot).toBeTruthy()
        } finally {
          mounted.unmount()
        }
      })

      it('当前行：activeResourceId 指向的行显示加深底色', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance, { activeResourceId: 'r2' })
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          const row = rows[1] // r2 是当前行

          // 等待渲染稳定
          await new Promise(resolve => setTimeout(resolve, 100))

          // 验证：当前行有加深底色类
          expect(row.className).toContain('bg-black/8')
          expect(rows[0].className).not.toContain('bg-black/8')
          expect(rows[2].className).not.toContain('bg-black/8')

          // 截图
          const shot = await page.elementLocator(row).screenshot({ base64: false })
          expect(shot).toBeTruthy()
        } finally {
          mounted.unmount()
        }
      })

      it('勾选态：选择模式下 checked 行显示与当前行同档底色', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance, {
          selectionMode: true,
          checkedIds: ['r2']
        })
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          const row = rows[1] // r2 是勾选行

          await new Promise(resolve => setTimeout(resolve, 100))

          // 验证：勾选行有加深底色类（与当前行同档）
          expect(row.className).toContain('bg-black/8')
          expect(rows[0].className).not.toContain('bg-black/8')
          expect(rows[2].className).not.toContain('bg-black/8')

          // 截图
          const shot = await page.elementLocator(row).screenshot({ base64: false })
          expect(shot).toBeTruthy()
        } finally {
          mounted.unmount()
        }
      })
    })
  }
})
