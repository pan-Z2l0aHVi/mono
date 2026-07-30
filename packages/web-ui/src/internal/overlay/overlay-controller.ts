import { computePosition, autoUpdate, flip, shift, offset, type Placement } from '@floating-ui/dom'

export interface OverlayOptions {
  placement?: Placement
  offset?: number
  flip?: boolean
  shift?: boolean
}

const DEFAULT_OPTIONS: Required<OverlayOptions> = {
  placement: 'bottom-start',
  offset: 4,
  flip: true,
  shift: true
}

export class OverlayController {
  private _isOpen = false
  private _cleanup: (() => void) | null = null
  private _options: Required<OverlayOptions>

  constructor(
    private _anchor: HTMLElement,
    private _overlay: HTMLElement,
    options: OverlayOptions = {}
  ) {
    this._options = { ...DEFAULT_OPTIONS, ...options }
  }

  get isOpen(): boolean {
    return this._isOpen
  }

  get options(): Required<OverlayOptions> {
    return this._options
  }

  open() {
    if (this._isOpen) return
    this._isOpen = true
    this._overlay.style.display = ''
    this._updatePosition()
  }

  close() {
    if (!this._isOpen) return
    this._isOpen = false
    this._cleanup?.()
    this._cleanup = null
  }

  toggle() {
    if (this._isOpen) this.close()
    else this.open()
  }

  updateAnchor(anchor: HTMLElement) {
    this._anchor = anchor
    if (this._isOpen) this._updatePosition()
  }

  dispose() {
    this.close()
  }

  private _updatePosition() {
    const { placement, offset: offsetDist, flip: doFlip, shift: doShift } = this._options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const middleware: any[] = []

    middleware.push(offset(offsetDist))
    if (doFlip) middleware.push(flip())
    if (doShift) middleware.push(shift({ padding: 8 }))

    this._cleanup = autoUpdate(this._anchor, this._overlay, () => {
      void computePosition(this._anchor, this._overlay, {
        placement,
        middleware
      }).then(({ x, y }) => {
        this._overlay.style.left = `${x}px`
        this._overlay.style.top = `${y}px`
      })
    })
  }
}
