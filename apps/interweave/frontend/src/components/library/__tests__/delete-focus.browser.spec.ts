import '@/assets/global.css'
import '@greypan/web-ui'

import { describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { createApp, h, nextTick, ref } from 'vue'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import ConfirmDialog from '../ConfirmDialog.vue'
import ResourceList from '../ResourceList.vue'

function resource(id: string): ResourceView {
  return {
    id,
    title: id,
    note: '',
    createdAt: 1,
    updatedAt: 1,
    sources: [],
    preferred: null,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 0
  }
}

async function waitFor(condition: () => boolean, label: string) {
  for (let i = 0; i < 180; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(label)
}

describe('删除确认后的焦点恢复', () => {
  it('对话框关闭后聚焦最邻近的剩余资源', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const resources = ref([resource('first'), resource('second')])
    const open = ref(false)
    const list = ref<{ focusNearest(index: number): void }>()
    const app = createApp({
      setup: () => () =>
        h('div', [
          h(ResourceList, {
            ref: list,
            resources: resources.value,
            activeResourceId: null,
            checkedIds: [],
            selectionMode: false,
            editingNameKey: null,
            editorRef: () => () => {},
            loading: false,
            runtimeAvailable: true,
            emptyDescription: '',
            resolveDefaultOpenWith: async () => ''
          }),
          h(ConfirmDialog, {
            open: open.value,
            title: '删除资源',
            message: '确认删除',
            confirmLabel: '删除',
            busy: false,
            danger: true,
            error: '',
            compact: false,
            onConfirm: () => {
              resources.value = resources.value.slice(1)
              open.value = false
            },
            onClosed: () => {
              void nextTick(() => list.value?.focusNearest(0))
            }
          })
        ])
    })
    try {
      app.mount(host)
      await waitFor(() => Boolean(host.querySelector('[data-resource-id="first"]')), '列表未渲染')
      const first = host.querySelector<HTMLElement>('[data-resource-id="first"]')!
      first.focus()
      open.value = true
      await nextTick()
      const dialog = host.querySelector('web-ui-dialog')!
      await dialog.updateComplete
      await waitFor(() => Boolean(dialog.shadowRoot?.querySelector('dialog')?.open), '确认对话框未打开')
      const confirm = [...host.querySelectorAll('web-ui-button')].find(button => button.textContent?.trim() === '删除')!
      await userEvent.click(confirm.shadowRoot!.querySelector('button')!)
      await waitFor(
        () => document.activeElement?.getAttribute('data-resource-id') === 'second',
        '关闭后焦点未到剩余资源'
      )
      expect(document.activeElement?.getAttribute('data-resource-id')).toBe('second')
    } finally {
      app.unmount()
      host.remove()
    }
  })
})
