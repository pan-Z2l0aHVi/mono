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

export interface OverlayOptions {
  placement?: Placement
  offset?: number
  flip?: boolean
  shift?: boolean
  // Sync overlay width to anchor width
  matchWidth?: boolean
  // Set overlay min-width to anchor width (content can expand wider)
  minAnchorWidth?: boolean
  strategy?: Strategy
}

export interface OverlayApi {
  isOpen(): boolean
  readonly options: Required<OverlayOptions>
  open(): void
  close(): void
  toggle(): void
  update(options: Partial<OverlayOptions>): void
  updateAnchor(anchor: HTMLElement): void
  dispose(): void
}

const DEFAULT_OPTIONS: Required<OverlayOptions> = {
  placement: 'bottom-start',
  offset: 4,
  flip: true,
  shift: true,
  matchWidth: false,
  minAnchorWidth: false,
  strategy: 'absolute'
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
  definePlugin<OverlayApi, { anchor: HTMLElement; overlay: HTMLElement } & OverlayOptions>(ctx => {
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
    let isOpen = false
    let cleanup: (() => void) | null = null
    let anchor = ctx.anchor

    function updatePosition() {
      const middleware: Middleware[] = [offset(options.offset)]
      if (options.flip) middleware.push(flip())
      if (options.shift) middleware.push(shift({ padding: 8 }))
      if (options.matchWidth) {
        middleware.push(
          size({
            apply({ rects }) {
              overlay.style.width = `${rects.reference.width}px`
            }
          })
        )
      } else if (options.minAnchorWidth) {
        middleware.push(
          size({
            apply({ rects }) {
              overlay.style.minWidth = `${Math.max(rects.reference.width, 120)}px`
            }
          })
        )
      }

      cleanup?.()
      cleanup = autoUpdate(anchor, overlay, () => {
        void computePosition(anchor, overlay, {
          placement: options.placement,
          strategy: options.strategy,
          middleware
        }).then(({ x, y, placement }) => {
          overlay.style.left = `${x}px`
          overlay.style.top = `${y}px`
          overlay.style.setProperty('--wui-overlay-transform-origin', getTransformOrigin(placement))
        })
      })
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
        cleanup?.()
        cleanup = null
      },

      toggle() {
        if (isOpen) this.close()
        else this.open()
      },

      update(nextOptions) {
        Object.assign(options, nextOptions)
        if (isOpen) updatePosition()
      },

      updateAnchor(newAnchor: HTMLElement) {
        anchor = newAnchor
        if (isOpen) updatePosition()
      },

      dispose() {
        this.close()
      }
    }
  })
