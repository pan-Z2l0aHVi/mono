import '@/components/dialog'
import '@/components/theme'
// `--wui-scrollbar-*` 的外观分支写在这份文档级样式里（各 app 导入一次），不在 theme 组件内，
// 所以这里要显式导入，才量得到外观切换后的值。
import '@/scrollbars/style.css'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiDialog } from '@/components/dialog'
import type { WebUiTheme } from '@/components/theme'

/**
 * 组件内部的滚动容器（dialog 的 `.desc`、`.wui-dialog-content`，drawer 的
 * `.wui-dialog-content` 等）靠 `src/scrollbars/internal.css` 的 `.wui-scroll` 接上整页
 * 同一组 `--wui-scrollbar-*`。这一档只能在真实浏览器里量：jsdom 既不算布局，也没有
 * 滚动条几何。
 *
 * 两条判据各自承重：
 * - 颜色断言证明 `.wui-scroll` 的 `scrollbar-color` 真的读到了主题 token；
 * - 宽度断言证明滚动条**不占布局宽度**（覆盖式）。一旦有人改回 `::-webkit-scrollbar`
 *   去拿圆角/尺寸，引擎会切回经典滚动条并固定占一条宽度，这条立刻红。
 */

/** 取计算后 `scrollbar-color` 的拇指色（第一个颜色）。 */
function thumbColor(el: Element): string {
  const value = getComputedStyle(el).scrollbarColor
  return /rgba?\([^)]*\)|#[0-9a-f]+/i.exec(value)?.[0] ?? value
}

function desc(component: WebUiDialog): HTMLElement {
  const el = component.shadowRoot?.querySelector<HTMLElement>('.desc')
  if (!el) throw new Error('Expected dialog .desc to exist.')
  return el
}

/** `resolved-appearance` 由 root 同步异步写，等它落到目标值再读 token。 */
async function waitForResolvedAppearance(theme: WebUiTheme, expected: 'light' | 'dark'): Promise<void> {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (theme.getAttribute('resolved-appearance') === expected) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(`resolved appearance did not become ${expected}, still ${theme.getAttribute('resolved-appearance')}`)
}

async function openTallDialog(appearance?: 'light' | 'dark'): Promise<WebUiDialog> {
  const dialog = document.createElement('web-ui-dialog') as WebUiDialog
  dialog.style.setProperty('--wui-dialog-max-height', '200px')
  const content = document.createElement('div')
  content.style.cssText = 'height: 2000px;'
  dialog.append(content)

  if (appearance) {
    const parent = document.createElement('web-ui-theme') as WebUiTheme
    parent.setAttribute('appearance', appearance)
    parent.setAttribute('motion', 'reduced')
    parent.append(dialog)
    document.body.append(parent)
    await parent.updateComplete
    await waitForResolvedAppearance(parent, appearance)
  } else {
    document.body.append(dialog)
  }

  dialog.open = true
  await dialog.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
  return dialog
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('组件内部滚动条（浏览器）', () => {
  it('浅色主题下读到 token 的拇指色，且滚动条不占布局宽度', async () => {
    const dialog = await openTallDialog('light')
    const el = desc(dialog)

    // 先确认它确实是滚动容器：没有溢出就量不到滚动条槽，后面的宽度断言会空转。
    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe('rgba(0, 0, 0, 0.39)')
    // 覆盖式滚动条不占宽度。`::-webkit-scrollbar` 的经典滚动条会把这里顶成 > 0。
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })

  it('深色主题下换成白色拇指', async () => {
    const dialog = await openTallDialog('dark')
    const el = desc(dialog)

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe('rgba(255, 255, 255, 0.5)')
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })

  it('没有主题时回退到浅色的黑拇指，同样不占宽度', async () => {
    const dialog = await openTallDialog()
    const el = desc(dialog)

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe('rgba(0, 0, 0, 0.39)')
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })
})
