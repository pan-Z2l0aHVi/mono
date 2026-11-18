import '@/components/button'
import '@/components/icon'

import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import modalSurface from '@/assets/modal-surface.css?inline'
import scrollbarStyle from '@/assets/scrollbar.css?inline'
import glass from '@/classes/glass.css?inline'
import { oouiClose } from '@/icons'
import { ElementHeightController } from '@/shared/element-height'
import { UserChangeController } from '@/shared/events/user-change'
import { trapTabKey } from '@/shared/focus/tabbable'
import { resolveBuiltinLabel } from '@/shared/locale/builtin-labels'
import { normalizeLiteral } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineNestedDrawerLayers } from '@/shared/overlay/nested-drawer-layers'
import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import { defineDrawerDragController, getPlacementCloseSign, getPlacementDragAxis } from './drag-controller'
import { definePageShift } from './page-shift'
import style from './style.css?inline'

const ALLOWED_PLACEMENTS = ['right', 'left', 'top', 'bottom'] as const

export type DrawerPlacement = (typeof ALLOWED_PLACEMENTS)[number]

// backdrop 点击（click 链路）的轻点判定距离：按下起点到 click 坐标的欧氏位移未越过该值
// 视为轻点，沿用「点 backdrop 关闭」语义（对齐 dragCloseThreshold 的 10px 下限量级）。
// 必须用欧氏长度（而非仅主轴分量）：只看主轴会让「主轴不动、垂直大幅滑动」的
// press–drag–release 链路仍落在窗口内被误读成轻点。
const BACKDROP_TAP_DISTANCE = 10

/*
 * 拖拽期间由 JS 写入的 backdrop 透明度变量参与 WAAPI 关键帧。未注册的自定义属性在
 * 关键帧之间是离散插值（半帧跳变），注册为 <number> 后获得线性插值。
 * inherits 必须为 true：::backdrop 只从 originating element 继承「可继承属性」，
 * 注册为不可继承会让变量到不了 backdrop，跟手淡出整体失效（Chrome 151 实证）。
 * 注册表是全局的，模块重复执行（HMR）时捕获已注册错误并忽略。
 */
if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  try {
    CSS.registerProperty({
      name: '--wui-internal-drag-backdrop-opacity',
      syntax: '<number>',
      inherits: true,
      initialValue: '1'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
  /*
   * 公开 token 注册为 <length>：Consumer 传 unitless 0 时计算值被归一为 0px，
   * 避免 calc(100% + 0) 因 number/percentage 不兼容而使闭合位移失效。
   */
  try {
    CSS.registerProperty({
      name: '--wui-drawer-inset',
      syntax: '<length>',
      inherits: true,
      initialValue: '8px'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
  try {
    CSS.registerProperty({
      name: '--wui-internal-drawer-inset',
      syntax: '<length>',
      inherits: true,
      initialValue: '8px'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
  /*
   * 嵌套层叠对数曲线的基准 A（shift = A · ln(depth + 1)）：注册为 <length> 后
   * 桌面基准只有这一个真相源，JS 从 computed style 读到的永远是确定值；
   * 窄视口基准由 style.css 的媒体查询覆盖同一 token。消费方写 unitless 的
   * `0` 会在计算值阶段归一成 `0px`（层叠露边归零，而不是让 ln 项算出 NaN）。
   *
   * A = 43.2px 来自视觉 pass：四层等宽 320px 时逐层露边
   * 29.94 / 17.52 / 12.43px，总堆叠宽 59.89px。
   *
   * 取值由**最里层**那一跳决定：对数曲线压得最狠的正是第四层，它只有
   * A·ln(4/3) = 0.288A。12.43px 略高于 12px 的线性步进，但余量已经收窄到
   * 3.5%——继续下调会让最里层那一条边与上一条边难以分辨。若还要更小的基准，
   * 应先改 ln 的压缩比而不是只降 A。
   */
  try {
    CSS.registerProperty({
      name: '--wui-drawer-nested-peek-base',
      syntax: '<length>',
      inherits: true,
      initialValue: '43.2px'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
  /*
   * 收尾过渡的时长：注册为 <time> 后 ::backdrop 也能继承到同一值。不注册时变量在
   * transition 简写里只是 token 替换，值一旦无效整条声明在计算值阶段失效
   * （退化为 transition: none），回弹会变成瞬移。
   * 缓动不注册：CSS 属性语法没有 <easing-function>，且它不需要插值，靠 var() 的
   * 兜底值即可。
   */
  try {
    CSS.registerProperty({
      name: '--wui-internal-settle-duration',
      syntax: '<time>',
      inherits: true,
      initialValue: '280ms'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
}

@customElement('web-ui-drawer')
export class WebUiDrawer extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(modalSurface), unsafeCSS(scrollbarStyle), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  @property({ type: Boolean, reflect: true, attribute: 'no-backdrop-close' }) noBackdropClose = false

  /**
   * Controlled 模式下，Escape、backdrop、关闭 button 和拖拽关闭只派发 `open-change` 请求，
   * 不会自行修改 `open`。Consumer 回写 `open` 后才执行关闭动画。
   * 程序化 API（show/close/直接赋值 open）不受此模式影响，始终直通。
   */
  @property({ type: Boolean, reflect: true }) controlled = false

  @property({ type: String, reflect: true })
  get placement(): DrawerPlacement {
    return this._placement
  }
  set placement(v: string) {
    const old = this._placement
    this._placement = normalizeLiteral(v, ALLOWED_PLACEMENTS, 'right')
    this.requestUpdate('placement', old)
  }
  private _placement: DrawerPlacement = 'right'

  // 标题文字（未传 header slot 时显示默认 header）
  @property({ type: String }) heading = ''

  @property({ type: Boolean, reflect: true }) closable = false

  /**
   * Headless 模式：只保留 overlay 基础设施（backdrop、动画、scroll lock、dialog 语义），
   * 移除内置 UI（glass 样式、header、close button、footer）。Consumer 自定义内容样式。
   */
  @property({ type: Boolean, reflect: true }) headless = false

  /**
   * 内部原生 dialog 的 accessible name。headless 模式必须由 Consumer 提供，
   * 因为该模式不会渲染可自动关联的内置 header。
   */
  @property({ type: String, attribute: 'aria-dialog-label' }) ariaDialogLabel = ''

  /*
   * `dialog-label` 自 11.1.0 发布，为已上线消费方保留兼容别名：attribute 仍可写，
   * 内部转发到 ariaDialogLabel。canonical 名是 aria-dialog-label；两个 attribute 同时
   * 设置时后处理者生效，文档不推荐这样做。下个 major 移除本别名。
   */
  /** @deprecated 用 `aria-dialog-label`。 */
  @property({ type: String, attribute: 'dialog-label' })
  get dialogLabel(): string {
    return this.ariaDialogLabel
  }
  set dialogLabel(value: string) {
    this.ariaDialogLabel = value
  }

  /** 关闭按钮的无障碍名称；未设置时回退内置英文文案（见 ADR-0016）。 */
  @property({ type: String, attribute: 'aria-close-label' }) ariaCloseLabel = ''

  /**
   * 启用拖拽关闭：打开态在 drawer 内缘渲染 drag bar（灰色胶囊 + 加宽 drag zone），
   * 指针拖拽实时跟手，松手按位移与甩动速度判定关闭或弹回。
   * 关闭态基于原生 dialog 无可见渲染物，因此不支持从关闭态拖拽打开。
   */
  @property({ type: Boolean, reflect: true }) override draggable = false

  /**
   * 拖拽全屏（需同时开启 `draggable`）：打开态向外拖拽（背离闭合方向）过行程阈值，
   * 或快速向外甩动后松手，drawer 吸附为占满视口（非 headless 减去四周留边）的全屏态。
   * 一旦同一手势回拉越过恢复阈值，本段手势锁定为取消全屏：抽屉恢复原尺寸，
   * 继续内拉只按阻尼跟手，不关闭，也不重新吸附 full；松手停在原尺寸。
   * 要关闭或再次进入 full，必须新起一段手势。
   * full 态下按钮 / Escape / backdrop 照常直接关闭。
   * 默认关闭：现有 `draggable` 消费方行为不变，显式开启才获得该手势。
   */
  @property({ type: Boolean, reflect: true }) fullable = false

  /**
   * 打开时整页朝 drawer 进场方向让开一段距离：横向 1 个轴单位 a 是 `1vw`、纵向是 `1vh`，
   * 第 1 层让开 16a，之后每层减半，等比和收敛到 32a、不会超过。
   * 位移写在 `documentElement` 上：页面里的 fixed 内容会一起走，top layer 中的
   * `<dialog>`（含本 drawer 自己）不受影响。位移以 `vw` / `vh` 写在根元素上，视口宽高
   * 变化时跟着重算，不需要重新打开。
   * 嵌套与同级 drawer 都按打开先后排层。reduce 档位下整套不生效。
   */
  @property({ type: Boolean, reflect: true, attribute: 'page-shift' }) pageShift = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  private get motionLayer() {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-drawer-motion') ?? null
  }

  private _hasHeaderSlot = false
  private _hasFooterSlot = false
  private readonly _userOpenChange = new UserChangeController()
  /*
   * 上下 placement 的拖拽 drag zone 要让开头尾两节（见 style.css 的 --wui-internal-drawer-* 说明）：
   * `bottom` 贴顶边、drag zone 让开 header，`top` 贴底边、drag zone 让开 footer。让开的量就是那一节的
   * border-box 高度，写成 host 上的自定义属性交给 CSS 去算偏移——样式侧因此不必知道
   * header / footer 的存在与高度，两条 placement 规则各只读自己的那个属性。
   *
   * 用 offsetHeight 而非 CSS 侧推导：`[hidden]` 的节天然是 0（让位量归零，drag zone 回到 panel 边缘），
   * 而「header 存在但高度为 0」与「没有 header」在布局上是同一件事，不需要额外的存在性 toggle。
   * 高度是动态的（consumer 的 padding、窄屏断点改写、slotted 内容换行），所以观察而非读取一次。
   */
  private readonly _headerHeight = new ElementHeightController(this, '.wui-drawer-header', height =>
    this._setAvoidance('--wui-internal-drawer-header-inset', height)
  )
  private readonly _footerHeight = new ElementHeightController(this, '.wui-drawer-footer', height =>
    this._setAvoidance('--wui-internal-drawer-footer-inset', height)
  )

  /*
   * 让位量 = 该节高度 + 一点呼吸间距，且**只在真有那一节时**才加间距。
   *
   * 间距写成属性值里的 calc 而不是让 CSS 无条件相加，是因为「没有 header」这一态必须精确等于
   * 让位量 0 的几何（drag zone 顶边贴 panel 顶边）。若让间距无条件生效，无 header 的 drawer 会
   * 平移 4px，drag zone 端边与 panel 端边的贴合关系跟着变——那是
   * `header-drag-surface.browser.spec.ts` 的 R2 钉住的关系，这条护栏不该让步。
   * 间距本身仍以 token 暴露，真机调参不必改代码。
   */
  private _setAvoidance(property: string, height: number) {
    this.style.setProperty(
      property,
      height > 0 ? `calc(${height}px + var(--wui-drawer-drag-zone-inset, var(--wui-space-1, 4px)))` : '0px'
    )
  }
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    getTransitionTarget: () => this.motionLayer,
    isConnected: () => this.isConnected,
    isOpen: () => this.open
  })
  // nested 层序：打开后纳入全局栈，上层打开/关闭时本层缩放平移。
  // depth 变化回调先于 applyLayers 的 size 收集执行（见 nested-drawer-layers.ts），
  // full 态在此同步瞬时收起，露边数学不被 full 宽度污染。
  private readonly _nestedLayers = defineNestedDrawerLayers().make({
    getDialog: () => this.dialog,
    getPlacement: () => this._placement,
    onDepthChange: depth => this._drag.collapseForNested(depth)
  })
  /*
   * 整页让开（page-shift）。轴向与符号都取自拖拽那套：页面朝 drawer 的**进场方向**移动，
   * 即闭合方向的反向，所以符号是 `-getPlacementCloseSign(placement)`。两者共用同一张 placement 表，
   * 新增 placement 时只需要改一处。
   */
  private readonly _pageShift = definePageShift().make({
    getHost: () => this,
    isEnabled: () => this.pageShift,
    getAxis: () => getPlacementDragAxis(this._placement),
    getSign: () => -getPlacementCloseSign(this._placement)
  })
  /*
   * 开启态 overlay（issue #120 Block 1）。drawer 把自己的原生 <dialog> 登记为 panel，使挂在
   * dialog 上的 portal panel（select / dropdown / tooltip）在逻辑组合树上成为它的后代，
   * 仲裁者据此选出最内层。
   *
   * 拖拽进行中不响应 Escape，但**仍是候选**：仲裁者照旧吞掉按键并压掉原生 cancel，
   * 只是不走关闭入口。关闭入口只有这一个执行者。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._closeFromUser(),
    isConnected: () => this.isConnected
  })
  /** 当前开启会话的 handle；未开启时为 null。 */
  private _handle: OpenOverlayHandle | null = null

  private readonly _drag = defineDrawerDragController().make({
    getHost: () => this,
    getDialog: () => this.dialog,
    getMotionLayer: () => this.motionLayer,
    getPlacement: () => this._placement,
    isOpen: () => this.open,
    isDraggable: () => this.draggable,
    isFullable: () => this.fullable,
    isControlled: () => this.controlled,
    onDragStateChange: dragging => {
      this._handle?.setInert(dragging)
    },
    onRequestClose: () => {
      this._closeFromUser()
    },
    onNestedRecalculate: () => {
      this._nestedLayers.recalculate()
    }
  })

  private readonly _handleDragPointerDown = (e: PointerEvent) => {
    this._drag.handlePointerDown(e)
  }

  private readonly _handleSectionDragPointerDown = (e: PointerEvent) => {
    this._drag.handleSectionPointerDown(e)
  }

  override connectedCallback() {
    super.connectedCallback()
    this._resyncSlotPresence()
    // 重挂载对账：断连时 presence、滚动锁、nested 层序与登记都已被撤销，而
    // `open` 未变化时 `updated()` 不会补跑任何 sync 分支。首次连接时 shadow 尚未
    // 渲染、`this.dialog` 为 null，三种情况都直接跳过；打开态的首次进入仍由
    // updated() 的 `props.has('open')` 分支处理。
    this._presence.reconcile()
    if (this.open) {
      // presence.reconcile 已让打开态的 dialog 同步回到 top layer（此刻 dialog.open
      // 为真），层序 depth 可正确计数，与 updated() 的 register 时机一致。
      this._nestedLayers.register()
      // 重挂载前已让开过的页面停在位移位：push 的动画起点取当前计算值，与终点相同
      // 时不起动画，页面不会被再推一次、也不会先弹回原位再推出去。
      this._pageShift.push()
    }
    this._syncScrollLock()
    this._reclaimIfOpen()
  }

  override firstUpdated() {
    this._checkSlotContent('footer')
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._nestedLayers.dispose()
    this._pageShift.dispose()
    this._presence.dispose()
    this._scrollLock.release()
    // 断连即撤销登记，重连后由 _reclaimIfOpen 显式重新声明。
    this._handle?.release()
    this._handle = null
    // shadow 跨断连保留：destroy 内部清理定时器/手势后重置，但需保留 is-full 类待重挂载恢复。
    this._drag.destroy()
  }

  /** 「重挂载恢复」的调用方一半：模块刻意不观察 DOM 连接状态。 */
  private _reclaimIfOpen() {
    if (!this.open || this._handle) return
    const dialog = this.dialog
    if (!dialog) return
    this._handle = this._overlay.claim(dialog, { ancestryFrom: this })
    this._handle.setInert(this._drag.isDragging())
  }

  /**
   * 对账 header / footer slot 的有无，**只在真的变了时排一次更新**。
   *
   * 排更新是这条对账不可省的一半：`showHeader` 与 footer 的 `?hidden` 只在 render 里求值，
   * 而 Lit 的 `connectedCallback` 只做 `enableUpdating(true)` 与 `setConnected(true)`，本身不排
   * 更新。两条 slotchange 处理器也接不住这条路径——slotchange 只在**分配集合**变化时派发，
   * 断连期间清空槽位内容时宿主节点本身没动，事件不触发（Chromium 实测）。
   *
   * 漏掉这一半的后果：断连前有 footer、重连时已清空的 drawer 留下一节空的 footer。它在 style.css
   * 的 padding 下仍有真实高度（实测 32px），于是底部一条点不动的死带，拖拽 drag zone 的让位量也照
   * 它算而不归零。
   *
   * 判据取 light DOM 子节点而非 `slot.assignedNodes()`：首次连接时 shadow 尚未渲染，slot 元素
   * 还不存在，那一侧会直接跳过（首次连接的 presence 由 `firstUpdated()` 与 slotchange 兜底）；
   * 这里要的正是重连对账——shadow root 跨断连保留，两侧都可用，但只有子节点扫描不依赖渲染
   * 时序。「只在真变了才排」与两条 slotchange 处理器同一纪律，避免每次重连都多一次空渲染。
   */
  private _resyncSlotPresence() {
    const hasHeader = this._hasSlottedChild('header')
    const hasFooter = this._hasSlottedChild('footer')
    if (hasHeader === this._hasHeaderSlot && hasFooter === this._hasFooterSlot) return
    this._hasHeaderSlot = hasHeader
    this._hasFooterSlot = hasFooter
    this.requestUpdate()
  }

  private _hasSlottedChild(name: 'header' | 'footer') {
    return Array.from(this.children).some(child => child.getAttribute('slot') === name)
  }

  private _checkSlotContent(name: string) {
    const slot = this.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null
    if (!slot) return
    const has = slot.assignedNodes().length > 0
    if (name === 'footer' && has !== this._hasFooterSlot) {
      this._hasFooterSlot = has
      this.requestUpdate()
    }
  }

  private handleHeaderSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().length > 0
    if (has !== this._hasHeaderSlot) {
      this._hasHeaderSlot = has
      this.requestUpdate()
    }
  }

  private handleFooterSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().length > 0
    if (has !== this._hasFooterSlot) {
      this._hasFooterSlot = has
      this.requestUpdate()
    }
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('open')) {
      this._drag.syncControlledOpen(this.open)
      if (this._userOpenChange.consume()) this.emitOpenChange()
      this._presence.sync(this.open)
      if (this.open) {
        // presence.sync 内的 showModal() 把 dialog 提升进 top layer。双击手势本身
        // 留下的活选区会被浏览器拿去和提升后的新布局重新解析，结果选区落到刚挂载的
        // drawer 正文上。脆弱的是「手势来源的活选区」，不是 dblclick 的判定窗口：把
        // 打开推迟 250ms（早过双击判定）仍然复现。选区由浏览器在 showModal() 调用
        // 内部生成：脚本没有任何 Selection API 调用，在 dblclick 上 preventDefault
        // 也拦不住。
        //
        // 实测（Chromium）showModal() 不会动打开前已经存在的选区，所以这一次清理
        // 同时也覆盖「先选中页面文本、再打开」的情况——modal 打开后被选中的内容挡在
        // backdrop 后面本来也已不可用。这里只清文档选区，不动 user-select，drawer 内正文
        // 仍可正常拖选；拖拽 handle 与 toggle 时序不受影响。
        window.getSelection()?.removeAllRanges()
        // presence.sync 已同步发起 showModal：此刻 dialog.open 为真，计数出正确
        // 的层序 depth 并驱动下层缩放。直接同步 register，不等待 is-visible
        //（那要再等一帧，且打开过渡期间上层关系已应确立）。
        this._nestedLayers.register()
        // 原生 dialog 登记为开启态 overlay：挂在它上面的 portal panel 在逻辑组合树上
        // 成为本层后代，Escape 仲裁据此判出最内层（issue #120 Block 1）。
        const dialog = this.dialog
        if (dialog) {
          // 同一 panel 重新 claim = 新的一次开启：旧会话（含其子层）整体作废。
          this._handle?.release()
          this._handle = this._overlay.claim(dialog, { ancestryFrom: this })
          this._handle.setInert(this._drag.isDragging())
        }
      } else {
        this._nestedLayers.unregister()
        this._handle?.release()
        this._handle = null
      }
    }
    if (props.has('open') || props.has('noScrollLock')) this._syncScrollLock()
    // pageShift 与 open 同一条同步：打开期间关掉该属性要立刻把已经让开的页面收回来，
    // 只盯 open 会留下一层没人负责的位移。
    if (props.has('open') || props.has('pageShift')) this._syncPageShift()
    // fullable 相关属性运行时翻转（方案 §3.7 #3）：立即全清。fullable/draggable
    // 摘除时 CSS 过渡门同时失效，宽度瞬归位；placement 翻转改写整块定位几何，
    // full 态一并放弃。真实触发源：消费方随断点计算的 placement（如 DetailDrawer）。
    // 只在 open 时执行——关闭管线已由上面的 open 分支归位字段并保留 is-full
    // 穿越退出，这里再清会提前摘类、宽度在退出中途回位。
    if (this.open && (props.has('fullable') || props.has('draggable') || props.has('placement'))) {
      this._drag.reset()
    }
  }

  private handleTransitionEnd(e: TransitionEvent) {
    // transitionend 会从后代元素冒泡上来（slotted 消费者内容、嵌套子 drawer）。
    // 只处理本层内容的事件：presence 与收尾都只认动画层的过渡，
    // 后代一条 transform 过渡结束不能提前终结本层收尾（与 presence 内部守卫同规则）。
    if (e.target !== this.motionLayer) return
    this._presence.handleTransitionEnd(e)

    // 收尾过渡结束：::backdrop 的 opacity 过渡 target 也是 dialog（带 pseudoElement），
    // 因此再按 propertyName 只认 transform。
    if (e.propertyName === 'transform') {
      this._drag.handleTransitionEnd(e)
      // close 穿越路径的摘类钩子之一（方案 §3.7 #7）：保留 is-full 的退出动画在此刻
      // 播完，presence 已调用 dialog.close()（display:none）或 drawer 完全屏外，
      // 摘类不可见。stage 字段已在 updated() 的 !open 分支归位，这里只管类。
      if (!this.open) this.dialog?.classList.remove('is-full')
    }
  }

  private _isNestedDialogEvent(e: KeyboardEvent): boolean {
    const path = e.composedPath()
    const ownDialogIndex = path.indexOf(e.currentTarget as Node)
    return ownDialogIndex > 0 && path.slice(0, ownDialogIndex).some(node => node instanceof HTMLDialogElement)
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      if (e.defaultPrevented || this._isNestedDialogEvent(e)) return
      const dialog = this.dialog
      if (dialog) trapTabKey(e, dialog)
      return
    }
    if (e.key !== 'Escape') return
    /*
     * Escape 的归属由共享仲裁者在 document 捕获阶段判定（issue #120 Block 1）；命中后
     * 它会 stopPropagation，本 handler 不再执行。此处保留两条兜底：
     * ① defaultPrevented 说明仲裁者已介入，不再重复关闭；
     * ② 兜底路径仍按原逻辑处理，避免「panel 未登记」时 Escape 失灵。
     *
     * 本 handler **不是**可随手删掉的：仲裁者挂在 document 上，只对能跨 shadow
     * 边界的事件生效。实测（overlay-open-owner-260918，2026-09-18）摘掉 `@keydown` 后
     * layout.browser.spec.ts 的两例 Escape 用例立刻转红——它们派发的 keydown 没有
     * `composed: true`，事件止步于 shadow root，到不了 document。
     */
    if (e.defaultPrevented) return
    /*
     * nested 场景防连锁：子 drawer 的 dialog 经 slot 投影在本层 shadow 内，其
     * keydown composed 冒泡路径会再次经过本层 dialog（事件路径含 slot 宿主链）。
     * 若事件传播路径在本层 dialog 之前已存在其他 <dialog>，说明该事件来自子层，本层忽略。
     */
    if (this._isNestedDialogEvent(e)) return
    // 拖拽进行中忽略 ESC，避免手势与关闭管线竞争。
    if (this._drag.isDragging()) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    this._closeFromUser()
  }

  show() {
    if (this.open) return
    this.open = true
  }

  close() {
    if (!this.open) return
    this.open = false
  }

  private readonly _closeFromUser = () => {
    if (!this.open) return
    // controlled 悬停等待回写期间，关闭意图已在途（open-change 已派发）：
    // Escape/backdrop/关闭 button 的重复触发不再派发第二次请求，也不与超时弹回竞争。
    if (this._drag.isAwaitingWriteback()) return
    if (this.controlled) {
      this.emitOpenChange(false)
      return
    }

    this._userOpenChange.mark()
    this.close()
  }

  /*
   * 仲裁者在 capture 阶段 preventDefault 了 Escape 的 keydown，UA 因此不再派发原生
   * cancel，但本 handler 仍是「原生 cancel 到达时也要走完整关闭管线」的契约入口，
   * **不可删**。实测（overlay-open-owner-260918，2026-09-18）摘掉 `@cancel` 后
   * drawer.spec.ts 的「no-backdrop-close 存在时 cancel 仍通过关闭过渡退出」与
   * remount-reconcile 的「打开态被移出文档再接回」两例立刻转红。
   */
  private handleCancel(e: Event) {
    // 保留 top layer 直到 CSS 过渡结束，避免原生关闭跳过退出动画。
    e.preventDefault()
    this._closeFromUser()
  }

  private handleNativeClose() {
    // 关闭态下的 close 事件只可能是我们自己 finishClosing 排队的异步事件（或冗余的
    // 外部关闭）：交给 presence 消费 self-close 标志，避免标志泄漏到下一次真实关闭。
    if (!this.open) {
      // close 穿越路径的兜底摘类钩子（方案 §3.7 #7）：fallback-timer 与 reduce 路径
      // 可能没有 transform transitionend，close 事件是它们的唯一收尾点。
      // 此刻 dialog.close() 已调用（UA display:none），摘类不可见。
      this.dialog?.classList.remove('is-full')
      this._presence.handleNativeClose()
      return
    }

    // 我们自己 dialog.close() 排队的 close 事件是异步任务：正常时序在本关闭会话内
    // 到达，快速「关闭→重开」时它在重新打开之后才到达（过期事件）。两种情况都已在
    // finishClosing 完成全部清理，由 presence 消费并返回 true，不能当成外部关闭把
    // 刚重开的 dialog 关掉——否则重开即被误关，表现为连续 toggle 丢失过渡动画。
    if (this._presence.handleNativeClose()) return

    // 悬停等待期间的原生关闭（如表单 method="dialog"）：视为回写窗口内的重复
    // 关闭意图，取消等待不补发请求；已原生关闭的 dialog 不再被超时弹回拉起。
    if (this._drag.handleNativeCloseWhileOpen()) {
      return
    }

    // 原生关闭可绕过 cancel；controlled 时恢复受控状态，由 Consumer 决定是否关闭。
    if (this.controlled) {
      this._presence.sync(true)
      this.emitOpenChange(false)
      return
    }

    this._userOpenChange.mark()
    this.open = false
  }

  /*
   * backdrop 点击（backdrop click）的按-放链路回溯。
   *
   * 浏览器对「按下 → 拖动 → 松手」生成的 click 落在起点与松手点 DOM 的**共同祖先**
   * 上：从 panel 内容、拖拽 drag zone 甚至 backdrop 本处开始拖拽、松手落在 backdrop 上时，click 的
   * target 都是 dialog，与真正的轻点 backdrop 从 click 自身无法区分（真实鼠标/触摸下
   * 必现的误关路径，合成事件不派发 click 故自动化易漏测）。因此在 dialog 的
   * pointerdown 记录按下起点与是否落在 backdrop 上，click 时回溯校验：
   * - 按下起点不在 backdrop 上（从 panel 内容/drag zone 开始的链路）→ 不是点 backdrop，忽略；
   * - 按下到松手位移超过轻点量级 → 是拖拽松手而非点击，忽略；
   * 两者都通过才沿用「点 backdrop 关闭」语义。
   */
  private _backdropPress: { onMask: boolean; x: number; y: number } | null = null

  private handleDialogPointerDown(e: PointerEvent) {
    this._backdropPress = { onMask: e.target === e.currentTarget, x: e.clientX, y: e.clientY }
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
    if (this.noBackdropClose) return
    // 拖拽进行中 pointer capture 使 click 落在 dialog 上，忽略以避免与手势竞争。
    if (this._drag.isDragging()) return
    // detail 为 0 表示这次 click 不来自指针（键盘激活、程序化 .click()）：
    // pointerdown 记录可能是上一次指针交互的残留，不能据此判定 backdrop 点击
    //（对齐 image-preview 的既有守卫）。
    if (e.detail === 0) return
    const press = this._backdropPress
    this._backdropPress = null
    if (!press || !press.onMask) return
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > BACKDROP_TAP_DISTANCE) return
    this._closeFromUser()
  }

  private emitOpenChange(open = this.open) {
    dispatchOpenChangeEvent(this, open)
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  /*
   * 整页让开只跟 open 与该属性的开关走，不跟拖拽走：拖动 panel 时页面停在原地。
   * 手势要的是「panel 跟手」，页面若按同一增量跟着滑，drawer 相对视口的位置反而没变，
   * 跟手感被抵消掉一半；退场后回到哪个深度由栈决定，与拖了多少无关。
   *
   * 分支条件带 pageShift：只看 open 的话，打开期间关掉该属性走的是 push()（内部按开关
   * 直接返回），已经让开的页面没人收回。pop() 对没进过栈的宿主是无操作，所以这里
   * 可以无条件调用。
   */
  private _syncPageShift() {
    if (this.open && this.pageShift) this._pageShift.push()
    else this._pageShift.pop()
  }

  override render() {
    const showHeader = this._hasHeaderSlot || !!this.heading
    const dialogLabel = this.ariaDialogLabel.trim()
    const dialogLabelledBy = !dialogLabel && !this.headless && showHeader ? 'wui-drawer-heading' : nothing

    // 胶囊与 drag zone 为动画层中的兄弟节点，让位量只作用于 drag zone。
    //
    // 端头 drag edge 补上解耦留下的空档：胶囊贴回边缘后就不再落在 drag zone 的让开区里
    // （bottom + header 实测胶囊带 [8,12]、drag zone 带 [60,80]），那一段若没有命中层，
    // 胶囊就成了一条按不下去、悬停不亮的死装饰——R1 与 R3 在几何上本就不可同满足，
    // 结构解耦只让两者不再互相位移，命中层必须另给。drag edge 只在上下 placement 渲染：
    // 左右两条的胶囊本就落在 drag zone 内，多一个元素只会让 R5「左右几何不变」需要额外论证。
    //
    // 顺序要紧：胶囊排最后，两条 drag zone（边、区）都在它前面，hover / active / 确认态三条规则
    // 因此靠通用兄弟选择器 `~` 挂上去。写成相邻兄弟 `+` 的话 drag edge 那条会静默失效。
    const needsEdgeBand = this.placement === 'top' || this.placement === 'bottom'
    const dragBar = this.draggable
      ? html`
          ${
            needsEdgeBand
              ? html`<div class="wui-drawer-drag-edge" @pointerdown=${this._handleDragPointerDown}></div>`
              : nothing
          }
          <div class="wui-drawer-drag-zone" @pointerdown=${this._handleDragPointerDown}></div>
          <div class="wui-drawer-drag-bar"></div>
        `
      : nothing

    // 保持同一个 dialog 实例，避免打开期间切换 headless 时脱离 top layer。
    return html`
      <dialog
        aria-label=${dialogLabel || nothing}
        aria-labelledby=${dialogLabelledBy}
        @cancel=${this.handleCancel}
        @close=${this.handleNativeClose}
        @click=${this.handleBackdropClick}
        @pointerdown=${this.handleDialogPointerDown}
        @keydown=${this.handleKeydown}
        @transitionend=${this.handleTransitionEnd}
      >
        <div class="wui-drawer-motion">
          ${
            this.headless
              ? html`<slot></slot>${dragBar}`
              : html`
                  <div class="wui-drawer-body wui-glass">
                    <div
                      class="wui-drawer-header"
                      id="wui-drawer-heading"
                      ?hidden=${!showHeader}
                      @pointerdown=${this._handleSectionDragPointerDown}
                    >
                      <slot name="header" @slotchange=${this.handleHeaderSlotChange}>
                        ${this.heading ? html`<span class="wui-drawer-heading">${this.heading}</span>` : nothing}
                      </slot>
                    </div>
                    <div class="wui-drawer-content wui-scroll">
                      <slot></slot>
                    </div>
                    <div
                      class="wui-drawer-footer"
                      ?hidden=${!this._hasFooterSlot}
                      @pointerdown=${this._handleSectionDragPointerDown}
                    >
                      <slot name="footer" @slotchange=${this.handleFooterSlotChange}></slot>
                    </div>
                  </div>
                  ${
                    this.closable
                      ? html`
                          <web-ui-button
                            class="wui-drawer-close"
                            @click=${this._closeFromUser}
                            aria-label=${resolveBuiltinLabel('close', this.ariaCloseLabel)}
                            variant="secondary"
                            icon
                            size="var(--wui-drawer-close-size, 26px)"
                          >
                            <web-ui-icon size="14" .icon=${oouiClose}></web-ui-icon>
                          </web-ui-button>
                        `
                      : nothing
                  }
                  ${dragBar}
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
    'web-ui-drawer': WebUiDrawer
  }
}
