import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

function getPortalPanel(): HTMLElement | null {
  const container = document
    .querySelector<HTMLElement>('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  return (
    container
      ?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
      ?.shadowRoot?.querySelector<HTMLElement>('[role="tooltip"]') ?? null
  )
}

async function waitForFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

describe('WebUiTooltip portal 条件渲染边界（浏览器）', () => {
  it('打开期 v-if 删除的 slot 内容关闭后不复活', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const show = ref(true)
    const app = createApp({
      setup: () => ({ show }),
      template: `
        <web-ui-tooltip :portal="true" show-delay="0">
          <button>hover</button>
          <span slot="content" class="probe-flag" v-if="show">tip</span>
        </web-ui-tooltip>
      `
    })
    app.mount(mountPoint)

    const tooltip = mountPoint.querySelector('web-ui-tooltip') as WebUiTooltip
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()

    show.value = false
    await nextTick()
    await tooltip.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    tooltip.open = false
    await tooltip.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)
    expect(document.querySelectorAll('.probe-flag').length).toBe(0)
    app.unmount()
  })

  it('打开期 v-if 新增的 slot 内容实时迁入面板并在关闭后恢复', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const show = ref(false)
    const app = createApp({
      setup: () => ({ show }),
      template: `
        <web-ui-tooltip :portal="true" show-delay="0">
          <button>hover</button>
          <span slot="content" class="probe-flag" v-if="show">tip</span>
        </web-ui-tooltip>
      `
    })
    app.mount(mountPoint)

    const tooltip = mountPoint.querySelector('web-ui-tooltip') as WebUiTooltip
    await tooltip.updateComplete

    tooltip.open = true
    await tooltip.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    show.value = true
    await nextTick()
    await tooltip.updateComplete
    const deadline = performance.now() + 2000
    while (performance.now() < deadline) {
      if (getPortalPanel()?.querySelector('.probe-flag')) break
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)

    tooltip.open = false
    await tooltip.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(1)
    app.unmount()
  })
})
