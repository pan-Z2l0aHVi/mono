import { OverlayScrollbars } from 'overlayscrollbars'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser-playwright/context'

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
  document.documentElement.removeAttribute('data-overlayscrollbars-initialize')
  document.documentElement.removeAttribute('data-overlayscrollbars-viewport')
  document.body.removeAttribute('data-overlayscrollbars-initialize')
  document.body.removeAttribute('data-overlayscrollbars-viewport')
  document.body.className = ''
  await emulateTouchCapabilities(false)
})

describe('应用级 scrollbar 移动端回退（浏览器）', () => {
  it('粗指针设备保留页面原生滚动条且不显示自定义 scrollbar', async () => {
    await emulateTouchCapabilities(true)
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)

    document.documentElement.setAttribute('data-overlayscrollbars-initialize', '')
    document.body.setAttribute('data-overlayscrollbars-initialize', '')
    const content = document.createElement('main')
    content.style.height = '3000px'
    content.style.width = '3000px'
    document.body.append(content)

    // 默认配置在模块求值时读取媒体查询，因此必须在触屏仿真生效后再加载。
    const { default: appScrollbarsOptions } = await import('@greypan/app-scrollbars')
    const instance = OverlayScrollbars(document.body, appScrollbarsOptions)

    try {
      await new Promise(resolve => requestAnimationFrame(resolve))

      const { viewport } = instance.elements()
      // body 初始化时 viewport 是 documentElement，页面原生滚动条在 viewport 上；
      // body 自身被库保持 scrollbar-width:none，与页面滚动无关。
      expect(getComputedStyle(viewport).scrollbarWidth).not.toBe('none')
      // 库的 none 主题用 display:none 隐藏自定义 scrollbar，元素保留在 DOM 中。
      const customScrollbars = [...document.querySelectorAll('.os-scrollbar')]
      for (const scrollbar of customScrollbars) {
        expect(getComputedStyle(scrollbar).display).toBe('none')
      }
    } finally {
      instance.destroy()
    }
  })
})
