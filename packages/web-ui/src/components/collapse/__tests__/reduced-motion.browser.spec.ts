import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiCollapse } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function createCollapse(
  html = '<button class="trigger">Trigger</button><div slot="content">Content</div>'
): WebUiCollapse {
  const el = document.createElement('web-ui-collapse')
  el.innerHTML = html
  document.body.append(el)
  return el
}

function queryTrack(el: WebUiCollapse): HTMLElement {
  return el.shadowRoot!.querySelector('.wui-collapse-track')!
}

afterEach(() => document.body.replaceChildren())

describe('减少动效下的 Collapse（浏览器）', () => {
  it('展开收起瞬时完成：不播放过渡且无 hidden 泄漏窗口', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 80px">Content</div></div>'
    )
    theme.append(el)
    await el.updateComplete

    // 打开当帧即达最终高度（token 被 reduced-motion 清零，computed duration 为 0）
    el.open = true
    await el.updateComplete
    await nextFrame()

    const track = queryTrack(el)
    expect(track.getBoundingClientRect().height).toBe(80)
    expect(track.getAttribute('data-wui-presence')).toBe('open')
    expect(getComputedStyle(track).transitionDuration.startsWith('0s')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-content')!.hidden).toBe(false)

    // 关闭同样瞬时落到稳态 hidden
    el.open = false
    await el.updateComplete
    await nextFrame()

    expect(el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-content')!.hidden).toBe(true)
    expect(track.getBoundingClientRect().height).toBe(0)
  })

  it('theme motion=reduced 时同样瞬时完成', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 60px">Content</div></div>'
    )
    theme.append(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await nextFrame()

    const track = queryTrack(el)
    expect(track.getBoundingClientRect().height).toBe(60)
    expect(track.getAttribute('data-wui-presence')).toBe('open')
  })

  it('keep-mounted 稳态在 reduced 下仍为 inert', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = createCollapse(
      '<button class="trigger">Trigger</button><div slot="content"><div style="height: 50px">Content</div></div>'
    )
    el.keepMounted = true
    theme.append(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete
    await nextFrame()
    expect(queryTrack(el).getBoundingClientRect().height).toBe(50)

    el.open = false
    await el.updateComplete
    await nextFrame()

    expect(el.shadowRoot!.querySelector<HTMLElement>('.wui-collapse-content')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector('.wui-collapse-inner')?.getAttribute('inert')).not.toBeNull()
  })
})
