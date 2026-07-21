import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Middleware,
  type Placement
} from '@floating-ui/dom'
import { definePlugin } from '@greypan/js-kit'

export interface OverlayOptions {
  placement?: Placement
  offset?: number
  flip?: boolean
  shift?: boolean
  /** Sync overlay width to anchor width */
  matchWidth?: boolean
}

export interface OverlayApi {
  isOpen(): boolean
  readonly options: Required<OverlayOptions>
  open(): void
  close(): void
  toggle(): void
  updateAnchor(anchor: HTMLElement): void
  dispose(): void
}

const DEFAULT_OPTIONS: Required<OverlayOptions> = {
  placement: 'bottom-start',
  offset: 4,
  flip: true,
  shift: true,
  matchWidth: false
}

export const withOverlay = definePlugin<OverlayApi, { anchor: HTMLElement; overlay: HTMLElement } & OverlayOptions>(
  ctx => {
    const options: Required<OverlayOptions> = {
      placement: ctx.placement ?? DEFAULT_OPTIONS.placement,
      offset: ctx.offset ?? DEFAULT_OPTIONS.offset,
      flip: ctx.flip ?? DEFAULT_OPTIONS.flip,
      shift: ctx.shift ?? DEFAULT_OPTIONS.shift,
      matchWidth: ctx.matchWidth ?? DEFAULT_OPTIONS.matchWidth
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
      }

      cleanup?.()
      cleanup = autoUpdate(anchor, overlay, () => {
        void computePosition(anchor, overlay, {
          placement: options.placement,
          middleware
        }).then(({ x, y }) => {
          overlay.style.left = `${x}px`
          overlay.style.top = `${y}px`
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

      updateAnchor(newAnchor: HTMLElement) {
        anchor = newAnchor
        if (isOpen) updatePosition()
      },

      dispose() {
        this.close()
      }
    }
  }
)
