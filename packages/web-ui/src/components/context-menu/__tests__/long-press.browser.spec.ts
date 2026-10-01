import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/dropdown-item'
import { cleanupElement, getMenuPanels, pollUntil } from '@/shared/test-utils'
import { realTouchPress } from '@/shared/test-utils/real-gesture'

import type { WebUiContextMenu } from '..'

const ITEMS = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'

afterEach(() => document.body.replaceChildren())

function createMenu(attrs: Record<string, string> = {}): {
  el: WebUiContextMenu
  target: HTMLElement
} {
  const el = document.createElement('web-ui-context-menu')
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  el.innerHTML = `<div id="press-area" style="width: 240px; height: 160px"></div>${ITEMS}`
  document.body.append(el)
  return { el, target: el.querySelector('#press-area') as HTMLElement }
}

async function waitForMenu(el: WebUiContextMenu): Promise<HTMLElement> {
  await pollUntil(() => {
    const panel = getMenuPanels('上下文菜单')[0]
    return Boolean(panel && panel.style.left && panel.style.top)
  }, 'Expected the context menu to open and be positioned')
  await el.updateComplete
  const panel = getMenuPanels('上下文菜单')[0]
  if (!panel) throw new Error('Expected the context menu to be open')
  return panel
}

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 250))
}

describe('context-menu 长按（真实触控管线）', () => {
  it('触屏长按打开菜单，且锚定在按下落点', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    const point = target.getBoundingClientRect()
    const pressX = point.left + point.width / 2
    const pressY = point.top + point.height / 2

    await realTouchPress(target, { holdMs: 700 })
    const panel = await waitForMenu(el)

    expect(el.isOpen).toBe(true)
    const panelRect = panel.getBoundingClientRect()
    // 菜单锚在落点：落点落在面板覆盖范围内（面板可能被视口边缘推回，故用包含关系断言）。
    expect(pressX).toBeGreaterThanOrEqual(panelRect.left)
    expect(pressX).toBeLessThanOrEqual(panelRect.right)
    expect(pressY).toBeGreaterThanOrEqual(panelRect.top)
    expect(pressY).toBeLessThanOrEqual(panelRect.bottom)
    cleanupElement(el)
  })

  it('长按只派发一次 open，不因浏览器补发的 contextmenu 双开', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    const events: CustomEvent<{ open: boolean }>[] = []
    el.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))

    await realTouchPress(target, { holdMs: 900 })
    await waitForMenu(el)
    await settle()

    const opened = events.filter(event => event.detail.open)
    expect(opened).toHaveLength(1)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('短按不打开菜单', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    await realTouchPress(target, { holdMs: 150 })
    await settle()

    expect(el.isOpen).toBe(false)
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    cleanupElement(el)
  })

  it('按住期间位移超出阈值视为滚动，取消长按', async () => {
    const { el, target } = createMenu({ 'long-press': '' })
    await el.updateComplete

    await realTouchPress(target, { holdMs: 700, moveBy: 60, moveAfterMs: 200 })
    await settle()

    expect(el.isOpen).toBe(false)
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    cleanupElement(el)
  })

  it('未启用 long-press 时同样的真实长按不开菜单（opt-in）', async () => {
    const { el, target } = createMenu()
    await el.updateComplete

    await realTouchPress(target, { holdMs: 700 })
    await settle()

    // 用与上面「触屏长按打开菜单」完全相同的手势，唯一差别是没有 long-press 属性。
    // headless 下 CDP 触控不产生原生 contextmenu（已用事件序列确认），所以这里能干净地
    // 证明打开菜单的只有本组件的长按计时器，而它被属性 gate 住了。
    expect(el.isOpen).toBe(false)
    expect(getMenuPanels('上下文菜单')).toHaveLength(0)
    cleanupElement(el)
  })
})
