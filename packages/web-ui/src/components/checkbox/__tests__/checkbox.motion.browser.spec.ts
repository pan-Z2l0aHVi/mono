import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/checkbox-group'
import type { WebUiCheckboxGroup } from '@/components/checkbox-group'
import { cleanupElement, mountElement, waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCheckbox } from '..'

afterEach(() => document.body.replaceChildren())

/*
 * 勾的画线是 path 上的一条 WAAPI 动画（§10 S2）。path 现在住在 web-ui-icon 自己的 shadow root 里，
 * 而 `ShadowRoot.getAnimations()` 不跨嵌套 shadow tree（实测 checkbox 那层只采得到自身的 opacity
 * 过渡），所以观察面把两层都收进来：描边动画来自 icon 层，checkbox 层留着兜住勾回到自持 path 的情况。
 * 过滤条件不变：effect target 是不是 SVG 几何元素，不读 class 也不比 dash 数值（§12 C1/C3）。
 */
function drawAnimations(el: WebUiCheckbox): Animation[] {
  const roots = [el.shadowRoot, el.shadowRoot?.querySelector('web-ui-icon')?.shadowRoot]
  return roots
    .flatMap(root => Array.from(root?.getAnimations() ?? []))
    .filter(a => (a.effect as KeyframeEffect | null)?.target instanceof SVGGeometryElement)
}

/** 描边真正作用的那条 path：资产渲染在嵌套 shadow root 里，选择器穿不过去，只能逐层拿。 */
function checkPath(el: WebUiCheckbox): SVGGeometryElement | null {
  return el.shadowRoot?.querySelector('web-ui-icon')?.shadowRoot?.querySelector<SVGGeometryElement>('path') ?? null
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
    const check = checkPath(el)
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

  /*
   * 画线只作用于 stroke，所以这条钉的是上面全部用例的前提：勾必须是描边资产，且描边取 on-control 档。
   * 换成实心（fill="currentColor"）资产时 dash 动画照跑、勾却全程满显，收回也看不见；勾选后指示器底是
   * accent，勾留在继承的文字色就是深灰压深蓝。两者都是实测发生过的回归，这里一次钉死。
   * 没有 web-ui-theme 时 on-control 走 style.css 的 #fff 兜底，断言因此不依赖主题档。
   */
  it('勾是描边资产，描边色走 on-control 档', async () => {
    const el = mountElement<WebUiCheckbox>('web-ui-checkbox', { attrs: { checked: '' } })
    await waitForUpdate(el)

    const painted = getComputedStyle(checkPath(el)!)
    expect(painted.fill).toBe('none')
    expect(painted.stroke).toBe('rgb(255, 255, 255)')

    cleanupElement(el)
  })
})
