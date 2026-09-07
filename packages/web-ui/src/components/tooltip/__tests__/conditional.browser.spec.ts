import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'

import { getPortalPanel, pollUntil, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

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
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).not.toBeNull()

    show.value = false
    await nextTick()
    await tooltip.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).toBeNull()

    tooltip.open = false
    await tooltip.updateComplete
    // close 的 teardown 链（退出过渡 + 兜底 timer）在慢环境下可能超过固定延时，用条件等待替代固定 sleep
    await pollUntil(() => getPortalPanel('tooltip') === null, 'Expected portal panel to be disposed after close')
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
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).toBeNull()

    show.value = true
    await nextTick()
    await tooltip.updateComplete
    const deadline = performance.now() + 2000
    while (performance.now() < deadline) {
      if (getPortalPanel('tooltip')?.querySelector('.probe-flag')) break
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).not.toBeNull()
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)

    tooltip.open = false
    await tooltip.updateComplete
    await pollUntil(() => getPortalPanel('tooltip') === null, 'Expected portal panel to be disposed after close')
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(1)
    app.unmount()
  })

  it('同 flush 关闭重开容器级 v-if：占位注释归还宿主，重开内容实时迁入面板', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const open = ref(false)
    const show = ref(false)
    const app = createApp({
      setup: () => ({ open, show }),
      template: `
        <web-ui-tooltip :portal="true" show-delay="0" :open="open">
          <button>hover</button>
          <span slot="content" class="probe-flag" v-if="show">tip</span>
        </web-ui-tooltip>
      `
    })
    app.mount(mountPoint)

    const tooltip = mountPoint.querySelector('web-ui-tooltip') as WebUiTooltip
    await tooltip.updateComplete

    // 打开与 v-if 同 flush，内容实时迁入面板
    open.value = true
    show.value = true
    await nextTick()
    await tooltip.updateComplete
    await waitForFrame()
    expect(getPortalPanel('tooltip')).not.toBeNull()
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).not.toBeNull()

    // 打开期 v-if 删除：占位注释被框架插进面板，portal 必须归还宿主，
    // 否则注释随面板销毁，下次翻转内容会被插进已脱离文档的旧面板
    show.value = false
    await nextTick()
    await tooltip.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).toBeNull()
    expect([...tooltip.childNodes].some(node => node instanceof Comment)).toBe(true)

    // 关闭销毁面板，注释在宿主存活
    open.value = false
    await tooltip.updateComplete
    await pollUntil(() => getPortalPanel('tooltip') === null, 'Expected portal panel to be disposed after close')
    expect(getPortalPanel('tooltip')).toBeNull()
    expect([...tooltip.childNodes].some(node => node instanceof Comment)).toBe(true)

    // 重开与 v-if 同 flush：内容实时迁入新面板，宿主无残留
    open.value = true
    show.value = true
    await nextTick()
    await tooltip.updateComplete
    await pollUntil(
      () => Boolean(getPortalPanel('tooltip')?.querySelector('.probe-flag')),
      'Expected reopened content to migrate live into the new panel'
    )
    expect(getPortalPanel('tooltip')?.querySelector('.probe-flag')).not.toBeNull()
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)
    app.unmount()
  })
})
