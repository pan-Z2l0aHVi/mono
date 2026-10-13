import '@greypan/web-ui'

import type { WebUiEditableText } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, ref } from 'vue'

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

    const row = host.querySelector<HTMLElement>('[data-resource-row]')
    expect(row, '列表渲染出了一行').not.toBeNull()
    row!.focus()
    expect(document.activeElement, '右键前焦点在行上').toBe(row)

    await userEvent.click(row!, { button: 'right' })

    // 条目开菜单期间被搬进面板（scrim 的子树），所以按「在菜单面板里」认它，不按宿主子树。
    const renameItem = await (async () => {
      await waitFor(
        () =>
          [...document.querySelectorAll('web-ui-dropdown-item')].some(
            node => node.textContent?.trim() === '重命名' && !!node.closest('dialog')
          ),
        '右键菜单已打开且「重命名」项已搬进面板'
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
