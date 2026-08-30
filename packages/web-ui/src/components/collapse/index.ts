import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// 家族子元素随根元素注册；trigger 类引用用于在 composed path 中识别点击来源。
import '@/components/collapse-content'
import type { WebUiCollapseContent } from '@/components/collapse-content'
import { WebUiCollapseTrigger } from '@/components/collapse-trigger'
import { UserChangeController } from '@/shared/events/user-change'
import { defineGroupPresentation, GroupController } from '@/shared/group-management'

import style from './style.css?inline'

/** 根元素推送给 collapse-trigger 的关联上下文。 */
export interface CollapseContext {
  readonly open: boolean
  readonly disabled: boolean
  /** 关联 web-ui-collapse-content 的 id；尚无已升级的 content 时为 null。 */
  readonly contentId: string | null
}

/** 根元素推送给 web-ui-collapse-content 的关联上下文。 */
export interface CollapseContentContext {
  readonly open: boolean
  readonly horizontal: boolean
}

@customElement('web-ui-collapse')
export class WebUiCollapse extends LitElement {
  static override styles = unsafeCSS(style)

  /** 展开状态；严格受控，唯一状态源。 */
  @property({ type: Boolean, reflect: true }) open = false

  /** 禁用触发器；已展开的内容保持现状。 */
  @property({ type: Boolean, reflect: true }) disabled = false

  /** 水平方向：true 时沿宽度展开，默认沿高度。 */
  @property({ type: Boolean, reflect: true }) horizontal = false

  private readonly _userOpenChange = new UserChangeController()

  private readonly _triggerPresentation = defineGroupPresentation<WebUiCollapseTrigger, CollapseContext>({
    // closest 过滤：嵌套 collapse 的子元素归属内层根，不得被外层根管理。
    getItems: () =>
      [...this.querySelectorAll<WebUiCollapseTrigger>('web-ui-collapse-trigger')].filter(
        item => item.closest('web-ui-collapse') === this
      ),
    getContext: () => ({
      open: this.open,
      disabled: this.disabled,
      contentId: this._contentId
    })
  }).make()

  private readonly _contentPresentation = defineGroupPresentation<WebUiCollapseContent, CollapseContentContext>({
    getItems: () =>
      [...this.querySelectorAll<WebUiCollapseContent>('web-ui-collapse-content')].filter(
        item => item.closest('web-ui-collapse') === this
      ),
    getContext: () => ({ open: this.open, horizontal: this.horizontal })
  }).make()

  private readonly _groupController = new GroupController(this, {
    sync: () => {
      const triggersChanged = this._triggerPresentation.sync()
      const contentsChanged = this._contentPresentation.sync()
      return triggersChanged || contentsChanged
    },
    disconnect: () => {
      this._triggerPresentation.disconnect()
      this._contentPresentation.disconnect()
    }
  })

  /** 当前关联的第一个 content 的 id（供 trigger 的 aria-controls）。 */
  private get _contentId(): string | null {
    return this._familyContents()[0]?.id || null
  }

  private _familyContents(): WebUiCollapseContent[] {
    return [...this.querySelectorAll<WebUiCollapseContent>('web-ui-collapse-content')].filter(
      item => item.closest('web-ui-collapse') === this
    )
  }

  // 打开 collapse
  show() {
    if (this.open) return
    this.open = true
  }

  // 关闭 collapse
  close() {
    if (!this.open) return
    this.open = false
  }

  // 切换 collapse
  toggle() {
    if (this.open) this.close()
    else this.show()
  }

  override connectedCallback() {
    super.connectedCallback()
    // 根常驻（display: contents），监听器与生命周期同寿，无需 disconnected 清理。
    this.addEventListener('click', this._onTriggerClick)
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('open') && this._userOpenChange.consume()) this._dispatchChange(this.open)
  }

  // trigger 内部 button 的 click 经 composed path 冒泡到根。只响应归属本根的
  // trigger：嵌套 collapse 的内层 trigger 会先到达内层根，外层根识别归属后忽略。
  private _onTriggerClick = (event: MouseEvent) => {
    if (this.disabled) return
    const trigger = event
      .composedPath()
      .find((node): node is WebUiCollapseTrigger => node instanceof WebUiCollapseTrigger)
    if (!trigger || trigger.closest('web-ui-collapse') !== this) return
    this._userOpenChange.mark()
    this.toggle()
  }

  private _dispatchChange(open: boolean) {
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
  }

  override render() {
    return html`<slot></slot>`
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-collapse': WebUiCollapse
  }
}
