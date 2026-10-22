import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import {
  buttonGroupContextKey,
  defineGroupPresentation,
  GroupController,
  type ButtonGroupContext
} from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'

import type { WebUiButton } from '../button'

import style from './style.css?inline'

const ALLOWED_DIRECTIONS = ['horizontal', 'vertical'] as const

@customElement('web-ui-button-group')
export class WebUiButtonGroup extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true })
  get direction(): 'horizontal' | 'vertical' {
    return this._direction
  }
  set direction(v: string) {
    const old = this._direction
    this._direction = normalizeLiteral(v, ALLOWED_DIRECTIONS, 'horizontal')
    this.requestUpdate('direction', old)
  }
  private _direction: 'horizontal' | 'vertical' = 'horizontal'

  private readonly _groupController = new GroupController(
    this,
    defineGroupPresentation<WebUiButton, ButtonGroupContext>({
      host: this,
      context: buttonGroupContextKey,
      getItems: () => [...this.querySelectorAll<WebUiButton>('web-ui-button')],
      getContext: (_, index, buttons) => ({
        direction: this.direction,
        isLast: index === buttons.length - 1
      })
    }).make()
  )

  private _trackResizeObserver: ResizeObserver | null = null

  override connectedCallback(): void {
    super.connectedCallback()
    void this.updateComplete.then(() => {
      if (!this.isConnected || typeof ResizeObserver === 'undefined') return

      const track = this.renderRoot.querySelector<HTMLElement>('.wui-button-group-inner')
      if (!track) return

      this._trackResizeObserver ??= new ResizeObserver(() => {
        // 读取未变换的布局尺寸，避免 dialog 进退场缩放污染玻璃圆角。
        const { width, height } = getComputedStyle(track)
        const cornerRadius = Math.min(Number.parseFloat(width), Number.parseFloat(height)) / 2
        // max-content 垂直轨道的短边会随成员内容变化，玻璃角点渐变需要同步跟随。
        track.style.setProperty('--wui-glass-corner-radius', `${cornerRadius}px`)
      })
      this._trackResizeObserver.observe(track, { box: 'border-box' })
    })
  }

  override disconnectedCallback(): void {
    this._trackResizeObserver?.disconnect()
    super.disconnectedCallback()
  }

  override render() {
    return html`
      <div class="wui-glass wui-button-group-inner">
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button-group': WebUiButtonGroup
  }
}
