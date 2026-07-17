import { getRootScrollTop } from '@greypan/browser-kit'
import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import '@/components/button'
import { lucideArrowUpToLine } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-back-top')
export class WebUiBackTop extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) smooth = true
  @property({ type: Number, reflect: true }) threshold: number = 200
  @property({ type: Boolean, reflect: true }) visible = false
  @property({ type: Object, attribute: false }) scrollTarget: HTMLElement | Window = window

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
    if (!this.scrollTarget) {
      return window
    }
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
      {
        signal: this.eventController.signal,
        passive: true
      }
    )
  }

  private computeVisible() {
    const { target } = this
    let nextVisible: boolean
    if (target === window) {
      nextVisible = getRootScrollTop() >= this.threshold
    } else if (target instanceof HTMLElement) {
      nextVisible = target.scrollTop >= this.threshold
    } else {
      throw new Error('Prop scrollTarget must be HTMLElement or Window.')
    }
    if (nextVisible !== this.visible) {
      this.visible = nextVisible
      this.dispatchEvent(
        new CustomEvent('visible-change', {
          detail: { visible: nextVisible },
          bubbles: true,
          composed: true
        })
      )
    }
  }

  toTop() {
    this.target.scrollTo({
      top: 0,
      behavior: this.smooth ? 'smooth' : 'auto'
    })
  }

  private onEnter(e: KeyboardEvent) {
    if ((e as KeyboardEvent).key == 'Enter') {
      e.preventDefault()
      this.toTop()
    }
  }

  override render() {
    return html`
      <div role="button" tabindex="0" @click=${this.toTop} @keydown=${this.onEnter}>
        <slot>
          <!-- 默认 slot 加上 tabindex="-1"，防止双重 focus -->
          <web-ui-button tabindex="-1" icon>
            <web-ui-icon .icon=${lucideArrowUpToLine}></web-ui-icon>
          </web-ui-button>
        </slot>
      </div>
    `
  }
}

export interface WebUiBackTop {
  readonly $events: {
    'visible-change': CustomEvent<{ visible: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-back-top': WebUiBackTop
  }
}
