/*
 * 登记表兜底回收（浏览器，issue #139 方向 2）。
 *
 * dev 期测试钩子 `__openOverlayLayerCount()` 要「在浏览器测试里可见」才算数：jsdom 与
 * 浏览器共用同一份模块代码，但钩子有没有真的挂到 globalThis 上，只有真实运行能回答。
 * 这里同时压住漏 release 的死层在真实按键路径下被惰性回收。
 */
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { defineOpenOverlay } from '../open-overlay'

afterEach(() => document.body.replaceChildren())

describe('open overlay 登记表兜底回收（浏览器）', () => {
  it('dev 期钩子在场，宿主与面板一起脱离文档后登记表尺寸回落', async () => {
    expect(typeof __openOverlayLayerCount).toBe('function')

    const host = document.createElement('div')
    const panel = document.createElement('div')
    host.append(panel)
    document.body.append(host)
    const instance = defineOpenOverlay().make({
      requestClose: () => {},
      isConnected: () => host.isConnected
    })
    instance.claim(panel)
    expect(__openOverlayLayerCount()).toBe(1)

    // 模拟 disconnectedCallback 漏掉 release：宿主与面板一起脱离文档。
    host.remove()
    expect(__openOverlayLayerCount()).toBe(1)

    await userEvent.keyboard('{Escape}')
    expect(__openOverlayLayerCount()).toBe(0)
  })
})
