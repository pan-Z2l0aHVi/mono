import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/checkbox-group'
import type { WebUiCheckboxGroup } from '@/components/checkbox-group'
import { cleanupElement, mountElement, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCheckbox } from '..'

afterEach(() => document.body.replaceChildren())

/*
 * 勾的画线是 checkbox shadow 树内 path 上的一条 WAAPI 动画（§10 S2）。观察面沿用
 * `components/theme/__tests__/reduced-motion.browser.spec.ts` 在 Chromium 里的实测口径：
 * `el.getAnimations({subtree:true})` 采不到 checkbox shadow 内的动画，只有 `shadowRoot.getAnimations()` 采得到。
 * 收动画时按 effect target 是否为 SVG 几何元素过滤，不读 class 也不比 dash 数值（§12 C1/C3）。
 */
function drawAnimations(el: WebUiCheckbox): Animation[] {
  return Array.from(el.shadowRoot?.getAnimations() ?? []).filter(
    a => (a.effect as KeyframeEffect | null)?.target instanceof SVGGeometryElement
  )
}

/** 没有动画时得空串，轮询因此不会把「还没起动画」误判成起来或落稳。 */
const states = (el: WebUiCheckbox): string =>
  drawAnimations(el)
    .map(a => a.playState)
    .join()

describe('WebUiCheckbox 勾画线（浏览器）', () => {
  it('挂载时已勾选是初始状态，不画线', async () => {
    const el = mountElement<WebUiCheckbox>('web-ui-checkbox', { attrs: { checked: '' } })
    await waitForUpdate(el)
    await waitForFrame()
    await waitForFrame()

    expect(drawAnimations(el)).toHaveLength(0)

    // 只钉「没有动画」不够：收回留下的空白同样不带动画。这里钉住勾仍是资产原样，即静态可见的勾。
    const check = el.shadowRoot?.querySelector('path')
    expect(check?.style.strokeDasharray).toBe('')
    expect(check?.style.strokeDashoffset).toBe('')

    // 对照组：同一个观察函数在真实状态切换下必须抓到动画，否则上面的 0 是空转。
    el.checked = false
    await waitForUpdate(el)
    await expect.poll(() => drawAnimations(el).length).toBeGreaterThan(0)

    cleanupElement(el)
  })

  /*
   * 每个方向都是「起来 → 收尾撤销」：收回的空白写在动画名下还是内联样式上，这里都能看出来
   * （旧的钉住写法会让末态停在一条 finished 动画上）。淡出抢跑的问题由
   * `reduced-motion.browser.spec.ts` 的 opacity 观察面负责。
   */
  it('取消勾选沿原路收回，再勾选画入，两段收尾都不留动画', async () => {
    const el = mountElement<WebUiCheckbox>('web-ui-checkbox', { attrs: { checked: '' } })
    await waitForUpdate(el)

    el.checked = false
    await waitForUpdate(el)
    await expect.poll(() => states(el)).toContain('running')
    await expect.poll(() => drawAnimations(el)).toHaveLength(0)

    el.checked = true
    await waitForUpdate(el)
    await expect.poll(() => states(el)).toContain('running')
    await expect.poll(() => drawAnimations(el)).toHaveLength(0)

    cleanupElement(el)
  })

  /*
   * 时长跟随 `--wui-duration-trigger`，而秒分支只在产物上才跑到：构建期压缩会把 theme 里写的
   * `160ms` 变成 `.16s`，跑源码的测试读到的仍是 `160ms`。只按毫秒解析就会拿到 0.16ms、勾瞬间
   * 消失，其余用例照旧全绿，所以四种写法都钉一下：秒、压缩产物的 `.3s`、毫秒覆盖（区别于兜底值）、
   * 没有 token 时兜底。
   */
  it('描边时长跟随 --wui-duration-trigger，含秒的写法', async () => {
    const durationFor = async (token?: string) => {
      let parent: HTMLElement = document.body
      if (token) {
        parent = document.createElement('div')
        parent.style.setProperty('--wui-duration-trigger', token)
        document.body.append(parent)
      }
      const el = mountElement<WebUiCheckbox>('web-ui-checkbox', { parent, attrs: { checked: '' } })
      await waitForUpdate(el)
      const duration = el.shadowRoot?.querySelector('web-ui-svg-draw-lines')?.getAttribute('duration')
      cleanupElement(el)
      return duration
    }

    expect(await durationFor('1s')).toBe('1000')
    expect(await durationFor('.3s')).toBe('300')
    expect(await durationFor('250ms')).toBe('250')
    expect(await durationFor()).toBe('160')
  })

  /*
   * duration 属性只证明值到达了内层元素，勾真正跑多久由它那条 WAAPI 动画决定（§10 S2）。
   * 量实际动画的 computed duration，把「token → 播放时长」这条链整条钉住：属性对了而播放
   * 时长没跟上（或秒被当成毫秒）时这里会红。时长只在 effect 上可读——测试运行时里
   * `Animation.getComputedTiming` 不存在，同目录另外几个 spec 也都走 effect。
   */
  it('描边时长从 token 走到 WAAPI 动画上（1s → 1000ms）', async () => {
    const parent = document.createElement('div')
    parent.style.setProperty('--wui-duration-trigger', '1s')
    document.body.append(parent)
    const el = mountElement<WebUiCheckbox>('web-ui-checkbox', { parent, attrs: { checked: '' } })
    await waitForUpdate(el)

    el.checked = false
    await waitForUpdate(el)
    await expect
      .poll(() => {
        const duration = drawAnimations(el)[0]?.effect?.getComputedTiming().duration
        return typeof duration === 'number' ? duration : 0
      })
      .toBe(1000)

    cleanupElement(el)
  })

  /*
   * 子项的勾选态由 group 写回（它自己没有 checked attribute），而 group 的成员同步早于子项首帧：
   * Lit 对同一轮里已记录过旧值的键不再覆盖，所以首帧旧值仍是 undefined，走「初始状态不画线」那一条。
   * 先断言 checked 为真，否则「没有动画」可能只是因为压根没勾上。
   */
  it('group 预设的已勾选子项挂载时不画线', async () => {
    const group = mountElement<WebUiCheckboxGroup>('web-ui-checkbox-group', {
      attrs: { value: 'a' },
      html: '<web-ui-checkbox value="a"></web-ui-checkbox>'
    })
    await waitForUpdate(group)
    const child = group.querySelector<WebUiCheckbox>('web-ui-checkbox')!
    await waitForUpdate(child)
    await waitForFrame()
    await waitForFrame()

    expect(child.checked).toBe(true)
    expect(drawAnimations(child)).toHaveLength(0)

    // 对照组：同一个观察函数在真实切换下必须抓到动画，否则上面的 0 是空转。
    child.checked = false
    await waitForUpdate(child)
    await expect.poll(() => drawAnimations(child).length).toBeGreaterThan(0)

    cleanupElement(group)
  })
})
