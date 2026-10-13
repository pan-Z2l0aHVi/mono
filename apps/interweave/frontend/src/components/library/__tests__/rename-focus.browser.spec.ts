import '@greypan/web-ui'

import type { WebUiEditableText } from '@greypan/web-ui'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, ref } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
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

async function waitFor(condition: () => boolean, label: string, maxFrames = 180): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

const activeHosts: HTMLElement[] = []

afterEach(() => {
  for (const host of activeHosts.splice(0)) host.remove()
})

describe('ResourceList 右键重命名的焦点落点（真实浏览器）', () => {
  it('点「重命名」后焦点落在名称 editable-text 上并全选，不停在列表项', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    activeHosts.push(host)

    const resources = ref([resource()])
    const editingNameKey = ref<string | null>(null)
    const editors = new Map<string, WebUiEditableText | null>()
    const editorRef = (id: string): NameEditorRef => {
      return element => {
        editors.set(id, element instanceof Element ? (element as WebUiEditableText) : null)
      }
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
          onStartRename: (target: ResourceView) => {
            editingNameKey.value = target.id
            void nextTick(() => {
              editors.get(target.id)?.select()
            })
          }
        })
    })
    app.mount(host)
    await nextTick()

    const row = host.querySelector<HTMLElement>('[data-resource-row]')
    expect(row, '列表渲染出了一行').not.toBeNull()
    row!.focus()
    expect(document.activeElement, '右键前焦点在行上').toBe(row)

    await userEvent.click(row!, { button: 'right' })

    const renameItem = await (async () => {
      await waitFor(
        () =>
          [...document.querySelectorAll('web-ui-dropdown-item')].some(
            n => n.textContent?.trim() === '重命名' && !!n.closest('dialog')
          ),
        '右键菜单打开且「重命名」项已搬进面板'
      )
      return [...document.querySelectorAll('web-ui-dropdown-item')].find(
        n => n.textContent?.trim() === '重命名' && !!n.closest('dialog')
      )!
    })()
    await userEvent.click(renameItem)

    await waitFor(() => editingNameKey.value === 'r1', '进入编辑态')
    await waitFor(() => {
      const editor = document.querySelector<WebUiEditableText>('web-ui-editable-text')
      return !!editor && editor.shadowRoot?.activeElement instanceof HTMLTextAreaElement
    }, '焦点落在 editable-text 的编辑层')

    const editor = document.querySelector<WebUiEditableText>('web-ui-editable-text')!
    const textarea = editor.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement
    expect(document.activeElement, '焦点在名称编辑器宿主上').toBe(editor)
    expect(document.activeElement, '焦点不在资源行上').not.toBe(row)
    expect(textarea.selectionStart, '全选起点').toBe(0)
    expect(textarea.selectionEnd, '全选末端').toBe('一条资源'.length)

    app.unmount()
  })
})
