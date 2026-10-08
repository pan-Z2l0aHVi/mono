import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { oouiClose } from '@/icons'
import { UserChangeController } from '@/shared/events/user-change'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-dialog')
export class WebUiDialog extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) closable = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  @property({ type: Boolean, reflect: true, attribute: 'no-backdrop-close' }) noBackdropClose = false
  @property({ type: Boolean, reflect: true, attribute: 'no-escape-close' }) noEscapeClose = false

  /**
   * Controlled 模式下，Escape 和遮罩点击只派发 `open-change` 请求，
   * 不会自行修改 `open`。Consumer 回写 `open` 后才执行关闭动画。
   * 程序化 API（showModal/close/直接赋值 open）不受此模式影响，始终直通。
   */
  @property({ type: Boolean, reflect: true }) controlled = false

  /**
   * `header` 槽为空时的标题文案。槽优先：一旦有元素分配到 `header`，槽内容整条接管，
   * 属性被忽略。默认空串且槽也为空时不渲染 chrome 带。`headless` 模式不渲染 chrome 带，
   * `heading` 一并失效。
   */
  @property({ type: String }) heading = ''

  /**
   * Headless 模式：只保留 overlay 基础设施（backdrop、动画、scroll lock、`<dialog>` 语义），
   * 移除内置 UI（chrome 带、正文区、footer），默认槽的内容渲染进卡片内的滚动层
   * `.wui-dialog-content`，视觉交给 Consumer。形态与 `<web-ui-drawer>` 的 `headless` 一致。
   *
   * 该模式没有可自动关联的内置标题，内部原生 dialog 的 accessible name 必须由 Consumer
   * 用 `dialog-label`（或自绘标题 + 自己的 `aria-labelledby`）提供。
   */
  @property({ type: Boolean, reflect: true }) headless = false

  /**
   * 内部原生 dialog 的 accessible name。`headless` 模式必须由 Consumer 提供，
   * 因为该模式不会渲染可自动关联的内置 chrome 带。
   */
  @property({ type: String, attribute: 'dialog-label' }) dialogLabel = ''

  @state() private _hasHeader = false
  private readonly _userOpenChange = new UserChangeController()

  /*
   * 开启态浮层（issue #120 Block 1）。dialog 的 Escape 原本只走原生 cancel 事件：仲裁者
   * 会在 keydown 上 preventDefault 压掉原生关闭请求并 stopPropagation，因此这里必须
   * 自己表达关闭语义（controlled 只派发请求）。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._closeFromUser(),
    isConnected: () => this.isConnected
  })
  /** 当前开启会话的句柄；未开启时为 null。查询与惰性同步走它。 */
  private _handle: OpenOverlayHandle | null = null
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this.open
  })

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('open')) {
      if (this._userOpenChange.consume()) this.emitOpenChange()
      this._presence.sync(this.open)
      if (this.open) {
        // presence.sync 内的 showModal() 把 dialog 提升进 top layer。双击手势本身
        // 留下的活选区会被浏览器拿去和提升后的新布局重新解析，结果选区落到刚挂载的
        // dialog 正文上。脆弱的是「手势来源的活选区」，不是 dblclick 的判定窗口：把
        // 打开推迟 250ms（早过双击判定）仍然复现。选区由浏览器在 showModal() 调用
        // 内部生成：脚本没有任何 Selection API 调用，在 dblclick 上 preventDefault
        // 也拦不住。
        //
        // 实测（Chromium）showModal() 不会动打开前已经存在的选区，所以这一次清理
        // 同时也覆盖「先选中页面文本、再打开」的情况——modal 打开后被选中的内容挡在
        // 遮罩后面本来也已不可用。这里只清文档选区，不动 user-select，浮层内正文
        // 仍可正常拖选。
        window.getSelection()?.removeAllRanges()
      }
      // 原生 dialog 登记为开启态浮层：挂在它上面的 portal 面板成为本层后代，
      // Escape 仲裁据此判出最内层（issue #120 Block 1）。
      const dialog = this.dialog
      if (dialog) {
        if (this.open) {
          // 同一面板重新 claim = 新的一次开启：旧会话（含其子层）整体作废。
          this._handle?.release()
          this._handle = this._overlay.claim(dialog, { ancestryFrom: this })
        } else {
          this._handle?.release()
          this._handle = null
        }
      }
    }
    if (props.has('open') || props.has('noScrollLock')) this._syncScrollLock()
    this._syncOverlayInert()
  }

  override connectedCallback() {
    super.connectedCallback()
    // 重挂载对账：断连时 presence、滚动锁与登记都已被撤销，而 `open` 未变化时
    // `updated()` 不会补跑任何 sync 分支。首次连接时 shadow 尚未渲染、`this.dialog`
    // 为 null，三种情况都直接跳过；打开态的首次进入仍由 updated() 的
    // `props.has('open')` 分支处理。
    this._presence.reconcile()
    this._syncScrollLock()
    this._reclaimIfOpen()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._presence.dispose()
    this._scrollLock.release()
    // 断连即撤销登记：层不留在全局注册表里，重连后由 _reclaimIfOpen 显式重新声明。
    this._handle?.release()
    this._handle = null
  }

  /*
   * 「重挂载恢复」的调用方一半：模块刻意不观察 DOM 连接状态，所以断连撤销登记之后，
   * 重连时仍有开启态就必须由组件重新声明。
   */
  private _reclaimIfOpen() {
    if (!this.open || this._handle) return
    const dialog = this.dialog
    if (!dialog) return
    this._handle = this._overlay.claim(dialog, { ancestryFrom: this })
    this._syncOverlayInert()
  }

  /*
   * `no-escape-close` 时 dialog 仍是候选（Escape 被吞掉、原生 cancel 被压掉），只是
   * 不走关闭入口。与旧的「跳过候选」语义不同：旧语义放任事件落到下层浮层，把外层
   * 一起关掉。该属性可在开启期间改写，所以每次渲染后读它，而不是在 claim 时固定。
   */
  private _syncOverlayInert() {
    this._handle?.setInert(this.noEscapeClose)
  }

  showModal() {
    if (this.open) return
    this.open = true
  }

  close() {
    this.open = false
  }

  /*
   * 仲裁者在 capture 阶段 preventDefault 了 Escape 的 keydown，UA 因此不再派发原生
   * cancel，但本 handler 仍有两个仲裁者不负责的职责，**不可删**：
   * ① 任何到达 dialog 的 cancel 都要 preventDefault，把 top layer 保留到视觉退场结束
   *    （否则原生关闭会跳过退出动画）；
   * ② 忽略子控件（例如 file input）冒泡上来的 cancel。
   * 实测（overlay-open-owner-260918，2026-09-18）摘掉 `@cancel` 后 dialog.browser.spec.ts
   * 的「no-escape-close 存在时 Escape/cancel 不关闭对话框」与 remount-reconcile 的
   * 「打开态被移出文档再接回」两例立刻转红，断言正是 `dispatchEvent(cancel) === false`。
   */
  private handleCancel(e: Event) {
    if (e.target !== e.currentTarget) return

    e.preventDefault()
    if (this.noEscapeClose) return
    this._closeFromUser()
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
    if (this.noBackdropClose) return
    this._closeFromUser()
  }

  /** 用户发起的关闭入口（Escape、遮罩点击、关闭按钮）共用一条路径。 */
  private readonly _closeFromUser = () => {
    if (this.controlled) {
      this.emitOpenChange(false)
      return
    }
    this._userOpenChange.mark()
    this.close()
  }

  // controlled 下派发关闭请求：detail 固定 false（用户只能请求关闭，打开永远由 Consumer 写）。
  private emitOpenChange(open = this.open) {
    dispatchOpenChangeEvent(this, open)
  }

  private _onTransitionEnd = (event: TransitionEvent) => {
    this._presence.handleTransitionEnd(event)
  }

  private _onNativeClose = () => {
    // 关闭态下的 close 事件只可能是我们自己 finishClosing 排队的异步事件（或冗余的
    // 外部关闭）：交给 presence 消费 self-close 标志，避免标志泄漏到下一次真实关闭。
    if (!this.open) {
      this._presence.handleNativeClose()
      return
    }

    // 我们自己 dialog.close() 排队的 close 事件是异步任务：正常时序在本关闭会话内
    // 到达，快速「关闭→重开」时它在重新打开之后才到达（过期事件）。两种情况都已
    // 完成清理，由 presence 消费并返回 true，不能当成外部关闭把刚重开的 dialog 关掉。
    if (this._presence.handleNativeClose()) return

    // controlled 下原生关闭（如表单 method="dialog"）视为未经 Consumer 批准的状态丢失：
    // 恢复受控状态并派发关闭请求，由 Consumer 决定是否关闭。
    if (this.controlled) {
      this._presence.sync(true)
      this.emitOpenChange(false)
      return
    }

    this._userOpenChange.mark()
    this.open = false
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  /**
   * 只在「有/无」翻转时写 state：slotchange 在每次分配变化时都会触发，逐次赋值会让
   * Lit 无谓重渲染。`heading` 与槽共同决定 chrome 带的存在，见 `_showHeader`。
   */
  private _onHeaderSlotChange(e: Event) {
    if (!(e.target instanceof HTMLSlotElement)) return
    const has = e.target.assignedElements().length > 0
    if (has !== this._hasHeader) this._hasHeader = has
  }

  private get _showHeader(): boolean {
    return this._hasHeader || this.heading !== ''
  }

  /**
   * 默认模式与 `headless` 模式共用同一枚关闭按钮：都绝对定位到卡片右上角，偏移由
   * `--wui-dialog-close-top` / `--wui-dialog-close-right` 控制（见 style.css）。
   * 它在两种模式下都是卡片的直接子元素，定位参照是卡片本身（.wui-dialog-body）。
   */
  private _renderCloseButton() {
    return html`
      <web-ui-button
        class="wui-dialog-close"
        @click=${this._closeFromUser}
        aria-label="关闭"
        variant="secondary"
        icon
        size="26"
      >
        <web-ui-icon size="14" .icon=${oouiClose}></web-ui-icon>
      </web-ui-button>
    `
  }

  override render() {
    const showHeader = this._showHeader
    /*
     * accessible name：显式 `dialog-label` 优先；否则（非 headless 且带可见时）把原生 dialog
     * 的 `aria-labelledby` 指向 chrome 带——与 drawer 同形。headless 模式没有可自动关联的
     * 内置标题，名字留给 Consumer。
     */
    const dialogLabel = this.dialogLabel.trim()
    const dialogLabelledBy = !dialogLabel && !this.headless && showHeader ? 'wui-dialog-heading' : nothing

    return html`
      <dialog
        aria-label=${dialogLabel || nothing}
        aria-labelledby=${dialogLabelledBy}
        @cancel=${this.handleCancel}
        @close=${this._onNativeClose}
        @click=${this.handleBackdropClick}
        @transitionend=${this._onTransitionEnd}
      >
        <div class="wui-dialog-body wui-glass">
          ${
            this.headless
              ? html`
                  <div class="wui-dialog-content">
                    <slot></slot>
                  </div>
                  ${this.closable ? this._renderCloseButton() : nothing}
                `
              : html`
                  <div class="header" id="wui-dialog-heading" ?hidden=${!showHeader}>
                    <slot name="header" @slotchange=${this._onHeaderSlotChange}>
                      ${this.heading ? html`<span class="wui-dialog-heading">${this.heading}</span>` : nothing}
                    </slot>
                  </div>
                  <div class="desc"><slot></slot></div>
                  <div class="wui-dialog-footer"><slot name="footer"></slot></div>
                  ${this.closable ? this._renderCloseButton() : nothing}
                `
          }
        </div>
      </dialog>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dialog': WebUiDialog
  }
}
