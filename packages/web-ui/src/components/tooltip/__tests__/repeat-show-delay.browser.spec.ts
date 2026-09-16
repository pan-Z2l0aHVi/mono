import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'

import '..'
import type { WebUiTooltip } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 采集窗口的帧预算。
 *
 * 远小于 `SHOW_DELAY`：60fps 下 3 帧约 50ms，即便帧率放宽到 20fps 也只有 150ms，
 * 不足以跨过 600ms 的延迟窗口，因此「3 帧内可见」与「3 帧内不可见」是可判别的。
 */
const FRAME_BUDGET = 3

/** 把延迟拉长到 600ms，让帧预算与延迟窗口之间留出数量级余量，避免与帧率抖动耦合。 */
const SHOW_DELAY = 600

/** 穿透 shadow 边界收集所有 `role="tooltip"` 面板（portal 面板挂在浮层挂载点内）。 */
function tooltipPanels(node: Node = document.body, found: HTMLElement[] = []): HTMLElement[] {
  if (node instanceof HTMLElement && node.getAttribute('role') === 'tooltip') found.push(node)
  for (const child of node.childNodes) tooltipPanels(child, found)
  if (node instanceof HTMLElement && node.shadowRoot) tooltipPanels(node.shadowRoot, found)
  return found
}

/**
 * 公开可观察量：面板 `role="tooltip"` ∧ 非 `hidden` ∧ 内容已投影。
 *
 * `hidden` 是 R1 明文允许的断言对象——它是可见性的公开后果，不是内部状态名。
 */
function visiblePanel(label: string): HTMLElement | undefined {
  return tooltipPanels().find(panel => !panel.hidden && (panel.textContent ?? '').includes(label))
}

function mount(label: string): WebUiTooltip {
  const el = document.createElement('web-ui-tooltip') as WebUiTooltip
  el.portal = true
  el.showDelay = SHOW_DELAY
  el.content = label
  el.innerHTML = '<button>trigger</button>'
  document.body.append(el)
  return el
}

function hover(el: WebUiTooltip): void {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
}

/** 在给定帧预算内面板是否出现过（非 `hidden`）。 */
async function visibleWithin(label: string, frames: number): Promise<boolean> {
  for (let i = 0; i < frames; i++) {
    await waitForFrame()
    if (visiblePanel(label)) return true
  }
  return false
}

/**
 * 「指针滑到相邻目标」的零延迟行为（判据 §10 S6 对 R1 例外的最终处置）。
 *
 * 原 `repeat-presence.browser.spec.ts` 的主题是逐帧 presence 序列（`entering` → `open`），
 * 即 `src/shared/overlay/presence.ts` 里「先钉在过渡起点、下一 rAF 再进 open」的那一帧相位差。
 * b6 实测确认该差异只是**帧级视觉瞬态**（两条路径终点同为 opacity 1 / blur 4px / scale 1），
 * 按 §5 不写这种断言，R1 例外因此取消。
 *
 * 但同一条代码路径还产生**第二个**后果，且它是干净的用户可见行为——
 * `components/tooltip/index.ts:157`：
 *
 * ```ts
 * const isRepeat = visibleTooltipCount > 0
 * setTimeout(() => this._show(isRepeat), isRepeat ? 0 : this.showDelay)
 * ```
 *
 * 已有 tooltip 在场时走 `setTimeout(0)`，否则等满 `showDelay`。本组用例断言的就是这一条。
 */
describe('WebUiTooltip 相邻触发不等 showDelay（浏览器）', () => {
  it('对照组：首个 tooltip 必须等满 showDelay 才显示', async () => {
    const solo = mount('单独')
    await solo.updateComplete

    hover(solo)
    expect(await visibleWithin('单独', FRAME_BUDGET), '首个 tooltip 在 showDelay 窗口内就出现了，延迟没有生效').toBe(
      false
    )

    // 收尾对照：它最终确实会显示。缺了这一步，上一条断言在面板永远不显示时也会「通过」。
    await pollUntil(() => visiblePanel('单独') !== undefined, '对照组：等待 showDelay 后 tooltip 仍未显示')
  })

  it('已有 tooltip 在场时，相邻触发不等待 showDelay 立即显示', async () => {
    const first = mount('第一个')
    const second = mount('第二个')
    await first.updateComplete
    await second.updateComplete

    hover(first)
    await pollUntil(
      () => visiblePanel('第一个') !== undefined,
      '前置条件：第一个 tooltip 未显示，无法建立「已有 tooltip 在场」场景'
    )

    hover(second)
    expect(await visibleWithin('第二个', FRAME_BUDGET), '已有 tooltip 在场，相邻触发仍等满了 showDelay').toBe(true)
    expect(second.open, '第二个 tooltip 最终未打开').toBe(true)
  })
})
