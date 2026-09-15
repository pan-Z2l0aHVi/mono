import { afterEach, describe, expect, it } from 'vite-plus/test'

import { waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

/** 穿透 shadow 边界收集所有 `role="tooltip"` 面板（portal 面板挂在浮层挂载点内）。 */
function tooltipPanels(node: Node = document.body, found: HTMLElement[] = []): HTMLElement[] {
  if (node instanceof HTMLElement && node.getAttribute('role') === 'tooltip') found.push(node)
  for (const child of node.childNodes) tooltipPanels(child, found)
  if (node instanceof HTMLElement && node.shadowRoot) tooltipPanels(node.shadowRoot, found)
  return found
}

function visiblePanel(label: string): HTMLElement | undefined {
  return tooltipPanels().find(panel => !panel.hidden && (panel.textContent ?? '').includes(label))
}

function mount(label: string): WebUiTooltip {
  const el = document.createElement('web-ui-tooltip') as WebUiTooltip
  el.portal = true
  // 延迟归零，让采集窗口只覆盖入场动画；延迟本身另有测试覆盖。
  el.showDelay = 0
  el.content = label
  el.innerHTML = '<button>trigger</button>'
  document.body.append(el)
  return el
}

/**
 * 逐帧采集面板 presence。entering 只存在于「写入它」的任务与紧随其后的 rAF 翻态之间，
 * 逐帧采样必落在这一窗口内。
 */
async function hoverAndCollectPresence(
  el: WebUiTooltip,
  label: string,
  frames = 8
): Promise<Array<string | undefined>> {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
  const seen: Array<string | undefined> = []
  for (let i = 0; i < frames; i++) {
    await waitForFrame()
    seen.push(visiblePanel(label)?.dataset.wuiPresence)
  }
  return seen
}

// 指针从一个目标滑到相邻目标时，下一个 tooltip 既不等延迟，也不重播入场展开。
// 「延迟为 0」是既有行为，只断言延迟抓不到回归，故改为采集 presence 序列。
// 首次 hover 是对照组：它必须出现 entering，否则第二条断言就是空过。
describe('WebUiTooltip 连续出现时跳过入场动画（浏览器）', () => {
  it('首次出现经过 entering，已有 tooltip 在场时直接进 open', async () => {
    const first = mount('第一个')
    const second = mount('第二个')
    await first.updateComplete
    await second.updateComplete

    const firstSeen = await hoverAndCollectPresence(first, '第一个')
    expect(firstSeen, '对照组：首次出现必须先落 entering').toContain('entering')
    expect(firstSeen[firstSeen.length - 1], '第一个 tooltip 最终应停在 open').toBe('open')

    const secondSeen = await hoverAndCollectPresence(second, '第二个')
    expect(second.open, '第二个 tooltip 未打开').toBe(true)
    expect(secondSeen[secondSeen.length - 1], '第二个 tooltip 最终应停在 open').toBe('open')
    expect(secondSeen, '第二个 tooltip 重播了入场过渡').not.toContain('entering')
  })
})
