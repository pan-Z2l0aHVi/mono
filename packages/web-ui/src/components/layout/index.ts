import { html, LitElement, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'

import style from './style.css?inline'

@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  override render() {
    return html`
      <header>
        <slot name="header"></slot>
      </header>
      <main>
        <slot></slot>
      </main>
      <aside>
        <div class="menu wui-glass"><slot name="sidebar"></slot></div>
      </aside>
      <footer>
        <slot name="tabbar"></slot>
      </footer>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-layout': WebUiLayout
  }
}
