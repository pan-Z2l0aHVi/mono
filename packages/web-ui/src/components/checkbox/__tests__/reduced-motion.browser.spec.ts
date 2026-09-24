import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'
import { cleanupElement, mountElement, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCheckbox } from '..'

afterEach(() => document.body.replaceChildren())

/*
 * 收回期间把勾按在可见档（is-retracting → opacity:1）这件事只在全速动效下才成立：
 * reduced motion 下 replay() 直接返回，收回不会跑，若仍按住可见档，勾就永远留在未勾选的框里。
 * 因此这里的契约用「未勾选后勾必须淡出」来表达，观察面是 opacity 的 CSSTransition（§10 S2）。
 *
 * §10 S3：两个方向走同一组观察函数，「reduce 下有淡出」与「full 下没有淡出、只有画线」互为对照。
 * 淡出在 checkbox 自己的 shadow root 上；画线的作用对象是 web-ui-icon 渲染的 path，它在 icon 的
 * 嵌套 shadow root 里，而 `ShadowRoot.getAnimations()` 不跨嵌套 tree，所以两层各走各的面。
 */
function opacityTransitions(el: WebUiCheckbox): Animation[] {
  return Array.from(el.shadowRoot?.getAnimations() ?? []).filter(
    a => a instanceof CSSTransition && a.transitionProperty === 'opacity'
  )
}

function drawAnimations(el: WebUiCheckbox): Animation[] {
  const iconRoot = el.shadowRoot?.querySelector('web-ui-icon')?.shadowRoot
  return Array.from(iconRoot?.getAnimations() ?? []).filter(
    a => (a.effect as KeyframeEffect | null)?.target instanceof SVGGeometryElement
  )
}

async function mountChecked(motion?: string): Promise<WebUiCheckbox> {
  let parent: HTMLElement = document.body
  if (motion) {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', motion)
    document.body.append(theme)
    parent = theme
  }
  const el = mountElement<WebUiCheckbox>('web-ui-checkbox', { attrs: { checked: '' }, parent })
  await waitForUpdate(el)
  // 过渡要有「变化前的样式」才起得来：挂载后不排一帧的话，取消勾选就和 0→0 没有差别。
  await waitForFrame()
  await waitForFrame()
  return el
}

describe('WebUiCheckbox 取消勾选与 reduced motion（浏览器）', () => {
  it('系统 prefers-reduced-motion 下取消勾选不走收回，勾按 opacity 淡出', async () => {
    const el = await mountChecked()

    el.checked = false
    await waitForUpdate(el)
    await expect.poll(() => opacityTransitions(el).length).toBeGreaterThan(0)

    // 收回在 reduce 下被 replay() 提前返回挡掉，一条画线都不起；淡出正常接管。
    await waitForFrame()
    expect(drawAnimations(el)).toHaveLength(0)

    cleanupElement(el)
  })

  it('对照组：motion="full" 下取消勾选按住可见位，改为描边收回', async () => {
    const el = await mountChecked('full')

    el.checked = false
    await waitForUpdate(el)
    await expect.poll(() => drawAnimations(el).length).toBeGreaterThan(0)
    expect(opacityTransitions(el)).toHaveLength(0)

    cleanupElement(el)
  })
})
