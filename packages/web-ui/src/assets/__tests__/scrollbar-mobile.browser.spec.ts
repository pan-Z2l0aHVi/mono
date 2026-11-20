import '@/components/dialog'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser'

import type { WebUiDialog } from '@/components/dialog'

interface CdpSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

async function emulateTouchCapabilities(enabled: boolean): Promise<void> {
  const session = cdp() as unknown as CdpSession
  await session.send(
    'Emulation.setTouchEmulationEnabled',
    enabled ? { enabled: true, maxTouchPoints: 1 } : { enabled: false }
  )
  await session.send('Emulation.setEmulatedMedia', {
    features: enabled
      ? [
          { name: 'hover', value: 'none' },
          { name: 'pointer', value: 'coarse' }
        ]
      : []
  })
}

afterEach(async () => {
  document.body.replaceChildren()
  await emulateTouchCapabilities(false)
})

describe('组件内部 scrollbar 移动端回退（浏览器）', () => {
  it('粗指针设备恢复系统原生宽度与配色', async () => {
    await emulateTouchCapabilities(true)
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)

    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    dialog.style.setProperty('--wui-dialog-max-height', '200px')
    const content = document.createElement('div')
    content.style.cssText = 'height: 2000px;'
    dialog.append(content)
    document.body.append(dialog)
    dialog.open = true
    await dialog.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const scroll = dialog.shadowRoot?.querySelector<HTMLElement>('.desc')
    if (!scroll) throw new Error('Expected dialog .desc to exist.')

    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight)
    expect(getComputedStyle(scroll).scrollbarWidth).toBe('auto')
    expect(getComputedStyle(scroll).scrollbarColor).toBe('auto')
  })
})
