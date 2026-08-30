import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/collapse-content'
import '@/components/collapse-trigger'
import '@/components/theme'
import type { WebUiCollapseContent } from '@/components/collapse-content'
import type { WebUiCollapseTrigger } from '@/components/collapse-trigger'

import type { WebUiCollapse } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function queryTrigger(el: WebUiCollapse): WebUiCollapseTrigger {
  return el.querySelector<WebUiCollapseTrigger>('web-ui-collapse-trigger')!
}

function queryContent(el: WebUiCollapse): WebUiCollapseContent {
  return el.querySelector<WebUiCollapseContent>('web-ui-collapse-content')!
}

function queryTrack(el: WebUiCollapse): HTMLElement {
  return queryContent(el).shadowRoot!.querySelector('.wui-collapse-track')!
}

async function waitForUpdateAll(el: WebUiCollapse) {
  await el.updateComplete
  await queryTrigger(el).updateComplete
  await queryContent(el).updateComplete
}

afterEach(() => document.body.replaceChildren())

describe('减少动效下的 Collapse（浏览器）', () => {
  it('展开收起瞬时完成：不播放过渡且无 hidden 泄漏窗口', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content><div style="height: 80px">Content</div></web-ui-collapse-content>'
    theme.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    // 打开当帧即达最终高度（token 被 reduced-motion 清零，computed duration 为 0）
    el.open = true
    await waitForUpdateAll(el)
    await nextFrame()

    const track = queryTrack(el)
    expect(track.getBoundingClientRect().height).toBe(80)
    expect(track.getAttribute('data-wui-presence')).toBe('open')
    expect(getComputedStyle(track).transitionDuration.startsWith('0s')).toBe(true)
    expect(queryContent(el).hasAttribute('hidden')).toBe(false)

    // 关闭同样瞬时落到稳态 hidden
    el.open = false
    await waitForUpdateAll(el)
    await nextFrame()

    expect(queryContent(el).hasAttribute('hidden')).toBe(true)
    expect(track.getBoundingClientRect().height).toBe(0)
  })

  it('theme motion=reduced 时同样瞬时完成', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content><div style="height: 60px">Content</div></web-ui-collapse-content>'
    theme.append(el)
    await el.updateComplete
    await queryContent(el).updateComplete

    el.open = true
    await waitForUpdateAll(el)
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

    const el = document.createElement('web-ui-collapse')
    el.innerHTML =
      '<web-ui-collapse-trigger>Trigger</web-ui-collapse-trigger><web-ui-collapse-content keep-mounted><div style="height: 50px">Content</div></web-ui-collapse-content>'
    theme.append(el)
    await el.updateComplete
    const content = queryContent(el)
    await content.updateComplete

    el.open = true
    await waitForUpdateAll(el)
    await nextFrame()
    expect(queryTrack(el).getBoundingClientRect().height).toBe(50)

    el.open = false
    await waitForUpdateAll(el)
    await nextFrame()

    expect(content.hasAttribute('hidden')).toBe(false)
    expect(content.shadowRoot!.querySelector('.wui-collapse-inner')?.getAttribute('inert')).not.toBeNull()
  })
})
