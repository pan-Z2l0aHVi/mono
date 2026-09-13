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
      const panel = await mountFloatingPanel(tag, { open: true })
      expect(panel.dataset.wuiPresence).toBe('open')

      const enterStyle = getComputedStyle(panel)
      // 双层玻璃：面板自身只做 transform 过渡（opacity 恒 1，避免成为 backdrop root），
      // 内容与模糊由 surface/blur 层各自 opacity 过渡。
      expect(enterStyle.transitionDuration.split(', ')).toEqual(['0.16s'])

      const surface = panel.querySelector<HTMLElement>('.wui-floating-panel-surface')
      const blur = panel.querySelector<HTMLElement>('.wui-floating-panel-blur')
      expect(surface).toBeTruthy()
      expect(blur).toBeTruthy()
      expect(getComputedStyle(blur!).backdropFilter).not.toBe('none')
      expect(getComputedStyle(blur!).transitionProperty).toContain('opacity')
      expect(getComputedStyle(surface!).transitionProperty).toContain('opacity')
      expect(getComputedStyle(surface!).transitionDuration.split(', ')).toEqual(['0.16s'])

      panel.setAttribute('data-wui-presence', 'closing')
      const closingStyle = getComputedStyle(panel)
      expect(closingStyle.transitionDuration.split(', ')).toEqual(['0.12s'])
      expect(getComputedStyle(surface!).transitionDuration.split(', ')).toEqual(['0.12s'])
    })

    it(`${tag} 在 theme motion=reduced 下过渡归零`, async () => {
      const panel = await mountFloatingPanel(tag, { motion: 'reduced' })
      for (const duration of getComputedStyle(panel).transitionDuration.split(', ')) {
        expect(duration).toBe('0s')
      }
      for (const layer of panel.querySelectorAll<HTMLElement>(
        '.wui-floating-panel-surface, .wui-floating-panel-blur'
      )) {
        for (const duration of getComputedStyle(layer).transitionDuration.split(', ')) {
          expect(duration).toBe('0s')
        }
      }
    })
  }
})
