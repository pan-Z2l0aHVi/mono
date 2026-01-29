import { css, html, LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static styles = css`
    :host {
      display: grid;
      min-height: 100vh;
      min-height: 100dvh;

      grid-template-columns: var(--web-ui-base-layout-sidebar-width, 240px) 1fr;
      grid-template-rows: var(--web-ui-base-layout-header-height, 64px) 1fr;
      grid-template-areas:
        'sidebar header'
        'sidebar content';

      box-sizing: border-box;
      * {
        box-sizing: inherit;
      }
    }

    header {
      grid-area: header;
      position: sticky;
      top: 0;
      right: 0;
    }

    main {
      grid-area: content;
    }

    aside {
      grid-area: sidebar;
      position: sticky;
      left: 0;
      top: 0;
      height: 100vh;
      height: 100dvh;
      padding: 8px;

      .menu {
        height: 100%;
        border-radius: 16px;
        background-color: var(--web-ui-base-layout-bg, #f5f5f5);
        box-shadow: 2px 4px 32px rgba(0, 0, 0, 0.2);
      }
    }

    footer {
      grid-area: footer;
    }
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
