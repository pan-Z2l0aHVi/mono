import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineOverlay } from '../overlay'

interface PositioningRequest {
  resolve(value: { x: number; y: number; placement: string; middlewareData?: object }): void
  applyWidth(width: number): Promise<void>
}

const positioningRequests = vi.hoisted(() => ({
  requests: [] as Array<{
    resolve(value: { x: number; y: number; placement: string; middlewareData?: object }): void
    applyWidth(width: number): Promise<void>
  }>
}))

vi.mock('@floating-ui/dom', async importOriginal => {
  const actual = await importOriginal<typeof import('@floating-ui/dom')>()
  return {
    ...actual,
    autoUpdate: () => () => {},
    computePosition: (
      reference: HTMLElement,
      floating: HTMLElement,
      config: { middleware: Array<{ name?: string; fn?: (data: unknown) => void }> }
    ) => {
      const sizeMiddleware = config.middleware.find(middleware => middleware.name === 'size') as
        | {
            fn?: (data: {
              placement: string
              strategy: string
              middlewareData: object
              platform: {
                detectOverflow: (
                  state: unknown
                ) => Promise<{ top: number; bottom: number; left: number; right: number }>
                getDimensions: (element: unknown) => { width: number; height: number }
              }
              elements: { reference: HTMLElement; floating: HTMLElement }
              rects: { reference: { width: number }; floating: { width: number } }
            }) => Promise<void>
          }
        | undefined
      let resolve!: PositioningRequest['resolve']
      const promise = new Promise<typeof resolve extends (value: infer T) => void ? T : never>(resolveResult => {
        resolve = resolveResult as PositioningRequest['resolve']
      })
      positioningRequests.requests.push({
        resolve: value => resolve(value),
        async applyWidth(width) {
          await sizeMiddleware?.fn?.({
            placement: 'bottom-start',
            strategy: 'absolute',
            middlewareData: {},
            platform: {
              detectOverflow: async () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
              getDimensions: () => ({ width: 40, height: 20 })
            },
            elements: { reference, floating },
            rects: { reference: { width }, floating: { width: 40 } }
          })
        }
      })
      return promise
    }
  }
})

function createTrigger(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:100px;top:200px;width:120px;height:40px;'
  document.body.appendChild(el)
  return el
}

function createOverlay(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;width:150px;height:200px;'
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  positioningRequests.requests.length = 0
  document.body.replaceChildren()
})

describe('overlay positioning generation', () => {
  it('两次定位 promise 乱序完成时，最终坐标来自最新请求', async () => {
    const trigger = createTrigger()
    const panel = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay: panel })

    ctx.open()
    ctx.update({ placement: 'top' })

    const [, latest] = positioningRequests.requests
    latest.resolve({ x: 20, y: 30, placement: 'top', middlewareData: {} })
    await Promise.resolve()
    positioningRequests.requests[0].resolve({ x: 99, y: 98, placement: 'bottom-start', middlewareData: {} })
    await Promise.resolve()

    expect(panel.style.left).toBe('20px')
    expect(panel.style.top).toBe('30px')
  })

  it('旧 width promise 迟到时不得覆盖最新 width style', async () => {
    const trigger = createTrigger()
    const panel = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay: panel, minAnchorWidth: true })

    ctx.open()
    await positioningRequests.requests[0].applyWidth(90)
    ctx.update({ placement: 'top' })
    await positioningRequests.requests[1].applyWidth(150)

    positioningRequests.requests[1].resolve({ x: 20, y: 30, placement: 'top', middlewareData: {} })
    await Promise.resolve()
    positioningRequests.requests[0].resolve({ x: 99, y: 98, placement: 'bottom-start', middlewareData: {} })
    await Promise.resolve()
    await positioningRequests.requests[0].applyWidth(90)

    expect(panel.style.width).toBe('max-content')
    expect(panel.style.minWidth).toBe('150px')
  })

  it('close 后旧定位 promise 完成时不得写坐标', async () => {
    const trigger = createTrigger()
    const panel = createOverlay()
    const ctx = defineOverlay().make({ anchor: trigger, overlay: panel })

    ctx.open()
    ctx.close()
    positioningRequests.requests[0].resolve({ x: 99, y: 98, placement: 'bottom-start', middlewareData: {} })
    await Promise.resolve()

    expect(ctx.isOpen()).toBe(false)
    expect(panel.style.left).toBe('')
    expect(panel.style.top).toBe('')
  })
})
