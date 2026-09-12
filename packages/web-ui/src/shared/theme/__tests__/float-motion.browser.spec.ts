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
      expect(enterStyle.transitionDuration.split(', ')).toEqual(['0.16s', '0.16s'])

      panel.setAttribute('data-wui-presence', 'closing')
      const closingStyle = getComputedStyle(panel)
      expect(closingStyle.transitionDuration.split(', ')).toEqual(['0.12s'])
    })

    it(`${tag} 在 theme motion=reduced 下过渡归零`, async () => {
      const panel = await mountFloatingPanel(tag, { motion: 'reduced' })
      for (const duration of getComputedStyle(panel).transitionDuration.split(', ')) {
        expect(duration).toBe('0s')
      }
    })
  }
})
