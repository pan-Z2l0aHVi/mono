import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/popover'
import '@/components/theme'
import '@/components/tooltip'

async function mountFloatingPanel(
  tag: 'web-ui-popover' | 'web-ui-tooltip',
  { open = false, motion = 'full' }: { open?: boolean; motion?: string } = {}
): Promise<HTMLElement> {
  const theme = document.createElement('web-ui-theme')
  theme.appearance = 'light'
  theme.motion = motion
  document.body.append(theme)

  const el = document.createElement(tag)
  theme.append(el)
  await el.updateComplete

  if (open) {
    el.open = true
    await el.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))
    await new Promise(resolve => requestAnimationFrame(resolve))
  }

  return el.shadowRoot!.querySelector<HTMLElement>('.wui-floating-panel')!
}

afterEach(() => document.body.replaceChildren())

describe('floating panel motion（浏览器）', () => {
  for (const tag of ['web-ui-popover', 'web-ui-tooltip'] as const) {
    it(`${tag} 使用 float token 的 enter/exit 时长`, async () => {
      // 未打开的新面板（entering/closing 同一起始态）：opacity 0、blur 回 0px（插值起点）。
      const closedPanel = await mountFloatingPanel(tag, { open: false })
      expect(getComputedStyle(closedPanel).opacity).toBe('0')
      expect(getComputedStyle(closedPanel).backdropFilter).toContain('blur(0px)')

      const panel = await mountFloatingPanel(tag, { open: true })
      expect(panel.dataset.wuiPresence).toBe('open')

      const enterStyle = getComputedStyle(panel)
      // 单层玻璃：面板自身过渡 opacity / backdrop-filter / transform（blur(0px)↔blur(4px)
      // 平滑插值，无需 surface/blur 双层）。时长全部取 float token 0.24s。
      expect(enterStyle.transitionProperty.split(', ')).toEqual([
        'opacity',
        '-webkit-backdrop-filter',
        'backdrop-filter',
        'transform'
      ])
      expect(enterStyle.transitionDuration.split(', ')).toEqual(['0.24s', '0.24s', '0.24s', '0.24s'])

      // 打开态：面板自身承担玻璃，blur 收敛到 4px。
      expect(panel.classList.contains('wui-glass')).toBe(true)
      expect(enterStyle.backdropFilter).toContain('blur(4px)')
      expect(enterStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

      panel.setAttribute('data-wui-presence', 'closing')
      const closingStyle = getComputedStyle(panel)
      // transition-duration 单值覆盖应用到全部属性（CSSOM 不展开为重复列表）。
      expect(closingStyle.transitionDuration.split(', ')).toEqual(['0.16s'])

      // 进场/退场共用同一起点 token。先冻结过渡再读，否则读到的是过渡中间帧。
      panel.style.transition = 'none'
      panel.setAttribute('data-wui-presence', 'entering')
      expect(new DOMMatrixReadOnly(getComputedStyle(panel).transform).a).toBeCloseTo(0.95)
    })

    it(`${tag} 在 theme motion=reduced 下过渡归零`, async () => {
      const panel = await mountFloatingPanel(tag, { motion: 'reduced' })
      for (const duration of getComputedStyle(panel).transitionDuration.split(', ')) {
        expect(duration).toBe('0s')
      }
    })
  }
})
