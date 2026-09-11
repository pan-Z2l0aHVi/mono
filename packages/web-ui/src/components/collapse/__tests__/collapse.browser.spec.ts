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

function queryInner(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-inner')!
}

// peek 用例：轨道尺寸由内容高度与 peek 的较小值决定，先设属性再挂载避免首帧动画。
function createPeekCollapse(peek: string, html: string, setup?: (el: WebUiCollapse) => void): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.peek = peek
  el.innerHTML = html
  setup?.(el)
  document.body.append(el)
  return el
}

// peek + peek-edge 用例：边缘晕染长度与 peek 同步设置。
function createPeekEdgeCollapse(
  peek: string,
  peekEdge: string,
  html: string,
  setup?: (el: WebUiCollapse) => void
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.peek = peek
  el.peekEdge = peekEdge
  el.innerHTML = html
  setup?.(el)
  document.body.append(el)
  return el
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

// 展开稳态：presence=open。
// 不用 transitionend：同帧 close→reopen 会取消过渡（净样式无变化），事件不触发，
// 组件本身正确落稳态（debug 实证），等待必须对中断路径健壮。
async function waitForOpenSettled(el: WebUiCollapse) {
  await waitFor(() => queryTrack(el).getAttribute('data-wui-presence') === 'open')
  await nextFrame()
}

afterEach(() => document.body.replaceChildren())

describe('WebUiCollapse 组件（浏览器）', () => {
  it('展开收起切换内容可见性与 presence 状态', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 80px">Content</div></div>'
    )
    await el.updateComplete

    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(true)

    const opened = onceTransitionEnds(el)
    el.open = true
    await el.updateComplete
    await opened
    await nextFrame()

    expect(queryTrack(el).getAttribute('data-wui-presence')).toBe('open')
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))
  })

  it('关闭过渡中重新打开：中断续接完整展开无 hidden 泄漏', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el)

    // 展开完成后立即关闭再立即重开（中断收起动画）
    el.open = false
    await el.updateComplete
    el.open = true
    await el.updateComplete
    await waitForOpenSettled(el)

    expect(el.open).toBe(true)
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
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
    await waitForOpenSettled(el)

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
    await waitForOpenSettled(el)
    expect(innerContent.scrollTop).toBe(42)
  })

  it('horizontal 沿宽度展开收起', async () => {
    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="width: 120px; height: 30px; white-space: nowrap">Content</div></div>'
    )
    el.horizontal = true
    document.body.append(el)
    await el.updateComplete

    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(true)

    const opened = onceTransitionEnds(el)
    el.open = true
    await el.updateComplete
    await opened

    expect(queryTrack(el).getAttribute('data-wui-presence')).toBe('open')
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)

    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))
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
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
    const outerHeightWithInnerClosed = el
      .shadowRoot!.querySelector('.wui-collapse-track')!
      .getBoundingClientRect().height

    // 内层展开：外层高度跟随增长
    const innerOpened = onceTransitionEnds(inner)
    inner.open = true
    await inner.updateComplete
    await innerOpened
    await nextFrame()
    const outerHeightWithInnerOpen = el.shadowRoot!.querySelector('.wui-collapse-track')!.getBoundingClientRect().height
    expect(outerHeightWithInnerOpen).toBeGreaterThan(outerHeightWithInnerClosed)

    // 外层收起：整体归零（内层仍 open 但被外层 hidden 裁剪）
    el.open = false
    await el.updateComplete
    await waitFor(() => queryContentContainer(el).hasAttribute('hidden'))
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(true)
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

  it('peek：关闭态裁剪到指定长度，展开平滑过渡到内容完整高度', async () => {
    const el = createPeekCollapse(
      '100px',
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 300px">Content</div></div>'
    )
    await el.updateComplete

    // 关闭稳态：容器可见，轨道停在 peek 长度
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
    expect(queryTrack(el).getAttribute('data-wui-presence')).toBe(null)
    expect(trackHeight(el)).toBeCloseTo(100, 0)

    // 展开：中间帧必须出现两端之间的高度（显式长度过渡确实在播放）
    el.open = true
    await el.updateComplete
    await nextFrame()
    await waitFor(() => {
      const height = trackHeight(el)
      return height > 110 && height < 290
    })
    await waitFor(() => Math.abs(trackHeight(el) - 300) < 0.5)
    expect(queryTrack(el).getAttribute('data-wui-presence')).toBe('open')

    // 收起：同样平滑回到 peek 长度，落稳态以 presence 清除为信号
    el.open = false
    await el.updateComplete
    await nextFrame()
    await waitFor(() => {
      const height = trackHeight(el)
      return height > 110 && height < 290
    })
    await waitFor(() => queryTrack(el).getAttribute('data-wui-presence') === null)
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
    expect(trackHeight(el)).toBeCloseTo(100, 0)
  })

  it('peek：展开落稳态后由内容驱动高度，无残留的动画尺寸', async () => {
    const el = createPeekCollapse(
      '100px',
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 300px">Content</div></div>'
    )
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await waitFor(() => Math.abs(trackHeight(el) - 300) < 1)

    // 展开稳态由 grid 1fr 解析：内容变化必须继续驱动轨道高度，不被动画残留的
    // 显式长度钉死。
    const content = el.querySelector<HTMLElement>('div[style]')!
    content.style.height = '460px'
    await waitFor(() => Math.abs(trackHeight(el) - 460) < 1)
    expect(trackHeight(el)).toBeCloseTo(460, 0)
  })

  it('peek：露出的内容是只读预览，展开后恢复可交互', async () => {
    const el = createPeekCollapse(
      '100px',
      '<button class="trigger">Trigger</button><div slot="content"><button class="inside" style="height: 200px">Inside</button></div>'
    )
    await el.updateComplete

    const inside = el.querySelector<HTMLButtonElement>('button.inside')!
    inside.focus()
    expect(document.activeElement).not.toBe(inside)

    el.open = true
    await el.updateComplete
    await waitFor(() => Math.abs(trackHeight(el) - 200) < 1)

    inside.focus()
    expect(document.activeElement).toBe(inside)
  })

  it('peek：内容不足 peek 长度时按内容尺寸收起，不留空白', async () => {
    const el = createPeekCollapse(
      '200px',
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    await el.updateComplete

    expect(trackHeight(el)).toBeCloseTo(60, 0)
  })

  it('peek：horizontal 沿宽度裁剪与展开', async () => {
    const el = createPeekCollapse(
      '60px',
      '<button class="trigger">Trigger</button><div slot="content"><div style="width: 200px; height: 30px; white-space: nowrap">Content</div></div>',
      collapse => {
        collapse.horizontal = true
      }
    )
    await el.updateComplete

    expect(trackWidth(el)).toBeCloseTo(60, 0)

    el.open = true
    await el.updateComplete
    await waitFor(() => Math.abs(trackWidth(el) - 200) < 1)

    el.open = false
    await el.updateComplete
    await waitFor(() => Math.abs(trackWidth(el) - 60) < 1)
  })

  it('peek：嵌套内层展开外层跟随，外层收起回到 peek 长度而非归零', async () => {
    const el = createPeekCollapse(
      '60px',
      '<button class="trigger">Outer</button><div slot="content"><div><div style="height: 100px">Body</div><web-ui-collapse id="inner"><button class="trigger" style="height: 18px; margin: 0; border: 0; padding: 0; box-sizing: border-box">Inner</button><div slot="content"><div style="height: 50px">InnerContent</div></div></web-ui-collapse></div></div>'
    )
    await el.updateComplete
    const inner = document.getElementById('inner') as WebUiCollapse
    await inner.updateComplete

    expect(trackHeight(el)).toBeCloseTo(60, 0)

    // 外层展开：内层仍收起时外层停在内容高度
    el.open = true
    await el.updateComplete
    await waitFor(() => trackHeight(el) > 110)
    const outerWithInnerClosed = trackHeight(el)

    // 内层展开：外层高度继续跟随增长
    inner.open = true
    await inner.updateComplete
    await waitFor(() => trackHeight(el) > outerWithInnerClosed + 20)
    expect(trackHeight(el)).toBeGreaterThan(outerWithInnerClosed)

    // 外层收起：回到 peek 长度，容器保持可见（内层仍 open，只是被裁剪）
    el.open = false
    await el.updateComplete
    await waitFor(() => Math.abs(trackHeight(el) - 60) < 1)
    expect(queryContentContainer(el).hasAttribute('hidden')).toBe(false)
    expect(inner.open).toBe(true)
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
    await waitForOpenSettled(el)

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
  })

  describe('属性：peek-edge', () => {
    it('关闭稳态下 inner 计算样式含 mask-image 且按 alpha 模式解析（默认底边）', async () => {
      const el = createPeekEdgeCollapse(
        '300px',
        '24px',
        '<button class="trigger">Trigger</button><div slot="content">Long enough content to exceed peek so the track has measurable height.</div>'
      )
      await el.updateComplete
      // Chromium 把 `black` 序列化为 `rgb(0, 0, 0)`、`transparent` 序列化为 `rgba(0, 0, 0, 0)`，
      // 并把 `to bottom` 标准化为角度；这里用 stop 列表与长度匹配验证渐变形态。
      const mask = getComputedStyle(queryInner(el)).maskImage
      expect(mask).toContain('linear-gradient')
      expect(mask).toContain('calc(100% - 24px)')
      expect(mask).toContain('rgba(0, 0, 0, 0)')

      el.remove()
    })

    it('horizontal 时 mask 渐变有效（沿宽度轴方向）', async () => {
      const el = createPeekEdgeCollapse(
        '300px',
        '24px',
        '<button class="trigger">Trigger</button><div slot="content">Wide content</div>',
        e => {
          e.horizontal = true
        }
      )
      await el.updateComplete
      // 渐变 stop 序列与 vertical 形态相同（to 方向不同），但 track 在水平模式下选择
      // `[data-wui-peek-edge].is-horizontal` 规则；验证 `[data-wui-peek-edge]` 命中即足以。
      const mask = getComputedStyle(queryInner(el)).maskImage
      expect(mask).toContain('linear-gradient')
      expect(mask).toContain('calc(100% - 24px)')

      el.remove()
    })

    it('peek-edge 为空时 mask-image 保持默认 none（attribute 不在 → 规则不命中）', async () => {
      const el = createPeekCollapse(
        '120px',
        '<button class="trigger">Trigger</button><div slot="content">Content</div>'
      )
      await el.updateComplete
      const inner = queryInner(el)
      // peek-edge 属性未设：CSS 选择器 `[data-wui-peek-edge]` 不命中，mask 不应用。
      expect(getComputedStyle(inner).maskImage).toBe('none')

      el.remove()
    })

    it('peek-edge 设值后切到非 peek：track 上 attribute 与 CSS 变量都被清除', async () => {
      const el = createPeekEdgeCollapse(
        '120px',
        '24px',
        '<button class="trigger">Trigger</button><div slot="content">Content</div>'
      )
      await el.updateComplete
      el.peek = null
      await el.updateComplete
      const track = queryTrack(el)
      expect(track.hasAttribute('data-wui-peek-edge')).toBe(false)
      expect(track.style.getPropertyValue('--wui-collapse-peek-edge')).toBe('')
      expect(track.style.getPropertyValue('--wui-collapse-peek')).toBe('')

      el.remove()
    })

    it('水平 peek-edge 在打开稳态下 mask 不应用', async () => {
      const el = createPeekEdgeCollapse(
        '120px',
        '24px',
        '<button class="trigger">Trigger</button><div slot="content">Content</div>',
        e => {
          e.horizontal = true
        }
      )
      await el.updateComplete

      el.open = true
      await el.updateComplete
      await waitForOpenSettled(el)
      // 打开稳态：presence=open，关闭稳态规则不命中，mask-image 自然不应用。
      expect(getComputedStyle(queryInner(el)).maskImage).toBe('none')

      el.remove()
    })
  })
})
