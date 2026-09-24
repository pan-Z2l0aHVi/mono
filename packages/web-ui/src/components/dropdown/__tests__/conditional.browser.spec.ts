import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'

import { getMenuPanels, pollUntil } from '@/shared/test-utils'

import '..'
import type { WebUiDropdown } from '..'

afterEach(() => document.body.replaceChildren())

function panel(): HTMLElement | null {
  return getMenuPanels()[0] ?? null
}

function panelItemTexts(): string[] {
  return [...(panel()?.querySelectorAll('web-ui-dropdown-item') ?? [])].map(el => el.textContent?.trim() ?? '')
}

function hostItemTexts(mountPoint: HTMLElement): string[] {
  return [...mountPoint.querySelectorAll('web-ui-dropdown-item')].map(el => el.textContent?.trim() ?? '')
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
    await pollUntil(() => Boolean(panel()?.style.left), 'Expected dropdown panel to be positioned')
    expect(panelItemTexts()).toEqual(['cut', 'copy'])

    items.value = ['cut', 'copy', 'paste']
    await nextTick()
    await dropdown.updateComplete
    await pollUntil(
      () => panel()?.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected the added menu item to migrate live into the panel'
    )

    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(
      () => !panel() && mountPoint.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected dropdown items to return to the host and the portal to dispose'
    )
    expect(hostItemTexts(mountPoint)).toEqual(['cut', 'copy', 'paste'])

    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(() => panelItemTexts().length === 3, 'Expected reopened panel to contain all items')

    // 稳态不增不减：多轮同步周期与多轮开关后项数稳定（防托管节点增殖活锁）。
    expect(panelItemTexts()).toEqual(['cut', 'copy', 'paste'])
    await nextFrame()
    await dropdown.updateComplete
    await nextFrame()
    expect(panelItemTexts(), '稳态下不得增殖或丢失条目').toEqual(['cut', 'copy', 'paste'])

    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(
      () => !panel() && mountPoint.querySelectorAll('web-ui-dropdown-item').length === 3,
      'Expected portal disposal without item residue'
    )

    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(() => panelItemTexts().length === 3, 'Expected a second reopen to be complete')
    expect(panelItemTexts()).toEqual(['cut', 'copy', 'paste'])
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
    await pollUntil(() => Boolean(panel()?.style.left), 'Expected dropdown panel to be positioned')

    showMiddle.value = true
    await nextTick()
    await dropdown.updateComplete
    await pollUntil(() => panelItemTexts().length === 3, 'Expected the mid-list item to migrate live into the panel')
    expect(panelItemTexts()).toEqual(['cut', 'mid', 'copy'])

    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(() => !panel(), 'Expected dropdown portal to dispose after close')
    expect(hostItemTexts(mountPoint)).toEqual(['cut', 'mid', 'copy'])

    dropdown.open = true
    await dropdown.updateComplete
    await pollUntil(() => panelItemTexts().length === 3, 'Expected reopened panel to contain all items')
    expect(panelItemTexts()).toEqual(['cut', 'mid', 'copy'])
    dropdown.open = false
    await dropdown.updateComplete
    await pollUntil(() => !panel(), 'Expected dropdown portal to dispose after close')
    app.unmount()
  })
})
