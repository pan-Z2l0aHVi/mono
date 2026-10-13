// 行的定位依赖 Tailwind 的 absolute/top-0（定位包裹层）与行内边距（行高）。不引入全局
// 样式的话这些类都不生效，包裹层会退回文档流，行会被「自然堆叠 + transform」画成双倍间距，
// 断言量到的就不是被测的几何了。
import '@/assets/global.css'
import '@greypan/web-ui'

import type { WebUiEditableText } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick, ref, type ComponentPublicInstance } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { NameEditorRef } from '../rename'
import ResourceList from '../ResourceList.vue'

/*
 * 虚拟列表的行高：真实浏览器 + 真实组件（不是 jsdom 桩）。
 *
 * 这规格格不入 jsdom 是有原因的：出问题的前提是「Vue 的函数式 ref 在节点还没插进文档时
 * 就被调用」。节点的宿主是 web-ui-context-menu 的默认 slot，插槽内容先渲染进
 * DocumentFragment、再由 custom element 分发到 shadow root。jsdom 侧的 spec 把
 * web-ui-context-menu 桩成裸 HTMLElement，插槽内容直接挂在它身上、当场就连上文档，
 * 这条路径根本走不到。只有真实自定义元素（+ 真 shadow root）才复现得了。
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

/** 长标题：会把标题挤成两行，行高因此与单行行不同——被测的正是这个差值。 */
const LONG_TITLE =
  '屏幕截图 2025-08-20 183810123123123123123123213132323331231232132131231231231231231231sfasdfsafsdfdsafadsfafdsfas...'

/** 有界轮询：条件成立即刻通过，帧预算耗尽才失败（对齐 rename-focus.browser.spec.ts）。 */
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

function mountList(resources: ResourceView[], activeResourceId: string | null) {
  const host = document.createElement('div')
  // 列表滚动元素是 window，所以要给它一个足够高的视口与足够宽的容器：
  // 宽一点长标题才会真的换行，高一点虚拟窗口里才装得下多行。
  host.style.cssText = 'width:900px'
  document.body.append(host)
  hosts.push(host)

  // 与 pages/library/index.vue 的 setNameEditorRef 同构：按资源 id 记下编辑器实例。
  const editors = new Map<string, Element | ComponentPublicInstance | null>()
  const nameEditorRefCallbacks = new Map<string, NameEditorRef>()
  function editorRef(id: string): NameEditorRef {
    let callback = nameEditorRefCallbacks.get(id)
    if (!callback) {
      callback = element => editors.set(id, element)
      nameEditorRefCallbacks.set(id, callback)
    }
    return callback
  }
  const app = createApp({
    render: () =>
      h(ResourceList, {
        resources,
        activeResourceId,
        checkedIds: [],
        selectionMode: false,
        editingNameKey: null,
        editorRef,
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '',
        mediaUrlFor: () => null
      })
  })
  apps.push(app)
  app.mount(host)
  return host
}

/** 连续若干帧行几何完全一致，才算测量收敛。RO 的回调落在布局之后、下一帧之前。 */
async function waitForGeometriesSettled(host: HTMLElement, stableFrames = 4) {
  let previous = ''
  let stable = 0
  for (let i = 0; i < 240; i++) {
    const rows = rowGeometries(host)
    const signature = rows.map(row => `${row.index}:${row.top.toFixed(1)}:${row.height.toFixed(1)}`).join('|')
    if (signature && signature === previous) stable += 1
    else stable = 0
    previous = signature
    if (stable >= stableFrames) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error('行几何在 240 帧内未收敛')
}

interface RowGeometry {
  index: number
  top: number
  bottom: number
  height: number
  wrapperHeight: number
  titleTop: number
}

function rowGeometries(host: HTMLElement): RowGeometry[] {
  return [...host.querySelectorAll<HTMLElement>('[data-index]')].map(node => {
    const start = Number((node.style.transform ?? '').replace('translateY(', '').replace('px)', '') || 'NaN')
    const wrapper = node.getBoundingClientRect()
    const row = node.querySelector<HTMLElement>('[data-resource-row]')!
    const rect = row.getBoundingClientRect()
    const title = row.querySelector('span')
    const titleRect = title?.getBoundingClientRect()
    return {
      index: Number(node.getAttribute('data-index')),
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      wrapperHeight: wrapper.height,
      titleTop: titleRect ? titleRect.top : rect.top
    }
  })
}

describe('ResourceList：行高测量（真实浏览器）', () => {
  it('每一行的定位都按自己的真实高度累计，行与行不错位、不重叠', async () => {
    const resources = Array.from({ length: 40 }, (_, index) =>
      resource({ id: `r${index}`, title: `资源 ${index}`, updatedAt: 1_700_000_000_000 + index })
    )
    // 把长标题放在列表前部：它换行后的额外高度必须被后面的行认出来。
    resources[1] = resource({ id: 'r1', title: LONG_TITLE, updatedAt: 1_700_000_001_000 })

    const host = mountList(resources, 'r3')
    await nextTick()

    // 等行高测量收敛：ResizeObserver 的回调会把真实高度写回 virtualizer，随后才可能出现
    // 第二套 transform。判据取「连续若干帧几何完全不变」——而不是只看 DOM 高度，行高是
    // 内容决定的、与定位无关键前就已经稳定，那样会在 RO 回调之前就放行。
    await waitForGeometriesSettled(host)

    const rows = rowGeometries(host)
    expect(rows.length, '虚拟窗口里渲染出了多行').toBeGreaterThan(1)

    /*
     * 窗口停在列表顶部（scrollY 为 0），所以渲染出来的第一行必须是第 0 行，
     * 且它要贴着撑高层的顶。行被量成 0 时，该行及其后所有行的 start 都按 0 累计，
     * 窗口会整体跑向列表尾部：第一行变成 20 几，且被画到视口之外。
     */
    const sorted = [...rows].sort((a, b) => a.index - b.index)
    const sizer = host.querySelector<HTMLElement>('[style*="height"]')!
    const sizerTop = sizer.getBoundingClientRect().top
    expect(sorted[0]!.index, '列表顶部的第一行必须是第 0 行').toBe(0)
    expect(Math.abs(sorted[0]!.top - sizerTop), '第 0 行要贴着列表顶').toBeLessThan(1)

    for (const row of rows) {
      // 定位包裹层与行根元素盒高一致（模板里 transform 用的是 row.start）。
      // 若某一行被测成 0，这一条立刻红——那正是「后面所有行都挤在一起」的起点。
      expect(row.wrapperHeight, `第 ${row.index} 行的定位包裹层高度`).toBeGreaterThan(0)
      expect(Math.abs(row.wrapperHeight - row.height), `第 ${row.index} 行：包裹层高度与行真实高度不符`).toBeLessThan(1)
    }

    // 相邻行必须首尾相接：上一行的底就是下一行的顶。被量成 0 或量成估值的行会在这里
    // 表现为重叠或留缝。
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1]!
      const current = sorted[i]!
      if (current.index !== previous.index + 1) continue
      expect(
        Math.abs(current.top - previous.bottom),
        `第 ${previous.index} 与 ${current.index} 行之间的接缝`
      ).toBeLessThan(1)
    }

    // 激活底色画在 ResourceRow 根元素上，它的盒子必须装着自己那一行的文字。
    const active = rows.find(row => row.index === 3)
    expect(active).toBeDefined()
    expect(active!.titleTop, '激活行的标题不该落在自己的盒子之上').toBeGreaterThanOrEqual(active!.top - 1)
    expect(active!.titleTop).toBeLessThan(active!.bottom)
  })
})
