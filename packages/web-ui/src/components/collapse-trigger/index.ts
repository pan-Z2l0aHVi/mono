import { html, LitElement, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import type { CollapseContext } from '@/components/collapse'
import { defineGroupManaged } from '@/shared/group-management'

import style from './style.css?inline'

@customElement('web-ui-collapse-trigger')
export class WebUiCollapseTrigger extends LitElement {
  static override styles = unsafeCSS(style)

  private readonly _collapseManaged = defineGroupManaged<CollapseContext>(this, {
    requestUpdate: () => this.requestUpdate(),
    equals: (a, b) => a?.open === b?.open && a?.disabled === b?.disabled && a?.contentId === b?.contentId
  }).make()

  private get _context(): CollapseContext | undefined {
    return this._collapseManaged.getContext()
  }

  private get _isDisabled(): boolean {
    return this._context?.disabled === true
  }

  override render() {
    const context = this._context
    const isOpen = context?.open === true

    // 内部真实 button：Enter/Space、焦点与 disabled 语义全部原生；
    // 点击由根元素经 composed path 识别处理，这里只负责投影与语义。
    return html`
      <button
        type="button"
        class=${classMap({ 'wui-collapse-trigger': true, 'is-open': isOpen })}
        aria-expanded=${String(isOpen)}
        aria-controls=${ifDefined(context?.contentId ?? undefined)}
        ?disabled=${this._isDisabled}
      >
        <slot></slot>
      </button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-collapse-trigger': WebUiCollapseTrigger
  }
}
