// 行的几何一靠行内边距（决定行高），二靠 virtua 自建的定位包裹层——它用行内
// absolute / top 摆放每一行，不依赖任何外部样式。不引入全局样式的话行高会塌成无内边距的
// 一行，断言量到的就不是被测的几何了。
import '@/assets/global.css'
import '@greypan/web-ui'

import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick, ref, type ComponentPublicInstance, type Ref } from 'vue'

import type { ResourceView } from '@/stores/library'

import {
  ResourceKind,
  TagColor
} from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
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

/** 改名后的长标题仍应按单行中间省略。 */
const LONG_TITLE =
  '屏幕截图 2025-08-20 183810123123123123123123213132323331231232132131231231231231231231更多更多更多更多更多更多更多更多...'

/** 多行标签提供不同的真实行高，以验证虚拟列表重排时的高度归属。 */
const WRAPPED_TAGS = Array.from({ length: 8 }, (_, index) => ({
  id: `tag-${index}`,
  name: `较长标签${index}`,
  color: TagColor.TagColorBlue
}))

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

beforeEach(async () => {
  // 行高由文本换行决定：字体没就位时量到的几何会在加载完成后整体跳一次。
  await document.fonts.ready
})

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
        resolveDefaultOpenWith: () => Promise.resolve('')
      })
  })
  apps.push(app)
  app.mount(host)
  return host
}

/** 与 pages/library 同构的可变宿主：resources 与 editingNameKey 都是 ref，可驱动改名的两步。 */
function mountReactiveList(
  resources: Ref<ResourceView[]>,
  editingNameKey: Ref<string | null>,
  onRenameChange?: (resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) => void
) {
  const host = document.createElement('div')
  host.style.cssText = 'width:900px'
  document.body.append(host)
  hosts.push(host)

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
        resources: resources.value,
        activeResourceId: null,
        checkedIds: [],
        selectionMode: false,
        editingNameKey: editingNameKey.value,
        editorRef,
        loading: false,
        runtimeAvailable: true,
        emptyDescription: '',
        resolveDefaultOpenWith: () => Promise.resolve(''),
        onRenameChange
      })
  })
  apps.push(app)
  app.mount(host)
  return host
}

/** 连续若干帧行几何完全一致，才算测量收敛。RO 的回调落在布局之后、下一帧之前。 */
async function waitForGeometriesSettled(host: HTMLElement, ready: () => boolean = () => true, stableFrames = 4) {
  let previous = ''
  let stable = 0
  for (let i = 0; i < 240; i++) {
    const rows = rowGeometries(host)
    const signature = JSON.stringify(rows)
    if (ready() && rows.length > 0 && signature === previous) stable += 1
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

/*
 * 行下标读 data-resource-index（ResourceRow 的生产属性，roving tabindex 与 a11y 都在用它），
 * 枚举因此走 [data-resource-row] 而不是虚拟列表内部的包裹层——那是 virtua 的实现细节，
 * 不在契约里。定位包裹层取行的 parentElement（虚拟器自己建的那一层），用来核对它与行等高。
 */
function rowGeometries(host: HTMLElement): RowGeometry[] {
  return [...host.querySelectorAll<HTMLElement>('[data-resource-row]')].map(row => {
    const wrapper = row.parentElement!.getBoundingClientRect()
    const rect = row.getBoundingClientRect()
    const title = row.querySelector('web-ui-middle-ellipsis')
    const titleRect = title?.getBoundingClientRect()
    return {
      index: Number(row.getAttribute('data-resource-index')),
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
    // 多行标签撑高一行，后面的行必须按真实高度定位。
    resources[1] = resource({ id: 'r1', title: LONG_TITLE, tags: WRAPPED_TAGS, updatedAt: 1_700_000_001_000 })

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
      // 定位包裹层与行根元素盒高一致（virtua 只把这一层放到累计偏移上，高度由行内容撑）。
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

  /*
   * 改名并重排后，不同行高必须继续跟随各自的资源。
   *
   * 这条路径的难点全在「改名是一次 props 的连续变动」，不是一次静态布局：
   *   1. 进编辑态（editingNameKey 置上，行内换成 editable-text）；
   *   2. 提交（editingNameKey 同步置空，随后 store 落库——标题变长，且 updatedAt 被顶到
   *      最新，按 stores/library 的 'latest' 排序 r2 会排到第一位）。
   *
   * 第 2 步同时改了「行高」与「行的下标」，若测量与下标对不齐，写进 virtua 尺寸表的高度
   * 就会挂到别的资源上：被改名的行停在旧的一行高度上，它之后的每一行按旧累计值定位，
   * 于是那一行叠到下一行身上——用户看到的重叠。
   */
  it('改名重排时，不同行高的资源不错位、不重叠', async () => {
    // updatedAt 递减，r0 最新排在最前——与 stores/library 的 'latest' 排序一致。
    const base = Array.from({ length: 40 }, (_, index) =>
      resource({ id: `r${index}`, title: `资源 ${index}`, updatedAt: 1_700_000_000_000 - index })
    )
    // r1 和待改名的 r2 通过多行标签变高，r0 保持普通高度，以便检测重排时尺寸串号。
    base[1] = resource({ id: 'r1', title: LONG_TITLE, tags: WRAPPED_TAGS, updatedAt: 1_700_000_000_000 - 1 })
    base[2] = resource({ id: 'r2', tags: WRAPPED_TAGS, updatedAt: 1_700_000_000_000 - 2 })
    const resources = ref(base)
    const editingNameKey = ref<string | null>(null)
    // 与 pages/library 的 handleResourceNameChange 同序：先同步退出编辑态（stopResourceRename），
    // 再由 store 落库（异步）——标题变长，updatedAt 顶到最新，r2 排到列表第一位。
    const host = mountReactiveList(resources, editingNameKey, (target, event) => {
      const title = event.currentTarget.value.trim()
      editingNameKey.value = null
      void Promise.resolve().then(() => {
        resources.value = [
          { ...target, title, updatedAt: base[0]!.updatedAt + 1000 },
          ...base.filter(item => item.id !== 'r2')
        ]
      })
    })
    await nextTick()
    await waitForGeometriesSettled(host)

    // 1. 进入编辑态并输入长标题；多行标签使该行保持较高的尺寸。
    editingNameKey.value = 'r2'
    await nextTick()
    const editor = host.querySelector<WebUiEditableText>('web-ui-editable-text')
    expect(editor, 'r2 那一行换成了名称编辑器').not.toBeNull()
    editor!.select()
    await nextTick()
    const textarea = editor!.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = LONG_TITLE
    textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await waitForGeometriesSettled(host)

    // 2. Enter 提交：组件派发 change，宿主落库。两次 props 变动（退出编辑态、store 落库）
    //    之间隔着一次微任务，与生产里 await 后端的那一步同形。
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    await waitForGeometriesSettled(host, () => {
      const first = host.querySelector('[data-resource-index="0"]')
      return (
        editingNameKey.value === null &&
        first?.getAttribute('data-resource-id') === 'r2' &&
        first.querySelector('web-ui-middle-ellipsis')?.getAttribute('aria-label') === LONG_TITLE
      )
    })

    const rows = rowGeometries(host)
    const sorted = [...rows].sort((a, b) => a.index - b.index)
    expect(sorted.length, '虚拟窗口里渲染出了多行').toBeGreaterThan(1)
    expect(sorted[0]!.index, '列表顶部的第一行必须是第 0 行').toBe(0)

    // 被改名的行现在排在第 0 位，多行标签使其高度不同于普通行。
    const renamed = sorted[0]!
    const neighbor = sorted.find(row => row.index === 1)
    expect(neighbor, '第 1 行在窗口里').toBeDefined()
    expect(renamed.height, '多行标签把被改名的行撑高').toBeGreaterThan(neighbor!.height + 8)

    // 相邻行必须首尾相接：上一行的底就是下一行的顶。行高没被重算时，这里量到的是
    // 重叠（current.top < previous.bottom），即用户看到的现象。
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1]!
      const current = sorted[i]!
      if (current.index !== previous.index + 1) continue
      expect(
        Math.abs(current.top - previous.bottom),
        `第 ${previous.index} 与 ${current.index} 行之间的接缝`
      ).toBeLessThan(1)
    }

    // 两个高行和普通行同时存在，才能让尺寸串号产生可观察的接缝差异。
    const wrappedCount = rows.filter(row => row.height > neighbor!.height + 8).length
    expect(wrappedCount, '重排后窗口里仍有被多行标签撑高的行').toBeGreaterThanOrEqual(2)
  })
})
