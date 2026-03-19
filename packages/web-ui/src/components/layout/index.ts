import { css, html, LitElement, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static styles = css`
    ${unsafeCSS(style)}
  `

  render() {
    return html`
      <header>
        <slot name="header"></slot>
      </header>
      <main>
        <slot></slot>
      </main>
      <aside>
        <div class="menu"><slot name="sidebar"></slot></div>
      </aside>
      <footer>
        <slot name="tabbar"></slot>
      </footer>
    `
  }
}
