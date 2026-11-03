import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { shake } from '@/components/shake'
import type { WebUiTheme } from '@/components/theme'
import { pollUntil } from '@/shared/test-utils'

/*
 * 减少动效下的 shake()（浏览器）。
 *
 * shake 的位移完全由 WAAPI 产生，reduce 档位的判据因此就是**有没有动画**：
 * `getAnimations()` 对「有动效 vs 没有动效」有完全区分力，不需要读计算样式。
 *
 * 与 toast 那份不同，这里不挂 theme 也确实在测 reduce：shake 在没有主题范围时回退
 * **系统** `prefers-reduced-motion`，而本工程的整体环境就是系统 reduce。
 * 对照组仍按要求显式给 `motion='full'`，证明「0 条动画」来自档位判定，
 * 不是来自「这条 API 压根不会动」。
 */

const mounted: HTMLElement[] = []

function marker(inline: string, parent: Element = document.body): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = `width:10px;height:10px;${inline}`
  parent.append(el)
  mounted.push(el)
  return el
}

function mountTheme(motion: string): WebUiTheme {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  theme.setAttribute('motion', motion)
  document.body.append(theme)
  return theme
}

afterEach(() => {
  for (const el of mounted) el.remove()
  mounted.length = 0
  document.body.replaceChildren()
})

describe('减少动效下的 shake（浏览器）', () => {
  it('系统 reduce：shake() 不在页面上产生动画，页面也不位移', async () => {
    const inFlow = marker('margin-left:120px')
    await pollUntil(() => inFlow.getBoundingClientRect().width > 0, 'marker 未布局')
    const rest = inFlow.getBoundingClientRect().left

    shake({ xDistance: 30 })

    expect(document.documentElement.getAnimations()).toHaveLength(0)
    expect(inFlow.getBoundingClientRect().left).toBeCloseTo(rest, 1)
  })

  /*
   * 整页目标的档位来自**根主题**：documentElement 往上走找不到主题元素（它们总在 body
   * 之下），所以 `shake()` 必须改用 findRootTheme() 才与页面其它动效认同一个档位。
   * 这一条同时证明两件事——full 覆盖系统 reduce 后确实动了，以及那条解析路径接上了。
   * 主题必须已渲染（overlay root 就位）才会被认作根主题，所以这里 await updateComplete。
   */
  it('根主题 motion=full 覆盖系统 reduce：整页与主题作用域内的元素都照常摆', async () => {
    const theme = mountTheme('full')
    await theme.updateComplete
    const inFlow = marker('margin-left:120px', theme)

    shake({ xDistance: 30 })
    expect(document.documentElement.getAnimations()).toHaveLength(1)

    // 元素目标走的是它自己的主题祖先链，同一条 full 档位也必须放行。
    shake({ target: inFlow, xDistance: 30 })
    expect(inFlow.getAnimations()).toHaveLength(1)
  })
})
