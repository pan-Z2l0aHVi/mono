import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// web-ui-button 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/button'
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
