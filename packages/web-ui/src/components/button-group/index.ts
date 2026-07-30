import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// web-ui-button 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { normalizeLiteral } from '@/shared/normalize'

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

  override updated() {
    this.syncChildButtons()
  }

  private syncChildButtons() {
    const buttons = this.querySelectorAll<HTMLElement & { variant: string }>('web-ui-button')
    const isVertical = this.direction === 'vertical'
    for (const [i, btn] of [...buttons].entries()) {
      if (!btn.hasAttribute('group')) btn.setAttribute('group', '')
      btn.variant = 'glass'
      btn.style.setProperty('--wui-button-size', '32px')
      btn.setAttribute('direction', isVertical ? 'vertical' : 'horizontal')
      const isLast = i === buttons.length - 1
      btn.toggleAttribute('last', isLast)
      btn.style.setProperty('--wui-button-divider-width', isLast ? '0px' : '1px')
    }
  }

  override render() {
    return html`
      <div class="wui-glass wui-button-group-inner">
        <slot></slot>
      </div>
    `
  }

  declare readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button-group': WebUiButtonGroup
  }
}
