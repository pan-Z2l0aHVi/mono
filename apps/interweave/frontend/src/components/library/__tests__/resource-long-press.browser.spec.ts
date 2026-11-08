// 触屏长按行 → menu 开出「那一行」的项集；抬手后浏览器补发的 click 不再顺手掀开预览
// drawer（重构前的老毛病：menu 与 drawer 一起弹）。吸收机制已内建进 web-ui-context-menu
// （手势结束时武装、下一次 pointerdown 作废），宿主不再自己吞 click——这里钉的是宿主接线
// 之后的**用户可见结果**，机制细节归 web-ui 的 long-press.browser.spec。
//
// 只能真实触控管线测：补发 click 由浏览器输入管线在 touchend 之后生成，合成 PointerEvent
// 根本没有「补发」这一步，合成事件下负向断言恒绿（论证见
// packages/web-ui/src/components/context-menu/__tests__/long-press.browser.spec.ts）。
import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser-playwright/context'
import { createApp, h, nextTick, ref, type App, type Ref } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import PreviewDrawer from '../PreviewDrawer.vue'
import type { NameEditorRef } from '../rename'
import ResourceList from '../ResourceList.vue'

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

/** 失效文件来源：menu 里会多出「找回资源」、少掉「标签」——长按那一行的身份指纹。 */
function missingSource(): ResourceView['sources'][number] {
  return {
    id: 's1',
    type: 'file',
    location: '/tmp/gone.png',
    available: false,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: null,
    thumbnailUrl: null,
    metadata: null
  }
}

/*
 * 挂载 ResourceList + PreviewDrawer，接线与 pages/library 的非选择模式同构：
 * 行 select → 打开「资源预览」drawer（左键进预览不进详情）。长按补发 click 若穿透到行，
 * 走的正是这条 select 路径——drawer 开没开就是穿透与否的可观测出口。
 */
interface Mounted {
  host: HTMLElement
  app: App
  previewOpen: Ref<boolean>
  selected: string[]
  detailed: string[]
}

function mountList(resources: ResourceView[]): Mounted {
  const host = document.createElement('div')
  host.style.cssText = 'width:900px'
  document.body.append(host)

  const previewOpen = ref(false)
  const previewResource = ref<ResourceView | null>(null)
  const selected: string[] = []
  const detailed: string[] = []
  // 与 pages/library 的 setNameEditorRef 同构：行内 prop 要求是一个函数，回 null 会让
  // ResourceRow 拿到非法 prop。本 spec 不消费编辑器实例，按 id 登记合法回调即可。
  const editors = new Map<string, NameEditorRef>()
  const editorRef = (id: string): NameEditorRef => {
    let callback = editors.get(id)
    if (!callback) {
      callback = () => {}
      editors.set(id, callback)
    }
    return callback
  }

  const app = createApp({
    render: () =>
      h('div', [
        h(ResourceList, {
          resources,
          activeResourceId: null,
          checkedIds: [],
          selectionMode: false,
          editingNameKey: null,
          editorRef,
          loading: false,
          runtimeAvailable: true,
          emptyDescription: '',
          resolveDefaultOpenWith: () => Promise.resolve(''),
          onSelect: (resource: ResourceView) => {
            selected.push(resource.id)
            previewResource.value = resource
            previewOpen.value = true
          },
          onDetail: (resource: ResourceView) => {
            detailed.push(resource.id)
          }
        }),
        h(PreviewDrawer, {
          open: previewOpen.value,
          resource: previewResource.value,
          mobile: false,
          'onUpdate:open': (value: boolean) => {
            previewOpen.value = value
          }
        })
      ])
  })
  app.mount(host)
  return { host, app, previewOpen, selected, detailed }
}

async function waitForRows(host: HTMLElement): Promise<void> {
  await vi.waitFor(
    () => {
      const rows = [...host.querySelectorAll<HTMLElement>('[data-resource-row]')]
      expect(rows.length, '虚拟列表渲染出了行').toBeGreaterThan(0)
      // 行要有非空布局盒，rect 中心才是有效触点。
      for (const row of rows) expect(row.getBoundingClientRect().height).toBeGreaterThan(10)
    },
    { timeout: 10_000, interval: 100 }
  )
}

function rowById(host: HTMLElement, id: string): HTMLElement {
  const row = host.querySelector<HTMLElement>(`[data-resource-id="${id}"]`)
  if (!row) throw new Error(`没有找到资源行 ${id}`)
  return row
}

/** 与 LibraryPage.spec 的 drawerOpen 同构：open 是 reflect 属性，真实浏览器里按属性读。 */
function drawerOpen(host: HTMLElement, label: string): boolean {
  const drawer = host.querySelector(`web-ui-drawer[aria-dialog-label="${label}"]`) as
    | (HTMLElement & { open?: boolean })
    | null
  if (!drawer) throw new Error(`没有找到「${label}」drawer`)
  return drawer.open ?? drawer.hasAttribute('open')
}

/*
 * overlay 容器有两处挂点（light DOM 的 fallback root 与 web-ui-theme 的 shadow root），
 * 与 web-ui test-utils 的 getOverlayContainers 同构地两处都收。scrim 是模态 context-menu
 * 的 `<dialog data-wui-menu-scrim>`，menu panel 带 role="menu"。
 */
function menuScrims(): HTMLElement[] {
  return [
    ...Array.from(document.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]')),
    ...Array.from(document.querySelectorAll<HTMLElement>('web-ui-theme')).flatMap(theme =>
      Array.from(theme.shadowRoot?.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]') ?? [])
    )
  ]
}

/** 打开中的 context menu panel（模态时挂在 scrim 里；不带 aria-label 会混进 submenu）。 */
function menuPanels(): HTMLElement[] {
  return [...menuScrims(), ...Array.from(document.querySelectorAll<HTMLElement>('[data-wui-overlay-root]'))].flatMap(
    container => Array.from(container.querySelectorAll<HTMLElement>('[role="menu"]'))
  )
}

/** menu item 的自有文案（只取直接文本节点，嵌套 submenu 项的文案不算到父项头上）。 */
function openMenuLabels(): string[] {
  return menuPanels()
    .flatMap(panel => Array.from(panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')))
    .map(item =>
      [...item.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join('')
        .trim()
    )
    .filter(Boolean)
}

/*
 * 真实触屏按压（CDP Input.dispatchTouchEvent），技术镜像自
 * packages/web-ui/src/shared/test-utils/real-gesture.ts 的 realTouchPress——不跨包深引
 * web-ui 的 src，这里只保留本规格用到的最小面（按时长按住 + touchend；合成事件没有
 * 「浏览器手势识别」这一层，touchend 后的补发 click 也只有真实管线会给）。
 */
interface CdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>
}

/** browser runner 把测试 iframe 的父节点套了一层 scale，CDP 坐标要换算回主 frame 视口。 */
function toViewportPoint(x: number, y: number): { x: number; y: number } {
  const frame = window.frameElement as HTMLElement | null
  const rect = frame?.getBoundingClientRect()
  if (!rect || !rect.width || !rect.height) return { x, y }
  const scaleX = rect.width / window.innerWidth
  const scaleY = rect.height / window.innerHeight
  return { x: rect.left + x * scaleX, y: rect.top + y * scaleY }
}

async function realTouchPress(target: Element, holdMs: number): Promise<{ x: number; y: number }> {
  const client = cdp() as unknown as CdpSession
  const rect = target.getBoundingClientRect()
  // 触点取行中心，但宿主比测试视口宽时中心可能落在视口外（CDP 对视口外的触点命中不到
  // 任何东西，事件整批蒸发），钳回视口内仍在这一行上。
  const pressX = Math.min(rect.left + rect.width / 2, window.innerWidth - 24)
  const pressY = Math.min(rect.top + rect.height / 2, window.innerHeight - 24)
  const origin = toViewportPoint(pressX, pressY)
  const touchPoint = { x: origin.x, y: origin.y, id: 1, radiusX: 12, radiusY: 12, force: 1 }

  // browser project 默认上下文是 mouse-only，不开触控仿真事件到不了页面；收不到 touchstart
  // 直接抛错，不让 mouse-only 环境下的「没反应」伪装成产品结论。
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  let sawTouchStart = false
  const record = () => {
    sawTouchStart = true
  }
  window.addEventListener('touchstart', record, { capture: true, passive: true })
  try {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] })
    if (!sawTouchStart) throw new Error('realTouchPress 没收到 touchstart：mouse-only 输入环境，结论无效')
    await new Promise(resolve => setTimeout(resolve, holdMs))
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    window.removeEventListener('touchstart', record, { capture: true })
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
  return { x: pressX, y: pressY }
}

const apps: Mounted[] = []

afterEach(() => {
  for (const mounted of apps.splice(0)) mounted.app.unmount()
  document.body.replaceChildren()
})

describe('ResourceList：触屏长按 menu 与补发 click 吸收（真实浏览器冒烟）', () => {
  /*
   * 完整时序一次走通：长按失效资源行 → menu 锚着按点开出该行的项集（「找回资源」在、
   * 「标签」不在，与 jsdom 侧 ResourceList.spec 的身份断言同一指纹）→ 抬手等浏览器补发
   * click 真的到达（window capture 观测，不是睡固定时长后断言「没发生」）→ 越过吸收窗口
   * 再收一次口。预览 drawer 全程不开、select 不发，menu 是唯一开着的表面。
   */
  it('长按行出该行的 menu；抬手补发的 click 被吸收，预览 drawer 不开', async () => {
    const mounted = mountList([
      resource({ id: 'r1' }),
      resource({ id: 'r2', available: false, sources: [missingSource()] })
    ])
    apps.push(mounted)
    await nextTick()
    await waitForRows(mounted.host)

    // 观测点先于手势装上：补发 click 的到达时刻由浏览器任务队列决定（负载下可能晚到 1s+），
    // 用「真的收到了一次 click」作观测点，而不是睡够再断言「没发生」。
    let windowClicks = 0
    const recordClick = () => windowClicks++
    window.addEventListener('click', recordClick, { capture: true })
    try {
      // 长按 700ms > 组件的 500ms 阈值：menu 在按住期间就开出，随后才是 touchend 与补发 click。
      const press = await realTouchPress(rowById(mounted.host, 'r2'), 700)

      await vi.waitFor(
        () => {
          expect(menuScrims().length, '长按开出模态 menu').toBeGreaterThan(0)
          expect(menuPanels().length).toBeGreaterThan(0)
        },
        { timeout: 5000, interval: 100 }
      )

      // 锚在按点上：panel 上缘对齐按点 y、向下展开（组件契约 R9；transform-origin 取 top
      // 一侧，进场 scale 不动上缘，rect.top 可直接比）。
      await vi.waitFor(() => expect(menuPanels().length).toBeGreaterThan(0), { timeout: 5000, interval: 100 })
      const panel = menuPanels()[0]!
      const panelRect = panel.getBoundingClientRect()
      expect(Math.abs(panelRect.top - press.y), 'panel 上缘锚着长按的按点').toBeLessThanOrEqual(2)
      expect(panelRect.bottom, 'panel 向下展开盖过按点').toBeGreaterThan(press.y)

      // menu 讲的是长按那一行：contextResource 在 pointerdown 落定，失效资源才有「找回资源」。
      await vi.waitFor(() => expect(openMenuLabels()).toContain('找回资源'), { timeout: 5000, interval: 100 })
      expect(openMenuLabels()).toEqual(expect.arrayContaining(['详情', '重命名', '删除']))
      expect(openMenuLabels()).not.toContain('标签')

      await vi.waitFor(() => expect(windowClicks, 'touchend 后浏览器补发了 compat click').toBeGreaterThan(0), {
        timeout: 8000,
        interval: 100
      })
      // 越过吸收窗口（1000ms）再观察一段：负向断言「drawer 不开」要熬过整个窗口才站得住。
      await new Promise(resolve => setTimeout(resolve, 1400))

      expect(drawerOpen(mounted.host, '资源预览'), '补发 click 不得掀开预览 drawer').toBe(false)
      expect(mounted.selected, '补发 click 不得触发行激活').toEqual([])
      expect(mounted.detailed).toEqual([])
      expect(menuScrims().length, 'menu 是唯一开着的表面，也没被补发 click 关掉').toBeGreaterThan(0)
      expect(menuPanels().length).toBeGreaterThan(0)
    } finally {
      window.removeEventListener('click', recordClick, { capture: true })
    }
  }, 30_000)

  /*
   * 吸收器的另一面：普通轻点不被误伤。menu 没开过就没有武装，同一条真实触控管线下的
   * 短按 → 补发 click → 行 select → 预览 drawer，这条主路径必须原样活着。
   */
  it('普通轻点仍选中行并打开预览 drawer，且不弹长按 menu', async () => {
    const mounted = mountList([resource({ id: 'r1' })])
    apps.push(mounted)
    await nextTick()
    await waitForRows(mounted.host)

    await realTouchPress(rowById(mounted.host, 'r1'), 80)

    await vi.waitFor(() => expect(drawerOpen(mounted.host, '资源预览'), '轻点行打开预览 drawer').toBe(true), {
      timeout: 5000,
      interval: 100
    })
    expect(mounted.selected).toEqual(['r1'])
    expect(menuScrims(), '短按够不着长按阈值，menu 不出现').toHaveLength(0)
  }, 15_000)
})
