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
 * 逐帧采集面板 presence 序列。
 *
 * **本用例是判据 §8 R1 明列的例外（待 Batch 6 动效判据裁决）。**
 * R1 要求把 `data-wui-presence` 换成公开可观察量；R1 的首选替代是 Web Animations API，
 * 但实测在本例中**不可行**——面板一经创建就带着 `opacity / backdrop-filter / transform`
 * 三条运行中的过渡（首次与第二次逐帧采集到的属性集合完全相同），`getAnimations()`
 * 无法区分「重播入场」与「跳过入场」：
 *
 * ```
 * FIRST  f0 presence=entering 运行过渡=[]   f1..f7 presence=open 运行过渡=[backdrop-filter,opacity,transform]
 * SECOND f0..f7               presence=open 运行过渡=[backdrop-filter,opacity,transform]
 * ```
 *
 * 本用例的**全部主题**就是这段瞬时序列（不是"顺带断言一下"），且差异纯粹体现在帧级
 * 视觉渐变上，不存在行为层可观察量。因此暂按 R1 的兜底条款保留 presence 序列断言，
 * 并移交 Batch 6 与「减少动效」缺口一并按动效判据重新裁定。
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
