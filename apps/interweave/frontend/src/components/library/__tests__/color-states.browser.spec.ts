import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import ResourceList from '../ResourceList.vue'

import { stubLayout } from './virtualLayout'

/**
 * 资源行的三态底色：hover、当前行、勾选行。
 *
 * 断言的是关系不是色值——hover 行与普通行不同、当前行与普通行不同、勾选行与普通行不同、
 * 浅色与深色不同。色值本身是设计决策，改版时该跟着变的是它们；「这几态必须彼此可分辨」
 * 才是用户依赖的契约（分不清当前行就不知道自己看的是哪一条）。
 *
 * 等的是可观察信号：hover 底色有过渡，等它落定后再比，不赌一段固定时长。
 */
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
  options: { activeResourceId?: string | null; checkedIds?: string[] } = {}
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
        selectionMode: (options.checkedIds ?? []).length > 0,
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

  // 等 web-ui-theme 的 resolved-appearance 真正落位：dark 变体挂在它上面，早一步读到的是旧档。
  await waitForCondition(
    () => theme.getAttribute('resolved-appearance') === appearance,
    `web-ui-theme resolved-appearance=${appearance}`
  )

  return {
    host,
    theme,
    rows: () => [...host.querySelectorAll<HTMLElement>('[data-resource-row]')],
    unmount: () => {
      app.unmount()
      host.remove()
      restoreLayout()
    }
  }
}

/** 按帧等一个可观察条件：不用任意超时，条件不成立就一直等不到。 */
async function waitForCondition(condition: () => boolean, label: string, maxFrames = 200): Promise<void> {
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

const backgroundOf = (el: Element): string => getComputedStyle(el).backgroundColor

/**
 * 等底色过渡落定。过渡是 `transition-[background-color]`，落定值才是稳定判据；
 * 中间值虽然也已经和起点不同，但拿它比对等于在读一个还在动的数字。
 */
async function settleBackground(el: Element): Promise<void> {
  await waitForCondition(
    () => el.getAnimations().every(animation => animation.playState !== 'running'),
    '底色过渡没有落定'
  )
}

describe('ResourceList：三态底色的可分辨性（浅色/深色）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    describe(`${appearance} 模式`, () => {
      it('hover 行显示 hover 底色，与普通行不同；普通行不因别人被悬停而变', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance)
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          const hoverRow = rows[1]!
          const plainRow = rows[0]!
          const plainBefore = backgroundOf(plainRow)

          await userEvent.hover(hoverRow)
          // 过渡的中间值已经与起点不同，先等它真的变了，再等它落定。
          await waitForCondition(
            () => backgroundOf(hoverRow) !== backgroundOf(plainRow),
            'hover 行底色没有与普通行拉开'
          )
          await settleBackground(hoverRow)

          expect(backgroundOf(hoverRow), `hover 行底色应与普通行不同（appearance=${appearance}）`).not.toBe(
            backgroundOf(plainRow)
          )
          expect(backgroundOf(plainRow), '普通行底色不应因别的行被悬停而变').toBe(plainBefore)
        } finally {
          mounted.unmount()
        }
      })

      it('当前行有独立的底色，与普通行不同', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance, { activeResourceId: 'r2' })
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          expect(backgroundOf(rows[1]!), `当前行底色应与普通行不同（appearance=${appearance}）`).not.toBe(
            backgroundOf(rows[0]!)
          )
        } finally {
          mounted.unmount()
        }
      })

      it('勾选行有独立的底色，与普通行不同', async () => {
        const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))
        const mounted = await mountList(resources, appearance, { checkedIds: ['r2'] })
        hosts.push(mounted.host)

        try {
          const rows = mounted.rows()
          expect(rows.length).toBe(3)

          expect(backgroundOf(rows[1]!), `勾选行底色应与普通行不同（appearance=${appearance}）`).not.toBe(
            backgroundOf(rows[0]!)
          )
        } finally {
          mounted.unmount()
        }
      })
    })
  }

  it('浅色与深色下同一状态的底色不同', async () => {
    const resources = ['r1', 'r2', 'r3'].map(id => resource({ id }))

    const lightMounted = await mountList(resources, 'light', { activeResourceId: 'r2' })
    hosts.push(lightMounted.host)
    const lightCurrent = backgroundOf(lightMounted.rows()[1]!)
    lightMounted.unmount()

    const darkMounted = await mountList(resources, 'dark', { activeResourceId: 'r2' })
    hosts.push(darkMounted.host)
    const darkCurrent = backgroundOf(darkMounted.rows()[1]!)
    darkMounted.unmount()

    expect(lightCurrent, '浅色与深色下当前行底色应不同').not.toBe(darkCurrent)
  })
})
