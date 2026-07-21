import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// web-ui-button 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/button'
import glass from '@/assets/glass.css?inline'

import style from './style.css?inline'

@customElement('web-ui-button-group')
export class WebUiButtonGroup extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal'

  override updated() {
    this.syncChildButtons()
  }

  private syncChildButtons() {
    const buttons = this.querySelectorAll<HTMLElement & { variant: string }>('web-ui-button')
    const isVertical = this.orientation === 'vertical'
    for (const [i, btn] of [...buttons].entries()) {
      if (!btn.hasAttribute('group')) btn.setAttribute('group', '')
      btn.variant = 'glass'
      btn.style.setProperty('--wui-button-size', '32px')
      btn.setAttribute('orientation', isVertical ? 'vertical' : 'horizontal')
      const isLast = i === buttons.length - 1
      btn.toggleAttribute('last', isLast)
      btn.style.setProperty('--wui-button-divider-width', isLast ? '0px' : '1px')
    }
  }

  override render() {
    return html`
      <div class="wui-glass wui-glass-no-after wui-button-group-inner">
        <slot></slot>
      </div>
    `
  }
}

export interface WebUiButtonGroup {
  readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button-group': WebUiButtonGroup
  }
}
