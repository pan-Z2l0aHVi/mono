import type { LitElement } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { pollUntil, queryA11y, waitForFrame } from '@/shared/test-utils'

import { imagePreview, type ImagePreviewOptions } from '..'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#08f"/></svg>'
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`
const IMAGES = [
  { src: IMAGE_SRC, alt: '图 A' },
  { src: IMAGE_SRC, alt: '图 B' },
  { src: IMAGE_SRC, alt: '图 C' }
]

/*
 * 1x 平移只在图片两个方向都不顶满舞台时才有余量：图片被宽度或高度约束时，
 * 该轴上的尺寸差为 0、拖不动。小图在 1x 下按原始尺寸渲染，两个方向都留有余量。
 */
const SMALL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#fb0"/></svg>'
const SMALL_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SMALL_SVG)}`
const SMALL_IMAGES = [
  { src: SMALL_IMAGE_SRC, alt: '小图 A' },
  { src: SMALL_IMAGE_SRC, alt: '小图 B' },
  { src: SMALL_IMAGE_SRC, alt: '小图 C' }
]

afterEach(() => document.body.replaceChildren())

// 默认挂载到 fallback overlay root 的 shadow DOM 内（公开结构见 test-utils.getPortalPanel）。
function overlayRoot(): ShadowRoot | null {
  return document.querySelector('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function hostElement(): LitElement {
  const host = overlayRoot()?.querySelector('[data-wui-overlay-container] web-ui-image-preview')
  if (!host) throw new Error('image preview host is not mounted')
  return host as LitElement
}

function dialogElement(): HTMLDialogElement {
  const dialog = queryA11y(hostElement(), 'dialog')
  if (!dialog) throw new Error('native dialog is not rendered')
  return dialog as HTMLDialogElement
}

function isMounted(): boolean {
  return overlayRoot()?.querySelector('[data-wui-overlay-container] web-ui-image-preview') != null
}

/** 图片所在的舞台：单轨道结构下图片的父元素是 slide，舞台上溯一层。 */
function stageOf(image: HTMLImageElement): HTMLElement {
  return (image.closest('.wui-image-preview-stage') as HTMLElement) ?? image.parentElement!
}

/** 当前图片：`is-current` 只作定位器（§12 C3），断言对象始终是公开量。 */
function currentImage(host: HTMLElement): HTMLImageElement {
  return host.shadowRoot?.querySelector(
    '.wui-image-preview-slide.is-current .wui-image-preview-image'
  ) as HTMLImageElement
}

/** 轨道元素：同样只作定位器，用于读取 WAAPI 过渡（不读 transform 取值）。 */
function trackOf(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
}

async function openPreview(options: Partial<ImagePreviewOptions> = {}) {
  const handle = imagePreview({ images: IMAGES, ...options })
  const host = hostElement()
  await host.updateComplete
  await waitForFrame()
  return { handle, host }
}

function pointer(type: string, init: PointerEventInit) {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, ...init })
}

/**
 * 带时间戳的指针事件：PointerEventInit 不含 timeStamp，事件创建时间戳无法从构造
 * 参数传入，这里用实例属性遮蔽（defineProperty）注入合成时间线，驱动 drag-gesture
 * 的滑动窗口速度估算（真实浏览器由输入管线提供时间戳）。
 */
function timedPointer(type: string, init: PointerEventInit & { timeStamp?: number }) {
  const { timeStamp, ...rest } = init
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, ...rest })
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  return event
}

/**
 * 等进场动画把舞台几何稳定下来（§12 C2：rect 只用于「驱动 / 稳定判据」，
 * 本文件不做任何几何取值断言 —— 手势落点换算与稳定等待都不是断言对象）。
 */
async function waitForStageSettled(stage: HTMLElement): Promise<void> {
  let last = ''
  await pollUntil(() => {
    const rect = stage.getBoundingClientRect()
    const current = `${rect.left.toFixed(2)}:${rect.width.toFixed(2)}`
    if (current === last) return true
    last = current
    return false
  }, 'stage geometry did not settle')
}

/** 舞台中心只用于换算手势落点（驱动，非断言）。 */
function stageCenter(stage: HTMLElement): { x: number; y: number } {
  const rect = stage.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

describe('imagePreview 命令式 API（浏览器）', () => {
  it('内部关闭按钮可获得焦点', async () => {
    const { handle, host } = await openPreview({ closable: true, nav: true, toolbar: true })

    // class 只作定位器（§12 C3）；断言对象是「关闭控件可聚焦」这一 a11y 后果。
    const close = host.shadowRoot?.querySelector<HTMLElement>('.wui-image-preview-close')
    const nativeButton = close?.shadowRoot?.querySelector('button') as HTMLButtonElement | null
    nativeButton?.focus()
    expect(close?.shadowRoot?.activeElement).toBe(nativeButton)

    handle.close()
    await handle.closed
  })

  it('退出过渡完成前保持原生 dialog 位于 top layer', async () => {
    const { handle, host } = await openPreview()
    const dialog = dialogElement()
    expect(dialog.open).toBe(true)

    handle.close()
    await host.updateComplete
    expect(dialog.open).toBe(true)

    dialog.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await pollUntil(() => !isMounted(), 'preview did not unmount')
  })

  it('真实键盘方向键切换图片，Escape 关闭', async () => {
    const { handle } = await openPreview()

    await userEvent.keyboard('{ArrowRight}')
    expect(handle.index).toBe(1)

    await userEvent.keyboard('{ArrowLeft}')
    expect(handle.index).toBe(0)

    await userEvent.keyboard('{Escape}')
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('打开后焦点进入预览，关闭后回到打开前的元素', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = '打开'
    document.body.append(trigger)
    trigger.focus()

    const { handle } = await openPreview({ target: trigger })
    expect(document.activeElement).not.toBe(trigger)
    // 焦点被移入预览内部（原生 dialog 的模态焦点管理）。
    await pollUntil(() => hostElement().shadowRoot?.activeElement != null, 'focus did not move into the preview')

    handle.close()
    await handle.closed
    expect(document.activeElement).toBe(trigger)
  })

  it('滚轮缩放并受倍率上下限约束', async () => {
    const { handle, host } = await openPreview()
    const dialog = dialogElement()

    dialog.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, bubbles: true, cancelable: true }))
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    for (let step = 0; step < 20; step += 1) {
      dialog.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, bubbles: true, cancelable: true }))
    }
    await host.updateComplete
    expect(handle.scale).toBe(4)

    handle.close()
    await handle.closed
  })

  it('双指拉开按距离比例放大图片', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)
    const { x: centerX, y: centerY } = stageCenter(stage)

    // 两指以舞台中心为中点、相距 120px 落下，再对称拉开到 240px。
    stage.dispatchEvent(
      pointer('pointerdown', { pointerId: 11, pointerType: 'touch', clientX: centerX - 60, clientY: centerY })
    )
    stage.dispatchEvent(
      pointer('pointerdown', {
        pointerId: 12,
        pointerType: 'touch',
        isPrimary: false,
        clientX: centerX + 60,
        clientY: centerY
      })
    )
    window.dispatchEvent(
      pointer('pointermove', { pointerId: 11, pointerType: 'touch', clientX: centerX - 120, clientY: centerY })
    )
    window.dispatchEvent(
      pointer('pointermove', {
        pointerId: 12,
        pointerType: 'touch',
        isPrimary: false,
        clientX: centerX + 120,
        clientY: centerY
      })
    )
    await host.updateComplete

    expect(handle.scale).toBeCloseTo(2, 1)

    handle.close()
    await handle.closed
  })

  it('1x 平移后「重置缩放」可用，点击后回到 1x 并重新禁用', async () => {
    const { handle, host } = await openPreview({ images: SMALL_IMAGES, toolbar: true })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    const reset = () => queryA11y(host, '[aria-label="重置缩放"]') as HTMLElement
    expect(reset().hasAttribute('disabled')).toBe(true)

    stage.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 100 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', clientX: 100_000, clientY: 100_000 }))
    await host.updateComplete

    expect(handle.scale).toBe(1)
    expect(reset().hasAttribute('disabled')).toBe(false)

    stage.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', clientX: 100_000, clientY: 100_000 }))
    await host.updateComplete

    await userEvent.click(reset())
    await host.updateComplete

    expect(handle.scale).toBe(1)
    expect(reset().hasAttribute('disabled')).toBe(true)

    handle.close()
    await handle.closed
  })

  it('放大后连续点击图片不关闭浮层', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    handle.zoomIn()
    await host.updateComplete

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await userEvent.click(image)
      await host.updateComplete
      expect(isMounted()).toBe(true)
    }

    handle.close()
    await handle.closed
  })

  it('放大后双击图片仍重置缩放', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    await userEvent.dblClick(image)
    await host.updateComplete
    expect(handle.scale).toBe(1)

    handle.close()
    await handle.closed
  })

  it('toolbar 重置按钮真实点击后回到 1x', async () => {
    const { handle, host } = await openPreview({ toolbar: true })

    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    await userEvent.click(queryA11y(host, '[aria-label="重置缩放"]') as HTMLElement)
    await host.updateComplete
    expect(handle.scale).toBe(1)

    handle.close()
    await handle.closed
  })

  it('放大后拖拽平移并释放不关闭浮层', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    handle.zoomIn()
    await host.updateComplete

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 300, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 300, clientY: 300 }))
    await host.updateComplete

    // 真实浏览器在指针起止于同一元素时会补发 click，拖拽产生的这次不得被当作遮罩点击。
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await host.updateComplete
    expect(isMounted()).toBe(true)

    handle.close()
    await handle.closed
  })

  it('放大后横向拖拽让位于平移，不切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: 400 - 100_000, clientY: 300 }))
    await host.updateComplete

    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 开启但只有一张图时，横向拖拽不切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true, images: [SMALL_IMAGES[0]] })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete

    stage.dispatchEvent(pointer('pointerup', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('1x + swipe 多图时，纵向拖拽被忽略、横向拖拽仍然切图', async () => {
    const { handle, host } = await openPreview({ swipe: true, images: SMALL_IMAGES })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 400, clientY: 200 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointerup', { clientX: 400, clientY: 200 }))
    await host.updateComplete
    await waitForFrame()
    expect(handle.index).toBe(0)

    // 横向拖拽：越过阈值滑入相邻图（swipe 的既有语义不变，提交在滑入过渡后发生）。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300, pointerId: 3 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300, pointerId: 3 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300, pointerId: 3 }))
    await pollUntil(() => handle.index === 1, 'swipe did not commit to next image')
    expect(handle.index).toBe(1)

    handle.close()
    await handle.closed
  })

  it('noBackdropClose 时关闭按钮仍可关闭', async () => {
    const { handle, host } = await openPreview({ noBackdropClose: true, closable: true })
    const closeButton = queryA11y(host, '[aria-label="关闭"]') as HTMLElement
    expect(closeButton).not.toBeNull()

    await userEvent.click(closeButton)
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('swipe 开启时横向拖拽切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await pollUntil(() => handle.index === 1, 'swipe did not commit to next image')
    expect(handle.index).toBe(1)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 380, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 500, clientY: 300, pointerId: 2 }))
    await pollUntil(() => handle.index === 0, 'swipe did not commit back to previous image')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 默认关闭时，横向拖拽不切换图片', async () => {
    const { handle, host } = await openPreview({ images: SMALL_IMAGES })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete

    stage.dispatchEvent(pointer('pointerup', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 开启且 loop 关闭时，边界方向的拖拽保持不动', async () => {
    const { handle, host } = await openPreview({ swipe: true, loop: false, index: 0 })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 420, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 560, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 多图时仅当前图暴露给辅助技术，相邻图对可访问树隐藏', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')

    // class 只作定位器（§12 C3）：断言对象是可访问树的暴露面，不是内部 class 名单、
    // 也不是相邻图的几何位置。
    const slides = Array.from(host.shadowRoot?.querySelectorAll('.wui-image-preview-slide') ?? []) as HTMLElement[]
    const exposed = slides.filter(slide => slide.getAttribute('aria-hidden') !== 'true')

    expect(exposed).toHaveLength(1)
    expect(exposed[0]!.querySelector('img')?.alt).toBe('图 A')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe loop 首尾环绕：最后一张向左拖，松手滑入首图', async () => {
    const { handle, host } = await openPreview({ swipe: true, index: 2 })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    expect(handle.index).toBe(2)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 220, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(2)

    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await pollUntil(() => handle.index === 0, 'swipe did not wrap to first image')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 拖拽未松手不提交，松手越过阈值才切图', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 320, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    stage.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await pollUntil(() => handle.index === 1, 'swipe did not commit to next image')

    handle.close()
    await handle.closed
  })

  it('放大后横向拖拽走平移不切图，resetZoom 回到 1x 后 swipe 恢复切图', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    handle.zoomIn()
    await host.updateComplete
    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    stage.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 300, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)
    stage.dispatchEvent(pointer('pointerup', { clientX: 150, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.resetZoom()
    await host.updateComplete
    expect(handle.scale).toBe(1)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300, pointerId: 2 }))
    await pollUntil(() => handle.index === 1, 'swipe did not recover after resetting zoom')

    handle.close()
    await handle.closed
  })

  it('swipe 未达阈值释放：弹回原位且不切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    // 只拖 30px（低于舞台宽度 15% 阈值），松手后弹回原点。
    // 拖拽速度必须确定性低于提交阈值：无时间戳事件的 timeStamp 取构造时刻，速度随
    // 调度间隙漂移，间隙 <~94ms 时会被当作快速轻扫提交切图（CI 实证）。注入慢时间线。
    stage.dispatchEvent(timedPointer('pointerdown', { clientX: 400, clientY: 300, timeStamp: 0 }))
    await host.updateComplete
    stage.dispatchEvent(timedPointer('pointermove', { clientX: 370, clientY: 300, timeStamp: 300 }))
    await host.updateComplete
    stage.dispatchEvent(timedPointer('pointerup', { clientX: 370, clientY: 300, timeStamp: 600 }))

    /*
     * 弹回过渡在松手后的**下一帧**才注册：位移由 Lit 渲染提交，松手同帧读
     * `getAnimations()` 还是 0。先让一帧过去再读 WAAPI，并断言「确实启动了
     * 一条过渡」——否则下面等它收敛就是空转（原实现若把 track 位移直接落位、
     * 不跑过渡，这里会响亮失败）。
     */
    await waitForFrame()
    expect(trackOf(host).getAnimations().length).toBeGreaterThan(0)
    await pollUntil(() => trackOf(host).getAnimations().length === 0, 'swipe bounce-back did not settle')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('快速轻扫（位移低于距离阈值但速度足够）按速度提交切图', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    const threshold = Math.round(stage.clientWidth * 0.15)
    // 位移只有阈值一半：距离不达标，靠 <100ms 内的速度（约 500px/s > 320px/s）提交。
    // 真实触摸事件流可能被合并/延迟稀释（CDP 取证：40px/167ms 被 100ms 速度窗口
    // 低估到 ~164px/s），兜底分支（小距离 + 过半速度）也覆盖该场景。
    const flick = Math.max(16, Math.floor(threshold * 0.5))
    stage.dispatchEvent(timedPointer('pointerdown', { clientX: 400, clientY: 300, timeStamp: 0 }))
    stage.dispatchEvent(timedPointer('pointermove', { clientX: 400 - flick, clientY: 300, timeStamp: 30 }))
    stage.dispatchEvent(timedPointer('pointerup', { clientX: 400 - flick, clientY: 300, timeStamp: 60 }))
    await pollUntil(() => handle.index === 1, 'fast flick did not commit by velocity')
    expect(handle.index).toBe(1)

    handle.close()
    await handle.closed
  })

  it('swipe 距离阈值随舞台宽度按 15% 缩放：不同宽度下越阈提交、未达弹回', async () => {
    for (const width of [320, 800]) {
      await page.viewport(width, 600)
      const { handle, host } = await openPreview({ swipe: true })
      const image = currentImage(host)
      await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
      const stage = stageOf(image)
      await waitForStageSettled(stage)

      // 舞台宽度只用于换算手势 clientX（§12 C2：驱动，非几何断言）。
      const threshold = Math.round(stage.clientWidth * 0.15)
      const below = Math.max(4, threshold - 8)
      const above = threshold + 8

      stage.dispatchEvent(timedPointer('pointerdown', { clientX: 400, clientY: 300, timeStamp: 0 }))
      stage.dispatchEvent(timedPointer('pointermove', { clientX: 400 - below, clientY: 300, timeStamp: 300 }))
      stage.dispatchEvent(timedPointer('pointerup', { clientX: 400 - below, clientY: 300, timeStamp: 600 }))
      await host.updateComplete
      expect(handle.index).toBe(0)

      stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300, pointerId: 2 }))
      stage.dispatchEvent(pointer('pointermove', { clientX: 400 - above, clientY: 300, pointerId: 2 }))
      stage.dispatchEvent(pointer('pointerup', { clientX: 400 - above, clientY: 300, pointerId: 2 }))
      await pollUntil(() => handle.index === 1, `swipe did not commit at ${width}px stage`)

      handle.close()
      await handle.closed
    }
    await page.viewport(1280, 720)
  })
})
