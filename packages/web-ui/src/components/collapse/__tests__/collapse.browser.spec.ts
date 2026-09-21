import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiCollapse } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// 轮询确定性信号；超时走 promise reject（不能在 promise 外 throw）。
function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = performance.now()
    const step = (): void => {
      if (predicate()) return resolve()
      if (performance.now() - start > timeoutMs) return reject(new Error('waitFor timeout'))
      setTimeout(step, 16)
    }
    step()
  })
}

function createCollapse(
  html = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  document.body.append(el)
  return el
}

function queryContentContainer(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-content')!
}

// 定位器（非断言）：track 是动画承载节点，用于观察过渡生命周期。
function queryTrack(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-track')!
}

function queryInner(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-inner')!
}

/*
 * 落稳态观察面用 Web Animations API，不读内部状态标记：
 * `getAnimations()` 对「有动效 vs 没有动效」有完全区分力，过渡跑完即为空集。
 * 不用 `transitionend`：同帧 close→reopen 会取消过渡（净样式无变化），事件不触发，
 * 而组件本身正确落稳态（实测），等待必须对中断路径健壮。
 */
function settle(el: WebUiCollapse): Promise<void> {
  return waitFor(() => queryTrack(el).getAnimations().length === 0)
}

afterEach(() => document.body.replaceChildren())

/*
 * 本文件只保留浏览器里才能观察到的契约：真实的过渡生命周期（中断/续接/落稳态）、
 * 真实布局下的内容挂载与滚动位置、真实焦点归宿。
 *
 * 已按契约化重构判据删除（D 清单）：
 * - 全部 peek 尺寸断言（轨道高/宽、`getBoundingClientRect()` 增量、"内容不足 peek 时不
 *   留空白"、horizontal 轴宽）→ §12 C1：几何/像素度量属纯视觉契约，不承接；
 * - 'peek 边缘渐隐' 整个 describe（11 例：`maskImage` 字符串、`--wui-collapse-peek-edge-*`
 *   取值、活动长度推导）→ §12 C1 + §10 S1（组件消费自定义令牌的结果）；
 * - 与 jsdom 重复的四例（click 派发事件 / disabled / aria-controls / 初始 open 展开语义）
 *   → §2 D4，存活覆盖在 `collapse.spec.ts` 的对应用例；
 * - `data-wui-presence` 断言（原 8 处）→ §12 C4（R1 同源：内部状态标记只可作轮询谓词，
 *   且优先换 `getAnimations()`）。
 */
describe('WebUiCollapse 组件（浏览器）', () => {
  it('展开收起切换内容可见性', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 80px">Content</div></div>'
    )
    await el.updateComplete

    expect(queryContentContainer(el).hidden).toBe(true)

    el.open = true
    await el.updateComplete
    await settle(el)

    expect(queryContentContainer(el).hidden).toBe(false)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hidden === true)
  })

  it('关闭过渡中重新打开：中断续接完整展开，无 hidden 泄漏', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)

    // 展开完成后立即关闭再立即重开（中断收起动画）
    el.open = false
    await el.updateComplete
    el.open = true
    await el.updateComplete
    await settle(el)

    expect(el.open).toBe(true)
    expect(el.hasAttribute('open')).toBe(true)
    expect(queryContentContainer(el).hidden).toBe(false)
  })

  it('keep-mounted 收起稳态保留内容挂载，内部滚动位置不丢', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 100px; overflow-y: auto">Content<div style="height: 300px"></div></div></div>'
    )
    el.keepMounted = true
    document.body.append(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)

    // 内容内部滚动后收起：keep-mounted 应保留 scrollTop
    const innerContent = el.querySelector('div[style]') as HTMLElement
    innerContent.scrollTop = 42

    el.open = false
    await el.updateComplete
    await waitFor(() => queryInner(el).hasAttribute('inert'))

    expect(queryContentContainer(el).hidden).toBe(false)
    expect(innerContent.scrollTop).toBe(42)

    // 重新展开内容完整可见，滚动位置仍在
    el.open = true
    await el.updateComplete
    await settle(el)
    expect(innerContent.scrollTop).toBe(42)
  })

  it('peek：露出的内容是只读预览，展开后恢复可交互', async () => {
    const el = document.createElement('web-ui-collapse')
    el.peek = '100px'
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><button class="inside" style="height: 200px">Inside</button></div>'
    document.body.append(el)
    await el.updateComplete

    const inside = el.querySelector<HTMLButtonElement>('button.inside')!
    // 先钉住 peek 的**可观察后果**：关闭态内容容器不是 hidden（默认关闭态是 hidden）。
    // 少了这一条，"关闭态不可聚焦"在无 peek 的默认路径上同样成立，本例就区分不出 peek 了
    // ——长度语义已按 §12 C1 删除，"露出"必须靠这个可见性差异来体现。
    expect(queryContentContainer(el).hidden).toBe(false)
    inside.focus()
    expect(document.activeElement).not.toBe(inside)

    el.open = true
    await el.updateComplete
    await settle(el)

    inside.focus()
    expect(document.activeElement).toBe(inside)
  })

  it('嵌套 collapse：外层收起只裁剪内容，不改写内层 open', async () => {
    const el = createCollapse(
      '<button class="trigger">Outer</button><div slot="content"><div><div style="height: 100px">Body</div><web-ui-collapse id="inner"><button class="trigger">Inner</button><div slot="content"><div style="height: 50px">InnerContent</div></div></web-ui-collapse></div></div>'
    )
    document.body.append(el)
    await el.updateComplete
    const inner = document.getElementById('inner') as WebUiCollapse
    await inner.updateComplete

    el.open = true
    await el.updateComplete
    await settle(el)
    expect(queryContentContainer(el).hidden).toBe(false)

    inner.open = true
    await inner.updateComplete
    await settle(inner)
    // 内层展开不改写外层 open，外层内容仍可见
    expect(el.open).toBe(true)
    expect(queryContentContainer(el).hidden).toBe(false)

    // 外层收起：只裁剪（容器 hidden），内层自身 open 不被连动
    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hidden === true)
    expect(queryContentContainer(el).hidden).toBe(true)
    expect(inner.open).toBe(true)
  })

  it('初始带 open attribute 直接落稳态，不播放展开过渡', async () => {
    const el = document.createElement('web-ui-collapse')
    el.setAttribute('open', '')
    el.innerHTML =
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 80px">Content</div></div>'
    document.body.append(el)
    await el.updateComplete
    await nextFrame()

    // 首帧即展开态：没有可过渡的 before-change 样式，故一条动画都不启动
    expect(el.open).toBe(true)
    expect(queryContentContainer(el).hidden).toBe(false)
    expect(queryTrack(el).getAnimations()).toHaveLength(0)
  })

  it('关闭动画中断后断连-重连：清瞬态并落到关闭稳态，无残留', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    document.body.append(el)
    await el.updateComplete

    // 展开到稳态，随后立即关闭并打断关闭动画（断开连接）
    el.open = true
    await el.updateComplete
    await settle(el)

    el.open = false
    await el.updateComplete
    // 进入关闭动画后立刻卸载——_settle(false) 的兜底定时器被 clear，稳态不落
    expect(queryContentContainer(el).hidden).toBe(false)
    el.remove()

    // 重连（open 未变）时组件必须自我收敛：清瞬态、丢在途管线、落关闭稳态
    document.body.append(el)
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hidden === true)

    expect(queryContentContainer(el).hidden).toBe(true)
    expect(queryTrack(el).getAnimations()).toHaveLength(0)
    expect(queryInner(el).hasAttribute('inert')).toBe(false)
  })
})
