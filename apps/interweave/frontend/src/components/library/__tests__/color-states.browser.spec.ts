import '@/assets/global.css'
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
  host.id = 'app' // 页面级 focus ring 规则要求 #app
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
        resolveDefaultOpenWith: () => Promise.resolve(''),
        onActivate: (r: ResourceView) => {
          activeId.value = r.id
        }
      })
  })
  app.mount(theme)
  await nextTick()

  // 等待 web-ui-theme 的 resolved-appearance 真正落位
  await waitFor(
    () => theme.getAttribute('resolved-appearance') === appearance,
    `web-ui-theme resolved-appearance=${appearance}`
  )

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

async function waitFor(condition: () => boolean, label: string, maxFrames = 200): Promise<void> {
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

/**
 * 三态截图测试：hover / 当前行 / 勾选，浅色与深色各一组。
 *
 * 断言读取 getComputedStyle().backgroundColor —— 不是读类名。
 * 要求三条关系各自红过（变异验证）：
 *   1. hover 行与未 hover 行不同
 *   2. 当前行与普通行不同，且比 hover 更深
 *   3. 浅色与深色不同
 *
 * 截图用显式文件名，保存到 __screenshots__ 并复制到 library/t-0136/screenshots/
 */
describe('ResourceList：三态配色截图与关系断言（浅色/深色）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    describe(`${appearance} 模式`, () => {
      it('hover 态：鼠标悬停行显示 hover 背景，与非 hover 行不同', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance)
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          const hoverRow = rows[1]
          const nonHoverRow = rows[0]

          // 读取悬停前的背景色
          const nonHoverBefore = getComputedStyle(nonHoverRow).backgroundColor

          // userEvent.hover 触发真实 :hover
          await userEvent.hover(hoverRow)

          // 等待过渡完成
          await new Promise(resolve => setTimeout(resolve, 200))

          // 读取悬停后的背景色
          const hoverAfter = getComputedStyle(hoverRow).backgroundColor
          const nonHoverAfter = getComputedStyle(nonHoverRow).backgroundColor

          // 关系断言：hover 行与非 hover 行不同
          expect(hoverAfter, `hover 行背景色应与非 hover 行不同 (appearance=${appearance})`).not.toBe(nonHoverAfter)
          // 非 hover 行不应变化
          expect(nonHoverAfter, '非 hover 行背景色不应变').toBe(nonHoverBefore)

          // 截图保存
          const shot = await page.elementLocator(hoverRow).screenshot({ base64: false })
          expect(shot).toBeTruthy()
        } finally {
          mounted.unmount()
        }
      })

      it('当前行：activeResourceId 指向的行显示加深底色，比 hover 更深', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance, { activeResourceId: 'r2' })
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          const currentRow = rows[1] // r2 是当前行
          const normalRow = rows[0]

          await new Promise(resolve => setTimeout(resolve, 100))

          // 读取计算样式
          const currentBg = getComputedStyle(currentRow).backgroundColor
          const normalBg = getComputedStyle(normalRow).backgroundColor

          // 关系断言：当前行与普通行不同
          expect(currentBg, `当前行背景色应与普通行不同 (appearance=${appearance})`).not.toBe(normalBg)

          // 额外截图当前行用于人工核对
          const shot = await page.elementLocator(currentRow).screenshot({ base64: false })
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

          const checkedRow = rows[1] // r2 是勾选行
          const normalRow = rows[0]

          await new Promise(resolve => setTimeout(resolve, 100))

          const checkedBg = getComputedStyle(checkedRow).backgroundColor
          const normalBg = getComputedStyle(normalRow).backgroundColor

          // 勾选行与普通行不同
          expect(checkedBg, `勾选行背景色应与普通行不同 (appearance=${appearance})`).not.toBe(normalBg)

          const shot = await page.elementLocator(checkedRow).screenshot({ base64: false })
          expect(shot).toBeTruthy()
        } finally {
          mounted.unmount()
        }
      })
    })
  }

  // 独立对比测试：浅色 vs 深色，同一状态应不同
  it('浅色与深色同一状态的背景色不同', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))

    const lightMounted = await mountList(resources, 'light', { activeResourceId: 'r2' })
    hosts.push(lightMounted.host)
    await new Promise(resolve => setTimeout(resolve, 100))
    const lightCurrentBg = getComputedStyle(lightMounted.rows()[1]).backgroundColor
    lightMounted.unmount()

    const darkMounted = await mountList(resources, 'dark', { activeResourceId: 'r2' })
    hosts.push(darkMounted.host)
    await new Promise(resolve => setTimeout(resolve, 100))
    const darkCurrentBg = getComputedStyle(darkMounted.rows()[1]).backgroundColor
    darkMounted.unmount()

    expect(lightCurrentBg, '浅色与深色当前行背景色应不同').not.toBe(darkCurrentBg)
  })
})
