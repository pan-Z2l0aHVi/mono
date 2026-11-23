// @vitest-environment jsdom
import { describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import ConfirmDialog from '../ConfirmDialog.vue'

/** 最小装配：只关心 open-change 到 cancel 的接线，web-ui-* 标签按原生元素渲染。 */
function mountDialog(overrides: Record<string, unknown> = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  let cancelled = 0
  const app = createApp({
    render: () =>
      h(ConfirmDialog, {
        open: true,
        title: '确认批量导入',
        message: '共 21 个文件将加入待导入列表。',
        confirmLabel: '导入 21 个文件',
        busy: false,
        danger: false,
        error: '',
        compact: false,
        ...overrides,
        onCancel: () => {
          cancelled += 1
        }
      })
  })
  app.mount(host)
  return {
    host,
    app,
    cancelCount: () => cancelled,
    async requestClose() {
      host.querySelector('web-ui-dialog')!.dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
      await nextTick()
    },
    close() {
      app.unmount()
      host.remove()
    }
  }
}

describe('ConfirmDialog：busy 期间的关闭请求', () => {
  it('声明了 busyCancelLabel 时，busy 的关闭请求不当作取消（只认显式停止）', async () => {
    const dialog = mountDialog({ busy: true, busyCancelLabel: '停止' })
    await dialog.requestClose()
    expect(dialog.cancelCount()).toBe(0)
    dialog.close()
  })

  it('空闲时关闭请求照常当取消', async () => {
    const dialog = mountDialog({ busyCancelLabel: '停止' })
    await dialog.requestClose()
    expect(dialog.cancelCount()).toBe(1)
    dialog.close()
  })

  it('未声明停止文案的 busy 流程维持原语义（关闭请求照常当取消）', async () => {
    const dialog = mountDialog({ busy: true })
    await dialog.requestClose()
    expect(dialog.cancelCount()).toBe(1)
    dialog.close()
  })
})
