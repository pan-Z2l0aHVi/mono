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

function queryTrack(el: WebUiCollapse): HTMLElement {
  // 动画尺寸以 shadow 内 track 为准。
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-track')!
}

function trackHeight(el: WebUiCollapse): number {
  return queryTrack(el).getBoundingClientRect().height
}

function trackWidth(el: WebUiCollapse): number {
  return queryTrack(el).getBoundingClientRect().width
}

// grid 过渡结束信号：直接监听 track 的 transitionend（含 rows/columns 两种轴向）。
function onceTransitionEnds(el: WebUiCollapse): Promise<void> {
  return new Promise(resolve => {
    const track = queryTrack(el)
    const handler = (event: TransitionEvent) => {
      if (event.propertyName === 'grid-template-rows' || event.propertyName === 'grid-template-columns') {
        track.removeEventListener('transitionend', handler)
        resolve()
      }
    }
    track.addEventListener('transitionend', handler)
  })
}

/*
 * 展开稳态：presence=open 且 track 高度到达预期值。
 * 不用 transitionend：同帧 close→reopen 会取消过渡（净样式无变化），事件不触发，
 * 组件本身正确落稳态（debug 实证），等待必须对中断路径健壮。
 */
async function waitForOpenSettled(el: WebUiCollapse, expectedHeight: number) {
  await waitFor(() => queryTrack(el).getAttribute('data-wui-presence') === 'open')
  await waitFor(() => trackHeight(el) === expectedHeight)
  await nextFrame()
}

afterEach(() => document.body.replaceChildren())

describe('WebUiCollapse 组件（浏览器）', () => {
  it('展开时高度从 0 过渡到内容高度，收起后归零', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 80px">Content</div></div>'
    )
    await el.updateComplete

    // 关闭稳态：hidden，高度 0
    expect(trackHeight(el)).toBe(0)

    const opened = onceTransitionEnds(el)
    el.open = true
    await el.updateComplete
    await opened
    await nextFrame()

    expect(trackHeight(el)).toBe(80)
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))

    expect(trackHeight(el)).toBe(0)
  })

  it('关闭过渡中重新打开：中断续接完整展开无 hidden 泄漏', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el, 60)
    expect(trackHeight(el)).toBe(60)

    // 展开完成后立即关闭再立即重开（中断收起动画）
    el.open = false
    await el.updateComplete
    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el, 60)

    expect(el.open).toBe(true)
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
    expect(trackHeight(el)).toBe(60)
  })

  it('keep-mounted 收起稳态保留内容可测量且滚动位置不丢', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 100px; overflow-y: auto">Content<div style="height: 300px"></div></div></div>'
    )
    el.keepMounted = true
    document.body.append(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el, 100)

    // 内容内部滚动后收起：keep-mounted 应保留 scrollTop
    const innerContent = el.querySelector('div[style]') as HTMLElement
    innerContent.scrollTop = 42
    expect(innerContent.scrollTop).toBe(42)

    el.open = false
    await el.updateComplete
    await waitFor(() => el.shadowRoot!.querySelector('.wui-collapse-inner')?.getAttribute('inert') !== null)

    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
    expect(innerContent.scrollTop).toBe(42)

    // 重新展开内容完整可见，滚动位置仍在
    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el, 100)
    expect(trackHeight(el)).toBe(100)
    expect(innerContent.scrollTop).toBe(42)
  })

  it('horizontal 沿宽度展开收起', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="width: 120px; height: 30px; white-space: nowrap">Content</div></div>'
    )
    el.horizontal = true
    document.body.append(el)
    await el.updateComplete

    expect(trackWidth(el)).toBe(0)

    const opened = onceTransitionEnds(el)
    el.open = true
    await el.updateComplete
    await opened

    expect(trackWidth(el)).toBe(120)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))
    expect(trackWidth(el)).toBe(0)
  })

  it('原生 button 的 click（键盘激活同一路径）切换并派发事件', async () => {
    const el = createCollapse()
    await el.updateComplete

    const button = el.querySelector<HTMLButtonElement>('button.trigger')!
    const events: CustomEvent[] = []
    el.addEventListener('open-change', e => events.push(e as CustomEvent))

    // 原生 button 的键盘激活（Enter/Space）在浏览器内走同一条 click 事件路径；
    // 直接调用 click() 断言组件对 click 的响应（键盘合成由浏览器负责）。
    button.click()
    await el.updateComplete

    expect(el.open).toBe(true)
    expect(events).toHaveLength(1)
    expect((events[0] as CustomEvent<{ open: boolean }>).detail.open).toBe(true)

    button.click()
    await el.updateComplete
    expect(el.open).toBe(false)
    expect(events).toHaveLength(2)
  })

  it('嵌套 collapse：内层展开外层跟随，外层收起裁剪内层', async () => {
    const el = createCollapse(
      '<button class="trigger">Outer</button><div slot="content"><div><div style="height: 100px">Body</div><web-ui-collapse id="inner"><button class="trigger" style="height: 18px; margin: 0; border: 0; padding: 0; box-sizing: border-box">Inner</button><div slot="content"><div style="height: 50px">InnerContent</div></div></web-ui-collapse></div></div>'
    )
    document.body.append(el)
    await el.updateComplete
    const inner = document.getElementById('inner') as WebUiCollapse
    await inner.updateComplete

    const outerOpened = onceTransitionEnds(el)
    el.open = true
    await el.updateComplete
    await outerOpened
    // 内层 trigger 按钮（显式 18px）计入外层内容高度；允许亚像素舍入
    expect(trackHeight(el)).toBeGreaterThanOrEqual(118)
    expect(trackHeight(el)).toBeLessThan(119)

    // 内层展开：外层高度跟随增长
    const innerOpened = onceTransitionEnds(inner)
    inner.open = true
    await inner.updateComplete
    await innerOpened
    await nextFrame()
    expect(trackHeight(el)).toBeGreaterThanOrEqual(168)
    expect(trackHeight(el)).toBeLessThan(169)
    expect(trackHeight(inner)).toBe(50)

    // 外层收起：整体归零（内层仍 open 但被外层 hidden 裁剪）
    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))
    expect(trackHeight(el)).toBe(0)
    expect(inner.open).toBe(true)
  })

  it('disabled 时点击 trigger 无效且 aria-disabled 回写', async () => {
    const el = createCollapse()
    el.disabled = true
    document.body.append(el)
    await el.updateComplete

    expect(el.querySelector('button.trigger')!.getAttribute('aria-disabled')).toBe('true')

    el.querySelector<HTMLButtonElement>('button.trigger')!.click()
    await el.updateComplete
    expect(el.open).toBe(false)
  })

  it('aria-controls 指向 shadow track id，aria-expanded 同步', async () => {
    const el = createCollapse()
    await el.updateComplete

    const button = el.querySelector('button.trigger')!
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-controls')).toBe(queryTrack(el).id)

    el.open = true
    await el.updateComplete
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('关闭动画中断后断连-重连：清瞬态并落到稳态，无 presence 残留', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    document.body.append(el)
    await el.updateComplete

    // 展开到稳态，随后立即关闭并打断关闭动画（断开连接）
    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el, 60)

    el.open = false
    await el.updateComplete
    // 进入关闭动画后立刻卸载——_settle(false) 的兜底定时器被 clear，稳态不落
    const container = queryContentContainer(el)
    expect(container.hasAttribute('hidden')).toBe(false)
    el.remove()

    // 重连（open 未变）时组件必须自我收敛：清瞬态、丢在途管线、落关闭稳态
    document.body.append(el)
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))

    const track = queryTrack(el)
    expect(track.getAttribute('data-wui-presence')).toBe(null)
    expect(el.shadowRoot!.querySelector('.wui-collapse-inner')?.hasAttribute('inert')).toBe(false)
    expect(trackHeight(el)).toBe(0)
  })
})
