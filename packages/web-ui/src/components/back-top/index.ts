import 'iconify-icon'
import '@/components/button'

import { getRootScrollTop } from '@mono/utils-browser'
import { css, html, LitElement, type PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

@customElement('web-ui-back-top')
export class WebUiBackTop extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      width: max-content;
      z-index: var(--web-ui-back-top-z-index, auto);
      top: var(--web-ui-back-top-top, auto);
      right: var(--web-ui-back-top-right, 20px);
      bottom: var(--web-ui-back-top-bottom, 20px);
      left: var(--web-ui-back-top-left, auto);

      transition: all 0.3s ease-out;
      opacity: 0;
      transform: scale(0);
      visibility: hidden;
      pointer-events: none;
    }

    :host([visible]) {
      opacity: 1;
      transform: scale(1);
      visibility: visible;
      pointer-events: auto;
    }
  `

  @property({ type: Boolean, reflect: true }) smooth = true
  @property({ type: Number, reflect: true }) threshold: number = 200
  @property({ type: Boolean, reflect: true }) visible = false
  @property({ type: Object, attribute: false }) scrollTarget: HTMLElement | Window = window

  @state() private eventController?: AbortController

  connectedCallback() {
    super.connectedCallback()
    this.computeVisible()
    this.onScrollTarget()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.eventController?.abort()
  }

  protected willUpdate(props: PropertyValues) {
    super.willUpdate(props)

    if (props.has('threshold') || props.has('scrollTarget')) {
      this.computeVisible()
    }
    //避免首次与 connectedCallback 重复触发
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

  render() {
    return html`
      <div role="button" tabindex="0" @click=${this.toTop} @keydown=${this.onEnter}>
        <slot>
          <!-- 默认 slot 加上 tabindex="-1"，防止双重 focus -->
          <web-ui-button tabindex="-1" icon>
            <iconify-icon icon="octicon:move-to-top-16" width="16" height="16"></iconify-icon>
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
