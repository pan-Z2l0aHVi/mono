import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Middleware,
  type Placement,
  type Strategy
} from '@floating-ui/dom'
import { definePlugin } from '@greypan/js-kit'

import { defineOverlayPositioningGeneration, type OverlayPositioningGeneration } from './positioning-generation'

export interface OverlayOptions {
  placement?: Placement
  offset?: number
  flip?: boolean
  shift?: boolean
  /** 面板宽度与锚点宽度保持一致。 */
  matchWidth?: boolean
  /** 面板至少与锚点同宽，同时允许内容将面板撑宽。 */
  minAnchorWidth?: boolean
  strategy?: Strategy
}

/** 虚拟锚点：无对应 DOM 元素的定位基准。context-menu 未走 defineOverlay（定位语义分歧见 ADR-0038）。 */
export interface OverlayVirtualAnchor {
  getBoundingClientRect(): DOMRect
}

export type OverlayAnchor = HTMLElement | OverlayVirtualAnchor

export interface OverlayApi {
  isOpen(): boolean
  readonly options: Required<OverlayOptions>
  open(): void
  close(): void
  toggle(): void
  update(options: Partial<OverlayOptions>): void
  updateAnchor(anchor: OverlayAnchor): void
  dispose(): void
}

const DEFAULT_OVERLAY_MIN_WIDTH = 120
const OVERLAY_MIN_WIDTH_VARIABLE = '--wui-overlay-min-width'

const DEFAULT_OPTIONS: Required<OverlayOptions> = {
  placement: 'bottom-start',
  offset: 4,
  flip: true,
  shift: true,
  matchWidth: false,
  minAnchorWidth: false,
  strategy: 'absolute'
}

interface WidthStyleState {
  hasManagedStyles: boolean
}

function readOverlayMinWidth(overlay: HTMLElement): number {
  if (typeof getComputedStyle !== 'function') return DEFAULT_OVERLAY_MIN_WIDTH

  const minWidth = Number.parseFloat(getComputedStyle(overlay).getPropertyValue(OVERLAY_MIN_WIDTH_VARIABLE))
  return Number.isFinite(minWidth) ? minWidth : DEFAULT_OVERLAY_MIN_WIDTH
}

function clearManagedWidthStyles(overlay: HTMLElement) {
  overlay.style.removeProperty('width')
  overlay.style.removeProperty('min-width')
}

function createWidthMiddleware(
  overlay: HTMLElement,
  options: Required<OverlayOptions>,
  widthStyles: WidthStyleState,
  positioningGeneration: OverlayPositioningGeneration,
  generation: number
): Middleware | undefined {
  const isCurrentGeneration = () => positioningGeneration.isCurrent(generation)
  if (options.matchWidth) {
    // matchWidth 必须移除之前 minAnchorWidth 写入的 min-width，才能精确跟随 trigger。
    overlay.style.removeProperty('min-width')
    widthStyles.hasManagedStyles = true
    return size({
      apply({ rects }) {
        if (!isCurrentGeneration()) return
        overlay.style.width = `${rects.reference.width}px`
      }
    })
  }

  if (options.minAnchorWidth) {
    const minWidth = readOverlayMinWidth(overlay)
    widthStyles.hasManagedStyles = true
    return size({
      apply({ rects }) {
        if (!isCurrentGeneration()) return
        // max-content 让内容决定宽度，min-width 再提供 trigger 与 floor 两个下限。
        overlay.style.width = 'max-content'
        overlay.style.minWidth = `${Math.max(rects.reference.width, minWidth)}px`
      }
    })
  }

  if (widthStyles.hasManagedStyles) {
    clearManagedWidthStyles(overlay)
    widthStyles.hasManagedStyles = false
  }

  return undefined
}

function createPositioningMiddleware(
  overlay: HTMLElement,
  options: Required<OverlayOptions>,
  widthStyles: WidthStyleState,
  positioningGeneration: OverlayPositioningGeneration,
  generation: number
): Middleware[] {
  const middleware: Middleware[] = [offset(options.offset)]
  if (options.flip) middleware.push(flip())
  if (options.shift) middleware.push(shift({ padding: 8 }))

  const widthMiddleware = createWidthMiddleware(overlay, options, widthStyles, positioningGeneration, generation)
  if (widthMiddleware) middleware.push(widthMiddleware)

  return middleware
}

function getTransformOrigin(placement: Placement): string {
  const [side, alignment] = placement.split('-')
  const horizontalOrigin = alignment === 'start' ? 'left' : alignment === 'end' ? 'right' : 'center'
  const verticalOrigin = alignment === 'start' ? 'top' : alignment === 'end' ? 'bottom' : 'center'

  if (side === 'top') return `bottom ${horizontalOrigin}`
  if (side === 'bottom') return `top ${horizontalOrigin}`
  if (side === 'left') return `right ${verticalOrigin}`
  return `left ${verticalOrigin}`
}

export const defineOverlay = () =>
  definePlugin<OverlayApi, { anchor: OverlayAnchor; overlay: HTMLElement } & OverlayOptions>(ctx => {
    const options: Required<OverlayOptions> = {
      placement: ctx.placement ?? DEFAULT_OPTIONS.placement,
      offset: ctx.offset ?? DEFAULT_OPTIONS.offset,
      flip: ctx.flip ?? DEFAULT_OPTIONS.flip,
      shift: ctx.shift ?? DEFAULT_OPTIONS.shift,
      matchWidth: ctx.matchWidth ?? DEFAULT_OPTIONS.matchWidth,
      minAnchorWidth: ctx.minAnchorWidth ?? DEFAULT_OPTIONS.minAnchorWidth,
      strategy: ctx.strategy ?? DEFAULT_OPTIONS.strategy
    }

    const overlay = ctx.overlay
    const widthStyles: WidthStyleState = { hasManagedStyles: false }
    let isOpen = false
    let cleanupAutoUpdate: (() => void) | null = null
    let currentAnchor = ctx.anchor
    // 每次刷新都是新定位代；open 期间 autoUpdate 的多次回调属于同一代。
    // reposition/close 会让上一代 promise 失效，避免乱序完成覆盖最新坐标。
    const positioningGeneration = defineOverlayPositioningGeneration().make()

    function updatePosition() {
      const generation = positioningGeneration.next()
      const middleware = createPositioningMiddleware(overlay, options, widthStyles, positioningGeneration, generation)

      const applyPosition = () => {
        void computePosition(currentAnchor, overlay, {
          placement: options.placement,
          strategy: options.strategy,
          middleware
        }).then(({ x, y, placement }) => {
          if (!positioningGeneration.isCurrent(generation) || !isOpen) return
          overlay.style.left = `${x}px`
          overlay.style.top = `${y}px`
          overlay.style.setProperty('--wui-internal-overlay-transform-origin', getTransformOrigin(placement))
        })
      }

      // 立即定位一次，避免浮层首帧出现在左上角；autoUpdate 负责后续滚动/尺寸变化。
      applyPosition()
      cleanupAutoUpdate?.()
      cleanupAutoUpdate = autoUpdate(currentAnchor, overlay, applyPosition)
    }

    return {
      isOpen() {
        return isOpen
      },
      options,

      open() {
        if (isOpen) return
        isOpen = true
        overlay.style.display = ''
        updatePosition()
      },

      close() {
        if (!isOpen) return
        isOpen = false
        positioningGeneration.invalidate()
        cleanupAutoUpdate?.()
        cleanupAutoUpdate = null
      },

      toggle() {
        if (isOpen) this.close()
        else this.open()
      },

      update(nextOptions) {
        Object.assign(options, nextOptions)
        if (isOpen) updatePosition()
      },

      updateAnchor(newAnchor: OverlayAnchor) {
        currentAnchor = newAnchor
        if (isOpen) updatePosition()
      },

      dispose() {
        this.close()
      }
    }
  })
