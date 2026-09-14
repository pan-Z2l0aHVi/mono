import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'

import '..'
import type { WebUiDropdown } from '..'

afterEach(() => document.body.replaceChildren())

function getPortalPanel(): HTMLElement | null {
  const container = document
    .querySelector<HTMLElement>('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  return container?.querySelector<HTMLElement>('.dropdown-overlay') ?? null
}

async function pollUntil(check: () => boolean, message: string) {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (check()) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(message)
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

describe('WebUiDropdown 打开期实时渲染（浏览器）', () => {
  it('打开期新增菜单项实时迁入面板，关闭后回到宿主且可重开', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const items = ref(['cut', 'copy'])
    const app = createApp({
      setup: () => ({ items }),
      template: `
        <web-ui-dropdown>
          <button slot="trigger">menu</button>
          <web-ui-dropdown-item v-for="v in items" :key="v">{{ v }}</web-ui-dropdown-item>
        </web-ui-dropdown>
      `
    })
    app.mount(mountPoint)

    const dropdown = mountPoint.querySelector('web-ui-dropdown') as WebUiDropdown
    await dropdown.updateComplete

    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(() => Boolean(getPortalPanel()?.style.left), 'Expected dropdown panel to be positioned')
    expect(getPortalPanel()?.querySelectorAll('web-ui-dropdown-item').length).toBe(2)

    // 打开期实时渲染：新增项下一帧内迁入面板
    items.value = ['cut', 'copy', 'paste']
    await nextTick()
    await dropdown.updateComplete
    await pollUntil(
      () => getPortalPanel()?.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected the added menu item to migrate live into the panel'
    )

    // 关闭恢复：新项随其余项回到宿主 light DOM
    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(
      () => !getPortalPanel() && mountPoint.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected dropdown items to return to the host and the portal to dispose'
    )

    // 重开仍完整
    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(
      () => getPortalPanel()?.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected reopened panel to contain all items'
    )

    // marker 生命周期回归（防 marker 繁殖活锁）：打开态 marker 数与项数一致，
    // 且多轮同步周期后数量稳定不增长。
    const markerCount = () =>
      [...dropdown.childNodes].filter(
        node => node.nodeType === Node.COMMENT_NODE && node.textContent === 'wui-dropdown-menu-item'
      ).length
    expect(markerCount()).toBe(3)
    await nextFrame()
    await dropdown.updateComplete
    await nextFrame()
    expect(markerCount()).toBe(3)

    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(() => !getPortalPanel() && markerCount() === 0, 'Expected portal disposal without marker residue')
    app.unmount()
  })

  it('中段 v-if 插入保序：面板按模板序展示，关闭后宿主序不漂移', async () => {
    const mountPoint = document.createElement('div')
    document.body.append(mountPoint)
    const showMiddle = ref(false)
    const app = createApp({
      setup: () => ({ showMiddle }),
      template: `
        <web-ui-dropdown>
          <button slot="trigger">menu</button>
          <web-ui-dropdown-item>cut</web-ui-dropdown-item>
          <web-ui-dropdown-item v-if="showMiddle">mid</web-ui-dropdown-item>
          <web-ui-dropdown-item>copy</web-ui-dropdown-item>
        </web-ui-dropdown>
      `
    })
    app.mount(mountPoint)

    const dropdown = mountPoint.querySelector('web-ui-dropdown') as WebUiDropdown
    await dropdown.updateComplete

    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(() => Boolean(getPortalPanel()?.style.left), 'Expected dropdown panel to be positioned')

    // 打开期在列表中段插入：面板按模板序展示，不得追加到末尾
    showMiddle.value = true
    await nextTick()
    await dropdown.updateComplete
    await pollUntil(
      () => getPortalPanel()?.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected the mid-list item to migrate live into the panel'
    )
    const panelOrder = [...getPortalPanel()!.querySelectorAll('web-ui-dropdown-item')].map(el => el.textContent?.trim())
    expect(panelOrder).toEqual(['cut', 'mid', 'copy'])

    // 关闭归还按 marker 模板位：宿主 DOM 序与模板一致（无漂移）
    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(() => !getPortalPanel(), 'Expected dropdown portal to dispose after close')
    const hostOrder = [...mountPoint.querySelectorAll('web-ui-dropdown-item')].map(el => el.textContent?.trim())
    expect(hostOrder).toEqual(['cut', 'mid', 'copy'])

    // 重开仍按模板序
    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(
      () => getPortalPanel()?.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected reopened panel to contain all items'
    )
    const reopenOrder = [...getPortalPanel()!.querySelectorAll('web-ui-dropdown-item')].map(el =>
      el.textContent?.trim()
    )
    expect(reopenOrder).toEqual(['cut', 'mid', 'copy'])
    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(() => !getPortalPanel(), 'Expected dropdown portal to dispose after close')
    app.unmount()
  })
})
