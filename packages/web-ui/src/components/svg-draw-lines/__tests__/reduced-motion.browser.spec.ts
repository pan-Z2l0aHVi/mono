import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'
import type { WebUiTheme } from '@/components/theme'
import { mountElement, waitForFrame } from '@/shared/test-utils'

import type { WebUiSvgDrawLines } from '..'

afterEach(() => document.body.replaceChildren())

function pathAnimations(el: WebUiSvgDrawLines): Animation[] {
  return el.querySelector('path')!.getAnimations()
}

/** 挂进 theme 作用域，并关掉挂载自动播放，让正反两组都只由 replay() 驱动同一个观察函数。 */
async function mountInsideTheme(motion: string): Promise<WebUiSvgDrawLines> {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  theme.setAttribute('motion', motion)
  document.body.append(theme)

  const el = mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines', {
    html: '<svg><path d="M0 0 L100 100"/></svg>',
    parent: theme
  })
  el.duration = 5000
  el.noAutoplay = true
  await el.updateComplete
  return el
}

/*
 * §10 S3：只断言「没有动效」是空转可过的（组件压根没动效时也绿）。本文件因此自带控制组 ——
 * 显式 motion='full' 在系统 reduce 下仍须启动描边动画，两组走同一个 pathAnimations() 观察函数。
 * 观察面用 WAAPI 而非计算样式，依据 §10 S2。
 */
describe('WebUiSvgDrawLines reduced motion（浏览器）', () => {
  it('无 web-ui-theme 祖先时遵循系统 prefers-reduced-motion，正反两个方向都不启动动画', async () => {
    const el = mountElement<WebUiSvgDrawLines>('web-ui-svg-draw-lines', {
      html: '<svg><path d="M0 0 L100 100"/></svg>'
    })
    el.duration = 5000
    el.noAutoplay = true
    await el.updateComplete
    await waitForFrame()

    await el.replay()
    expect(pathAnimations(el)).toHaveLength(0)

    await el.replay({ reverse: true })
    expect(pathAnimations(el)).toHaveLength(0)
    el.remove()
  })

  it('对照组：motion="full" 在系统 reduce 下仍然启动画入与收回动画', async () => {
    const el = await mountInsideTheme('full')

    // 不 await：replay() 要等 5s 的动画跑完才 resolve，这里只看它确实起来了。
    void el.replay()
    await expect.poll(() => pathAnimations(el).length).toBeGreaterThan(0)
    pathAnimations(el).forEach(animation => animation.cancel())

    void el.replay({ reverse: true })
    await expect.poll(() => pathAnimations(el).length).toBeGreaterThan(0)

    pathAnimations(el).forEach(animation => animation.cancel())
    el.remove()
  })

  /*
   * 收回把空白留在内联样式上，所以「收回之后才切到 reduced」必须把那份空白撤掉：
   * reduced motion 下可见性完全交给消费者的 opacity，dash 还按空白写着就是「已勾选却看不见勾」，
   * 而之后每次 replay 都会同样早退，无法自愈。两组走同一个 dashState() 观察函数（§10 S3）。
   */
  const dashState = (el: WebUiSvgDrawLines) => ({
    count: pathAnimations(el).length,
    dasharray: el.querySelector('path')!.style.strokeDasharray
  })

  it('收回之后切到 reduced 再播放：撤销留下的空白且不启动动画', async () => {
    const el = await mountInsideTheme('full')
    el.duration = 50
    await el.replay({ reverse: true })
    expect(dashState(el).dasharray, '收回末态应留在内联样式上').not.toBe('')

    const theme = el.closest<WebUiTheme>('web-ui-theme')!
    theme.setAttribute('motion', 'reduced')
    await theme.updateComplete

    await el.replay()
    await waitForFrame()
    expect(dashState(el)).toEqual({ count: 0, dasharray: '' })

    el.remove()
  })

  it('对照组：仍停在 motion="full" 时同样的序列会重新画入', async () => {
    const el = await mountInsideTheme('full')
    el.duration = 50
    await el.replay({ reverse: true })
    expect(dashState(el).dasharray).not.toBe('')

    el.duration = 5000
    void el.replay()
    await expect.poll(() => dashState(el).count).toBeGreaterThan(0)
    expect(dashState(el).dasharray).not.toBe('')

    pathAnimations(el).forEach(animation => animation.cancel())
    el.remove()
  })

  /*
   * 撤销只认我们自己写进去的那一份：消费者在收回之后动过内联的任一个值，就不再算数。
   * 只比 dasharray 的旧写法会把消费者改过的 offset 一起抹回资产值，这条即红。
   */
  it('收回后消费者只改过 dashoffset：reduced 下 replay 两个值都不碰', async () => {
    const el = await mountInsideTheme('full')
    el.duration = 50
    await el.replay({ reverse: true })
    const path = el.querySelector('path')!
    const blank = path.style.strokeDasharray
    expect(blank, '收回末态应留在内联样式上').not.toBe('')

    path.style.strokeDashoffset = '1'
    const consumerOffset = path.style.strokeDashoffset
    expect(consumerOffset, '1 应被 CSSOM 接受，否则这条是空转').not.toBe('')
    expect(consumerOffset).not.toBe(blank)

    const theme = el.closest<WebUiTheme>('web-ui-theme')!
    theme.setAttribute('motion', 'reduced')
    await theme.updateComplete

    await el.replay()
    await waitForFrame()
    expect({ dasharray: path.style.strokeDasharray, dashoffset: path.style.strokeDashoffset }).toEqual({
      dasharray: blank,
      dashoffset: consumerOffset
    })

    el.remove()
  })
})
