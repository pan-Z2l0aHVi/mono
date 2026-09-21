import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/popover'
import '@/components/theme'
import '@/components/tooltip'
import { getThemedPortalPanel, pollUntil, waitForFrame } from '@/shared/test-utils'

type PanelTag = 'web-ui-popover' | 'web-ui-tooltip'

interface FloatingHost extends HTMLElement {
  open: boolean
  portal: boolean
  updateComplete: Promise<unknown>
}

interface ThemedHost extends HTMLElement {
  appearance: string
  motion: string
  updateComplete: Promise<unknown>
  getOverlayRoot(): HTMLElement | undefined
}

const fixtures = [
  { tag: 'web-ui-popover', role: 'dialog' },
  { tag: 'web-ui-tooltip', role: 'tooltip' }
] as const satisfies ReadonlyArray<{ tag: PanelTag; role: string }>

/** `--wui-duration-float-enter` 的默认值。 */
const FLOAT_ENTER_MS = 240

/**
 * 浮层面板动效契约。
 *
 * b4 的 R2 把 8 个组件各写一遍的「单层玻璃」CSS 断言收敛到本文件
 * （popover / tooltip / dropdown / context-menu / select / autocomplete / toast / dialog），
 * 并注明「由 b6 按动效判据重新裁定」。b6 的裁定（契约化重构判据）：
 * 玻璃的**视觉**契约（`wui-glass` class / blur 半径 / 背景色 / transition-property 列表）
 * 按 ADR-0005 §5 删除且**不承接**（仓库不做视觉基线）；本文件存活主题改为**动效行为**，
 * 观察面用 Web Animations API 而非 computed style（§10 S2）。
 *
 * 实测口径（b6，2026-09-16，`motion=full` / `motion=reduced` 各采 4 帧）：
 * - `portal=true`：面板挂进 theme-owned overlay root，open 时确实启动
 *   `opacity` / `transform` / `backdrop-filter` 三条过渡，时长 240ms；reduced 下一条都不启动。
 * - `portal=false`（**本文件不断言**）：本地面板打开时 `getAnimations()` 恒为空 —— 它从
 *   `display: none` 变为可见，没有 before-change style，CSS 过渡不会启动。
 *   即"入场动画"只存在于 portal 路径；本地面板的**退场**仍走过渡（元素已渲染）。该不对称
 *   记入契约化重构 Batch 6a 发现项，不改产品代码。
 */
async function openPanel({ tag, role }: (typeof fixtures)[number], motion: string): Promise<HTMLElement> {
  const theme = document.createElement('web-ui-theme') as ThemedHost
  theme.appearance = 'light'
  theme.motion = motion
  document.body.append(theme)

  const host = document.createElement(tag) as FloatingHost
  host.portal = true
  theme.append(host)
  await host.updateComplete

  host.open = true
  await host.updateComplete

  // 面板经 portal 异步挂载；等到它存在且可见（`hidden` 是 R1 明文允许的可见性后果）。
  let panel = getThemedPortalPanel(theme, role)
  await pollUntil(() => {
    panel = getThemedPortalPanel(theme, role)
    return panel !== null && !panel.hidden
  }, `${tag} 的 portal 面板未在 2s 内挂载并可见`)
  await waitForFrame()

  if (panel === null) throw new Error(`${tag} 的 portal 面板缺失`)
  return panel
}

afterEach(() => document.body.replaceChildren())

describe('浮层面板动效（浏览器）', () => {
  for (const fixture of fixtures) {
    it(`${fixture.tag} portal 打开时启动 float token 时长的入场过渡`, async () => {
      const panel = await openPanel(fixture, 'full')

      for (const property of ['opacity', 'transform', 'backdrop-filter']) {
        const transition = panel
          .getAnimations()
          .map(animation => animation as CSSTransition)
          .find(animation => animation.transitionProperty === property)
        expect(transition, `${fixture.tag} 打开时缺少 ${property} 过渡`).toBeDefined()
        expect(transition!.effect!.getComputedTiming().duration).toBe(FLOAT_ENTER_MS)
      }
    })

    it(`${fixture.tag} portal 在 motion=reduced 下不启动入场过渡`, async () => {
      const panel = await openPanel(fixture, 'reduced')
      expect(panel.getAnimations()).toHaveLength(0)
    })
  }
})
