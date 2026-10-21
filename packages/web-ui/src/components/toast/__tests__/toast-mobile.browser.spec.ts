import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp, page } from 'vite-plus/test/browser'

import { setViewport } from '@/shared/test-utils/viewport'

import { toast } from '..'

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

function fallbackRoot(): ShadowRoot | null {
  return document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function findToast(id: string) {
  return Array.from(fallbackRoot()?.querySelectorAll('web-ui-toast') ?? []).find(el => el.toastId === id)
}

async function nextFrame(): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
  const deadline = performance.now() + 3000
  while (!condition()) {
    if (performance.now() >= deadline) throw new Error(message)
    await nextFrame()
  }
}

afterEach(async () => {
  toast._reset()
  document.body.replaceChildren()
  await emulateTouchCapabilities(false)
  await setViewport(1280, 720)
})

describe('WebUiToast 移动端适配（浏览器）', () => {
  it('窄视口下不撑出横向滚动', async () => {
    await setViewport(320, 568)
    const el = document.createElement('web-ui-toast')
    el.message = 'viewport width test'
    el.visible = true
    document.body.append(el)
    await el.updateComplete

    // 判据取用户后果「窄视口下不出现横向滚动」——这正是原始缺陷的形态（toast 撑出
    // 横向 scrollbar），且不锁死任何像素宽度。
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320)
  })

  it('粗指针设备可手动关闭 duration:0 toast', async () => {
    await setViewport(390, 844)
    await emulateTouchCapabilities(true)

    expect(matchMedia('(hover: hover) and (pointer: fine)').matches).toBe(false)
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)

    const id = toast.info('touch close test', { id: 'touch-close', duration: 0 })
    await Promise.resolve()
    await nextFrame()
    await nextFrame()

    const toastElement = findToast(id)
    expect(toastElement).toBeDefined()
    let closeReason: string | undefined
    toastElement?.addEventListener('toast-close', event => {
      closeReason = (event as CustomEvent<{ reason: string }>).detail.reason
    })

    const closeButton = page.getByRole('button', { name: 'Close' })
    expect(closeButton.length).toBe(1)
    await closeButton.click()
    await waitFor(() => findToast(id) === undefined, 'duration:0 toast did not close from its close control')

    expect(closeReason).toBe('manual')
  })
})
