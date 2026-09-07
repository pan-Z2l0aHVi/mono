import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'

import '..'
import type { WebUiPopover } from '..'

afterEach(() => document.body.replaceChildren())

// fallback overlay root 结构：[data-wui-overlay-root]#shadow >
// [data-wui-overlay-container] > portal host div#shadow > panel。
function getPortalPanel(): HTMLElement | null {
  const container = document
    .querySelector<HTMLElement>('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  return (
    container
      ?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
      ?.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]') ?? null
  )
}

async function waitForFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function mountPopover(initialShow = true): {
  mountPoint: HTMLElement
  popover: WebUiPopover
  show: ReturnType<typeof ref<boolean>>
  app: ReturnType<typeof createApp>
} {
  const mountPoint = document.createElement('div')
  document.body.append(mountPoint)
  const show = ref(initialShow)
  const app = createApp({
    setup: () => ({ show }),
    template: `
      <web-ui-popover :portal="true">
        <button slot="trigger">t</button>
        <p class="probe-flag" v-if="show">flag</p>
      </web-ui-popover>
    `
  })
  app.mount(mountPoint)
  const popover = mountPoint.querySelector('web-ui-popover') as WebUiPopover
  return { mountPoint, popover, show, app }
}

async function pollUntil(check: () => boolean, message: string) {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (check()) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(message)
}

describe('WebUiPopover portal 条件渲染边界（浏览器）', () => {
  it('打开期 v-if 删除的内容关闭后不复活', async () => {
    const { mountPoint, popover, show, app } = mountPopover()
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()

    // Vue 在打开期物理删除面板内已迁移节点；等 MutationObserver 回调消费完
    show.value = false
    await nextTick()
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    // 关闭恢复不得把已删除节点复活回宿主 light DOM
    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)
    expect(document.querySelectorAll('.probe-flag').length).toBe(0)
    app.unmount()
  })

  it('关闭恢复保持原始位置：恢复节点的后兄弟保持不变', async () => {
    const { popover, app } = mountPopover()
    await popover.updateComplete

    const flag = popover.querySelector('.probe-flag')!
    const originalNext = flag.nextSibling

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).not.toBeNull()

    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(getPortalPanel()).toBeNull()

    // 恢复按迁移前原位回插，而不是追加到宿主末尾；
    // Vue 以锚点定位 fragment 内容，错位恢复会打乱后续条件渲染的插入点。
    expect(flag.nextSibling).toBe(originalNext)
    app.unmount()
  })

  it('打开期 v-if 新增的内容实时迁入面板并在关闭后恢复', async () => {
    const { mountPoint, popover, show, app } = mountPopover(false)
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    // 打开期实时渲染：框架新增内容下一帧内迁入面板
    show.value = true
    await nextTick()
    await popover.updateComplete
    await pollUntil(
      () => Boolean(getPortalPanel()?.querySelector('.probe-flag')),
      'Expected added content to migrate live into the panel'
    )
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)

    // 关闭恢复后锚点完好：继续翻转不产生重复节点
    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(1)

    show.value = false
    await nextTick()
    await popover.updateComplete
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(0)

    show.value = true
    await nextTick()
    await popover.updateComplete
    expect(mountPoint.querySelectorAll('.probe-flag').length).toBe(1)
    app.unmount()
  })

  it('中段 v-if 插入按宿主邻居定位：面板保模板序，关闭恢复原位', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const show = ref(false)
    const app = createApp({
      setup: () => ({ show }),
      template: `
        <web-ui-popover :portal="true">
          <button slot="trigger">t</button>
          <p class="probe-before">before</p>
          <p class="probe-flag" v-if="show">flag</p>
          <p class="probe-after">after</p>
        </web-ui-popover>
      `
    })
    app.mount(mountPoint)

    const popover = mountPoint.querySelector('web-ui-popover') as WebUiPopover
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await waitForFrame()
    expect(getPortalPanel()?.querySelector('.probe-flag')).toBeNull()

    // 打开期在两个已迁移节点之间插入：按宿主邻居定位进面板，不得追加到末尾
    show.value = true
    await nextTick()
    await popover.updateComplete
    await pollUntil(
      () => Boolean(getPortalPanel()?.querySelector('.probe-flag')),
      'Expected mid-list insert to migrate live'
    )
    const panelOrder = [...getPortalPanel()!.querySelectorAll('p')].map(el => el.className)
    expect(panelOrder).toEqual(['probe-before', 'probe-flag', 'probe-after'])

    // 关闭恢复原位：flag 回到 before/after 之间
    popover.open = false
    await popover.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    const hostOrder = [...mountPoint.querySelectorAll('p')].map(el => el.className)
    expect(hostOrder).toEqual(['probe-before', 'probe-flag', 'probe-after'])
    app.unmount()
  })
})
