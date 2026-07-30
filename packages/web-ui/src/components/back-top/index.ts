import { getRootScrollTop } from '@greypan/browser-kit'
import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/button'
import { lucideArrowUpToLine } from '@/icons'
import { normalizeNumber } from '@/shared/normalize'
import { booleanWithFalseString } from '@/shared/property-converters/boolean-with-false-string'

import style from './style.css?inline'

@customElement('web-ui-back-top')
export class WebUiBackTop extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ reflect: true, converter: booleanWithFalseString }) smooth = true
  @property({ type: Boolean, reflect: true }) visible = false
  @property({ type: Object, attribute: false }) scrollTarget: HTMLElement | Window = window

  @property({ type: Number, reflect: true })
  get threshold(): number {
    return this._threshold
  }
  set threshold(v: number) {
    const old = this._threshold
    this._threshold = normalizeNumber(v, 0, 10000, 200)
    this.requestUpdate('threshold', old)
  }
  private _threshold = 200

  @state() private eventController?: AbortController

  override connectedCallback() {
    super.connectedCallback()
    this.computeVisible()
    this.onScrollTarget()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.eventController?.abort()
  }

  protected override willUpdate(props: PropertyValues) {
    super.willUpdate(props)

    if (props.has('threshold') || props.has('scrollTarget')) {
      this.computeVisible()
    }
    if (props.has('scrollTarget') && this.hasUpdated) {
      this.onScrollTarget()
    }
  }

  private get target() {
    if (!this.scrollTarget) return window
    const isRoot =
      this.scrollTarget === window ||
      this.scrollTarget === document.documentElement ||
      this.scrollTarget === document.body
    return isRoot ? window : this.scrollTarget
  }

  private onScrollTarget() {
    this.eventController?.abort()
    this.eventController = new AbortController()

    this.target.addEventListener(
      'scroll',
      () => {
        this.computeVisible()
      },
      { signal: this.eventController.signal, passive: true }
    )
  }

  private computeVisible() {
    const target = this.target
    if (target === window) {
      this.visible = getRootScrollTop() >= this.threshold
    } else if (target instanceof HTMLElement) {
      this.visible = target.scrollTop >= this.threshold
    } else {
      throw new Error('Prop scrollTarget must be HTMLElement or Window.')
    }
  }

  toTop() {
    this.target.scrollTo({
      top: 0,
      behavior: this.smooth ? 'smooth' : 'auto'
    })
  }

  private onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.toTop()
    }
  }

  override render() {
    return html`
      <div class="back-top-inner" role="button" tabindex="0" @click=${this.toTop} @keydown=${this.onEnter}>
        <slot>
          <web-ui-button tabindex="-1" icon>
            <web-ui-icon .icon=${lucideArrowUpToLine}></web-ui-icon>
          </web-ui-button>
        </slot>
      </div>
    `
  }

  declare readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-back-top': WebUiBackTop
  }
}
