// 列表根是 web-ui-context-menu（:host 默认 display: inline-block），靠页面的 `block w-full`
// 才拿到确定宽度。virtua 的容器带 contain: size，内禀宽度归零——不引入全局样式，整条链会缩成
// 0 宽，Playwright 认为行不可见、点击超时。全局样式也是「真实输入」这条前提的一部分。
import '@/assets/global.css'
import '@greypan/web-ui'

import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, ref, type Ref } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { NameEditorRef } from '../rename'
import ResourceList from '../ResourceList.vue'

/*
 * 右键 →「重命名」的焦点落点，真实浏览器 + 真实输入（issue #220）。
 *
 * 这条只能在 browser project：缺陷落在**焦点**与**事件派发时序**上，两者在 jsdom 里都不成立。
 * jsdom 没有真实模态 `<dialog>`（scrim 不会进 top layer、文档不会 inert），合成
 * `element.click()` 的派发又发生在脚本调用栈里、监听器之间没有微任务检查点 —— 用它们驱动
 * 会给这条缺陷盖上假绿。所以这里必须走 `userEvent`（真实输入）。
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

/** 有界轮询：条件成立即刻通过，帧预算耗尽才失败（对齐 ResourceList.spec.ts 的做法）。 */
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

describe('ResourceList 右键重命名的焦点落点（真实输入）', () => {
  it('点「重命名」后焦点落在名称 editable-text 上且全选，不停在列表项上', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)

    const editingNameKey = ref<string | null>(null)
    const editors = new Map<string, WebUiEditableText | null>()
    const editorRef = (id: string): NameEditorRef => {
      // 与 pages/library/index.vue 的 setNameEditorRef 同构：回调按 id 记下编辑器实例。
      return element => {
        editors.set(id, element instanceof Element ? (element as WebUiEditableText) : null)
      }
    }

    const app = createApp({
      render: () =>
        h(ResourceList, {
          resources: [resource()],
          activeResourceId: null,
          checkedIds: [],
          selectionMode: false,
          editingNameKey: editingNameKey.value,
          editorRef,
          loading: false,
          runtimeAvailable: true,
          emptyDescription: '',
          mediaUrlFor: () => null,
          resolveDefaultOpenWith: () => Promise.resolve(''),
          // 与 startResourceRename 同构：置编辑态，nextTick 里 select()。
          onStartRename: (target: ResourceView) => {
            editingNameKey.value = target.id
            void nextTick(() => {
              editors.get(target.id)?.select()
            })
          }
        })
    })
    apps.push(app)
    app.mount(host)
    await nextTick()

    // virtua 的窗口尺寸由 ResizeObserver 首帧交付后才算得出来，单次 nextTick 时行还没渲染。
    await waitFor(() => host.querySelector('[data-resource-row]') !== null, '列表渲染出一行')
    const row = host.querySelector<HTMLElement>('[data-resource-row]')!
    row.focus()
    expect(document.activeElement, '右键前焦点在行上').toBe(row)

    await userEvent.click(row!, { button: 'right' })

    // 条目开 menu 期间被搬进 panel（scrim 的子树），所以按「在 menu panel 里」认它，不按宿主子树。
    const renameItem = await (async () => {
      await waitFor(
        () =>
          [...document.querySelectorAll('web-ui-dropdown-item')].some(
            node => node.textContent?.trim() === '重命名' && !!node.closest('dialog')
          ),
        'context menu 已打开且「重命名」项已搬进 panel'
      )
      return [...document.querySelectorAll('web-ui-dropdown-item')].find(
        node => node.textContent?.trim() === '重命名' && !!node.closest('dialog')
      )!
    })()
    await userEvent.click(renameItem)

    await waitFor(() => editingNameKey.value === 'r1', '进入编辑态')
    await waitFor(() => {
      const editor = host.querySelector<WebUiEditableText>('web-ui-editable-text')
      return !!editor && editor.shadowRoot?.activeElement instanceof HTMLTextAreaElement
    }, '焦点落到 editable-text 的编辑层上')

    const editor = host.querySelector<WebUiEditableText>('web-ui-editable-text')!
    const textarea = editor.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    expect(document.activeElement, '焦点在名称编辑器宿主上').toBe(editor)
    expect(document.activeElement, '焦点不在资源列表项上').not.toBe(row)
    // 全选是「可直接输入覆盖」的那一半：只落焦点不选中，用户仍得自己全选。
    expect(textarea.selectionStart, '全选起点').toBe(0)
    expect(textarea.selectionEnd, '全选末端').toBe('一条资源'.length)
  })
})

/** 与 pages/library 同构的可变宿主：resources 与 editingNameKey 都是 ref，改名按 id 收口。 */
function mountRenameList(
  resources: Ref<ResourceView[]>,
  editingNameKey: Ref<string | null>,
  onRenameChange: (resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) => void
) {
  const host = document.createElement('div')
  host.style.cssText = 'width:900px'
  document.body.append(host)
  hosts.push(host)

  const editors = new Map<string, WebUiEditableText | null>()
  /** 与 pages/library/index.vue 的 setNameEditorRef 同构：回调按 id 记下编辑器实例。 */
  const editorRef =
    (id: string): NameEditorRef =>
    element => {
      editors.set(id, element instanceof Element ? (element as WebUiEditableText) : null)
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
        mediaUrlFor: () => null,
        resolveDefaultOpenWith: () => Promise.resolve(''),
        onRenameChange
      })
  })
  apps.push(app)
  app.mount(host)
  return host
}

describe('ResourceList 改名草稿在编辑行被回收时不丢（真实输入）', () => {
  /*
   * 虚拟列表的行会被回收：编辑中的行一旦离开渲染窗口就整行卸载，行内的 editable-text 走
   * disconnectedCallback。默认提交只有 Enter 与 blur 两条——Chromium 移除会补派 blur、
   * change 照常派发；WebKit（Safari / iOS）移除**不派发 blur**，默认路径什么都不提交。
   *
   * virtua 的窗口模式没有 keepMounted，编辑行离开渲染窗口就会被回收，兜底落在 ResourceRow
   * 显式开启的 commit-on-unmount 上。
   *
   * 只能在真实浏览器跑：jsdom 的 web-ui-editable-text 没有升级成真正的自定义元素，
   * disconnectedCallback 根本不执行。
   *
   * 浏览器 project 只跑 Chromium，而 Chromium 自带 blur 兜底——所以这条用例证明的是
   * 「整条提交链在行被回收时仍然通」，分不出属性是否在起作用；属性由 ResourceList.spec.ts
   * 断言，属性语义由 web-ui 的 commit-on-unmount 浏览器用例覆盖。
   */
  it('编辑中的行被回收（从列表里筛掉）时，草稿被提交而不是静默丢失', async () => {
    const base = Array.from({ length: 3 }, (_, index) => resource({ id: `r${index}`, title: `资源 ${index}` }))
    const resources = ref(base)
    const editingNameKey = ref<string | null>('r1')
    const commits: { id: string; title: string }[] = []
    const host = mountRenameList(resources, editingNameKey, (target, event) => {
      commits.push({ id: target.id, title: event.currentTarget.value.trim() })
    })

    await waitFor(
      () => host.querySelector<WebUiEditableText>('[data-resource-id="r1"] web-ui-editable-text') !== null,
      'r1 那一行换成了名称编辑器'
    )
    const editor = host.querySelector<WebUiEditableText>('[data-resource-id="r1"] web-ui-editable-text')!
    expect(editor.hasAttribute('commit-on-unmount'), 'ResourceRow 已开启卸载提交').toBe(true)

    // 进入编辑态（select 全选），打出草稿：ASCII 输入避开 IME，改的只是值本身。
    editor.select()
    await userEvent.keyboard('renamed')
    await waitFor(() => editor.value === 'renamed', '草稿已写进编辑器')

    // 视口正常时夹取总会把编辑行拉回窗口，页面隐藏那一种在真实浏览器里改不动 innerHeight，
    // 所以用「从列表里筛掉」复现同一件事：编辑中的节点被 virtua 回收。
    resources.value = base.filter(item => item.id !== 'r1')
    await waitFor(() => commits.length > 0, '卸载时草稿被提交')

    expect(commits, '卸载提交恰好一次').toHaveLength(1)
    expect(commits[0]).toEqual({ id: 'r1', title: 'renamed' })
  })
})
