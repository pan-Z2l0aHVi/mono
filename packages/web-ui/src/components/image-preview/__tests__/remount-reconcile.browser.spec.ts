import type { LitElement } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '@/components/popover'
import type { WebUiPopover } from '@/components/popover'
import { pollUntil, waitForFrame } from '@/shared/test-utils'

import { imagePreview, type ImagePreviewOptions } from '..'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#08f"/></svg>'
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`
const IMAGES = [
  { src: IMAGE_SRC, alt: '图 A' },
  { src: IMAGE_SRC, alt: '图 B' }
]

afterEach(() => document.body.replaceChildren())

/*
 * 重挂载对账（浏览器）。
 *
 * 与 dialog/drawer 同源的平台缺陷：image-preview 的宿主在打开态被移出文档时，
 * 原生 `<dialog>` 脱离 top layer 但 `open` 属性残留；断连时 presence 与滚动锁
 * 已被 dispose/release，重连后 `_open` 未变化、`updated()` 不补跑 sync。此外
 * 本组件独有的缺口：`firstUpdated` 生命周期内只跑一次，而断连会 destroy 双指
 * 缩放手势——重挂载后必须补挂，否则缩放永久失效。
 *
 * 观察面用公开语义：`imagePreview()` 句柄的 `scale`、inner dialog 的
 * `open`/`:modal`、滚动锁的文档级副作用与 `closed` 兑现。
 */

function overlayRoot(): ShadowRoot | null {
  return document.querySelector('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function overlayContainer(): HTMLElement {
  const container = overlayRoot()?.querySelector('[data-wui-overlay-container]')
  if (!(container instanceof HTMLElement)) throw new Error('overlay container is not mounted')
  return container
}

function hostElement(): LitElement {
  const host = overlayRoot()?.querySelector('[data-wui-overlay-container] web-ui-image-preview')
  if (!host) throw new Error('image preview host is not mounted')
  return host as LitElement
}

function dialogElement(): HTMLDialogElement {
  const dialog = hostElement().shadowRoot?.querySelector('dialog')
  if (!(dialog instanceof HTMLDialogElement)) throw new Error('native dialog is not rendered')
  return dialog
}

function stageElement(): HTMLElement {
  const stage = hostElement().shadowRoot?.querySelector('.wui-image-preview-stage')
  if (!(stage instanceof HTMLElement)) throw new Error('stage is not rendered')
  return stage
}

function isMounted(): boolean {
  return overlayRoot()?.querySelector('[data-wui-overlay-container] web-ui-image-preview') != null
}

async function openPreview(options: Partial<ImagePreviewOptions> = {}) {
  const handle = imagePreview({ images: IMAGES, ...options })
  const host = hostElement()
  await host.updateComplete
  await waitForFrame()
  return { handle, host }
}

function touchPointer(type: string, init: PointerEventInit): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', ...init })
}

/** 双指张开合成手势（与 image-preview.spec.ts 的 jsdom 手法一致，驱动 pinch-gesture）。 */
async function pinchZoomOut() {
  const stage = stageElement()
  stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 11, clientX: 100, clientY: 100, isPrimary: true }))
  stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 12, clientX: 200, clientY: 100, isPrimary: false }))
  await waitForFrame()
  window.dispatchEvent(touchPointer('pointermove', { pointerId: 12, clientX: 300, clientY: 100 }))
  window.dispatchEvent(touchPointer('pointerup', { pointerId: 11, clientX: 100, clientY: 100 }))
  window.dispatchEvent(touchPointer('pointerup', { pointerId: 12, clientX: 300, clientY: 100 }))
  await waitForFrame()
}

describe('image-preview 重挂载对账（浏览器）', () => {
  it('打开态被移出文档再接回：回到 top layer、滚动锁恢复且关闭管线完整', async () => {
    const { handle, host } = await openPreview()
    await pollUntil(() => dialogElement().matches(':modal'), 'dialog should enter top layer')
    expect(document.documentElement.style.overflow).toBe('hidden')

    host.remove()
    expect(document.documentElement.style.overflow).toBe('')

    overlayContainer().append(host)
    await host.updateComplete
    // 修复前：open 属性残留但已脱离 top layer（`:modal` 恒 false）
    await pollUntil(() => dialogElement().matches(':modal'), 'dialog should re-enter top layer after remount')

    expect(host.isConnected).toBe(true)
    expect(dialogElement().open).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 重挂载后关闭管线完整：cancel（Escape 路径）仍能走完退场并卸载宿主
    dialogElement().dispatchEvent(new Event('cancel', { cancelable: true }))
    await handle.closed
    expect(isMounted()).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('重挂载后双指缩放手势恢复（firstUpdated 只跑一次，断连销毁的手势必须补挂）', async () => {
    const { handle, host } = await openPreview()
    await pollUntil(() => dialogElement().matches(':modal'), 'dialog should enter top layer')

    await pinchZoomOut()
    expect(handle.scale).toBeGreaterThan(1)

    handle.resetZoom()
    expect(handle.scale).toBe(1)

    host.remove()
    overlayContainer().append(host)
    await host.updateComplete
    await pollUntil(() => dialogElement().matches(':modal'), 'dialog should re-enter top layer after remount')

    // 修复前：`_pinch` 已随 disconnect 销毁且不再重挂，缩放永远停在 1
    await pinchZoomOut()
    expect(handle.scale).toBeGreaterThan(1)
  })

  it('关闭态重挂载是无操作', async () => {
    // 公开 API 只提供「创建即打开」的 imagePreview()；先开-关一次引导出 fallback
    // overlay root，随后关闭态宿主用手动构造（元素已注册、configure 为内部方法），
    // 验证 reconcile 不会误开关闭态。
    const bootstrap = imagePreview({ images: IMAGES })
    bootstrap.close()
    await bootstrap.closed

    const host = document.createElement('web-ui-image-preview') as LitElement & {
      configure(options: ImagePreviewOptions): void
    }
    host.configure({
      images: IMAGES,
      index: 0,
      loop: true,
      nav: false,
      toolbar: false,
      closable: false,
      indicator: false,
      swipe: false,
      noScrollLock: false,
      noBackdropClose: false
    })
    overlayContainer().append(host)
    await host.updateComplete
    expect(dialogElement().open).toBe(false)

    host.remove()
    overlayContainer().append(host)
    await host.updateComplete

    expect(dialogElement().open).toBe(false)
    expect(dialogElement().matches(':modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  /*
   * 「断连撤销登记」的另一半：重连时组件必须重新声明，否则预览虽仍在屏幕上却已不在
   * 仲裁候选里。这一半只有**与别的已登记层并存**时才可观测 —— 预览若是唯一开启的层，
   * 未登记时代码仍会退回原生 cancel 把它关掉，缺陷被掩盖。所以对照物是一个先开启的
   * popover：一次 Escape 只该关掉最上层的预览。
   */
  it('重挂载后预览仍在仲裁里：与已开启的 popover 并存时，一次 Escape 只关预览', async () => {
    const popover = document.createElement('web-ui-popover') as WebUiPopover
    popover.textContent = 'under'
    document.body.append(popover)
    await popover.updateComplete
    popover.open = true
    await popover.updateComplete
    await waitForFrame()

    const { host } = await openPreview()
    await pollUntil(() => dialogElement().matches(':modal'), 'dialog should enter top layer')

    host.remove()
    overlayContainer().append(host)
    await host.updateComplete
    await pollUntil(() => dialogElement().matches(':modal'), 'dialog should re-enter top layer after remount')

    await userEvent.keyboard('{Escape}')

    await pollUntil(() => !isMounted(), 'Expected Escape to close the preview after remount')
    expect(popover.open).toBe(true)
  })
})
