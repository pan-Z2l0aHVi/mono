import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import glass from '@/assets/glass.css?inline'
import '@/components/icon'
import '@/components/button'
import { radixIconsPanelLeftMinimized } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @state() private _sidebarOpen = false

  private _toggleSidebar() {
    this._sidebarOpen = !this._sidebarOpen
  }

  private _closeSidebar() {
    this._sidebarOpen = false
  }

  private _onSidebarClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('a, button, [role="button"]')) {
      this._closeSidebar()
    }
  }

  override render() {
    return html`
      <div class="layout-grid">
        <header>
          <slot name="header"></slot>
        </header>
        <main>
          <slot></slot>
        </main>
        <aside class="${classMap({ open: this._sidebarOpen })}" @click="${this._onSidebarClick}">
          <div class="menu wui-glass"><slot name="sidebar"></slot></div>
        </aside>
        <footer>
          <slot name="tabbar"></slot>
        </footer>
      </div>

      <div class="${classMap({ backdrop: true, open: this._sidebarOpen })}" @click="${this._closeSidebar}"></div>

      <web-ui-button
        class="mobile-toggle"
        icon
        variant="glass"
        @click="${this._toggleSidebar}"
        aria-label="打开导航菜单"
      >
        <web-ui-icon .icon=${radixIconsPanelLeftMinimized}></web-ui-icon>
      </web-ui-button>
    `
  }

  declare readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-layout': WebUiLayout
  }
}
