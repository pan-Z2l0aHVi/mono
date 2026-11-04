/*
 * 按住拖动批量勾选（扫选）的手势状态机与边缘自动滚物理。
 *
 * 从 ResourceList.vue 抽出的纯类：行命中、勾选状态、勾选动作、滚动面与时间源全部走
 * 注入的 port，本模块不直接读 window / document，单测不 mount 组件。
 */

/** 视口与整页滚动的只读面 + 写入。生产实现读 window / documentElement。 */
export interface SweepScrollViewport {
  innerHeight(): number
  scrollY(): number
  /** 可滚上限：文档高度减视口，与浏览器可达的最大滚动位置一致。 */
  maxScrollY(): number
  scrollTo(top: number): void
}

/** 手势计时的时间源：rAF 驱动边缘自动滚，setTimeout 驱动触摸长按确认。 */
export interface SweepScheduler {
  requestFrame(callback: FrameRequestCallback): number
  cancelFrame(handle: number): void
  setTimeout(callback: () => void, delay: number): unknown
  clearTimeout(handle: unknown): void
}

/** 手势期间的 pointermove / pointerup / pointercancel 监听目标（生产传 window）。 */
export interface SweepGestureTarget {
  addEventListener(type: 'pointermove' | 'pointerup' | 'pointercancel', listener: (event: PointerEvent) => void): void
  removeEventListener(
    type: 'pointermove' | 'pointerup' | 'pointercancel',
    listener: (event: PointerEvent) => void
  ): void
}

/** 扫选激活后拦截触摸滚动的监听目标（生产传 document，passive: false）。 */
export interface SweepBlockerTarget {
  addEventListener(type: 'touchmove', listener: (event: TouchEvent) => void, options: { passive: false }): void
  removeEventListener(type: 'touchmove', listener: (event: TouchEvent) => void): void
}

export interface SweepScrollPorts {
  /** 是否允许扫选（选择模式）；pointerdown 时询问。 */
  isEnabled(): boolean
  /** 现查指针命中的行 id；不命中任何行（行间隙、窗口外、列表外）返回 null。 */
  hitTest(clientX: number, clientY: number): string | null
  /** 行的当前勾选状态，定死整个手势的方向。 */
  isRowChecked(resourceId: string): boolean
  /** 把一行置成目标勾选状态。 */
  setChecked(resourceId: string, checked: boolean): void
  viewport: SweepScrollViewport
  scheduler: SweepScheduler
  gestureTarget: SweepGestureTarget
  blockerTarget: SweepBlockerTarget
}

/** 触摸没有 hover，落指就武装会把「本来想滚动」误判成扫选：先按住不动等长按确认。 */
export const SWEEP_TOUCH_HOLD_MS = 320
/** 长按确认之前指针位移超过它即判定为滚动、放弃扫选。 */
export const SWEEP_TOUCH_SLOP = 10

/*
 * 指针停在列表上下边缘时把页面滚一点，让窗口外的行进窗口、elementFromPoint 才够得着。
 * elementFromPoint 只认窗口内那十几行（窗口外的行没被渲染，命中不到），不主动滚就永远
 * 勾不过窗口边界——这不是手感问题，是能力限制。滚到位之后新行进入窗口，下一次 pointermove
 * 的现查自然就命中了。速度按指针离边缘的距离给：贴着边缘慢、越往里越快，滚到窗口跟着跑，
 * 手感接近原生拖拽。用 rAF 而不是 setInterval：滚完一帧就该停，pointerup 之后不留下还在跑
 * 的滚动。
 */
export const SWEEP_EDGE_ZONE = 32
export const SWEEP_MAX_SPEED = 24

/**
 * 扫选手势状态机：方向由按下那一行的当前状态定死、整个手势不再变（改状态而不是翻状态，
 * 同一行被划过两次不会自己弹回去）；触摸端先长按确认再武装；激活后按指针位置驱动边缘
 * 自动滚并拦截带外触摸滚动。
 */
export class SweepScrollController {
  private readonly ports: SweepScrollPorts

  private anchor: string | null = null
  private active = false
  private checked = false
  private lastId: string | null = null
  private holdTimer: unknown = undefined
  private touchOrigin: { x: number; y: number } | null = null
  // 手势收尾时浏览器还会补一个 click。扫选已经改过状态，那个 click 必须吃掉，否则会在
  // 落点那一行上再翻一次。下一个 pointerdown 清掉它——新手势不该继承上一手的抑制。
  private suppressRowClick = false
  // 长按在移动之前就武装，此刻浏览器还没开始滚动，preventDefault 拦得住；武装之后靠
  // touchmove 阻止滚动（pointermove 的 preventDefault 管不了这件事），但边缘带内放行，
  // 详见 blockTouchScroll。
  private suppressContextMenu = false

  private scrollFrame: number | null = null
  private scrollSpeed = 0
  private pointerX = 0
  private pointerY = 0

  private readonly onGestureMove = (event: PointerEvent) => this.handlePointerMove(event)
  private readonly onGestureEnd = () => this.end()
  private readonly onTouchMove = (event: TouchEvent) => this.blockTouchScroll(event)

  constructor(ports: SweepScrollPorts) {
    this.ports = ports
  }

  /**
   * pointerdown 冒泡到列表容器时的入口。
   *
   * 只认选择模式、主键、isPrimary；勾选框和行内改名编辑器各有交互，不参与扫选。
   * 首个行在 pointerdown 就落定，所以「点一下」和「按住划过一串」走的是同一条路径，
   * 没有只在拖动时才生效的分支。
   */
  handlePointerDown(event: PointerEvent) {
    if (!this.ports.isEnabled() || event.button !== 0 || !event.isPrimary) return
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('web-ui-checkbox, web-ui-editable-text')) return
    const id = target.closest<HTMLElement>('[data-resource-row]')?.dataset.resourceId
    if (!id) return

    this.suppressRowClick = false
    this.suppressContextMenu = false
    this.anchor = id
    this.checked = !this.ports.isRowChecked(id)
    this.lastId = null
    this.active = false
    if (event.pointerType === 'touch') {
      this.touchOrigin = { x: event.clientX, y: event.clientY }
      this.holdTimer = this.ports.scheduler.setTimeout(() => this.arm(), SWEEP_TOUCH_HOLD_MS)
    } else {
      this.active = true
      this.apply(id)
    }
    this.ports.gestureTarget.addEventListener('pointermove', this.onGestureMove)
    this.ports.gestureTarget.addEventListener('pointerup', this.onGestureEnd)
    this.ports.gestureTarget.addEventListener('pointercancel', this.onGestureEnd)
  }

  /** 长按确认到期：武装扫选并勾上首行。 */
  private arm() {
    this.holdTimer = undefined
    const anchor = this.anchor
    if (anchor === null) return
    this.active = true
    this.ports.blockerTarget.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.suppressContextMenu = true
    this.apply(anchor)
  }

  private handlePointerMove(event: PointerEvent) {
    if (event.pointerType === 'touch' && !this.active) {
      // 长按还没确认就先移动 → 这是一次滚动，放弃扫选
      const origin = this.touchOrigin
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > SWEEP_TOUCH_SLOP) {
        this.end()
      }
      return
    }
    if (!this.active) return
    this.updateScroll(event.clientX, event.clientY)
    const id = this.ports.hitTest(event.clientX, event.clientY)
    if (!id || id === this.lastId) return
    this.apply(id)
  }

  /**
   * 收尾：停掉长按计时与边缘自动滚的 rAF 循环、摘掉 touchmove 拦截与 window 级手势监听。
   * 幽灵 click 抑制只在手势确实激活过时置位。
   */
  end() {
    if (this.holdTimer !== undefined) {
      this.ports.scheduler.clearTimeout(this.holdTimer)
      this.holdTimer = undefined
    }
    this.scrollSpeed = 0
    if (this.scrollFrame !== null) {
      this.ports.scheduler.cancelFrame(this.scrollFrame)
      this.scrollFrame = null
    }
    this.ports.blockerTarget.removeEventListener('touchmove', this.onTouchMove)
    if (this.active) this.suppressRowClick = true
    // suppressContextMenu 必须在这里清，不能只等下一次 pointerdown 的 handlePointerDown。
    //
    // 它由 arm 置位，而 arm 只在选择模式下发生——非选择模式根本不会注册 end 路径。于是
    // 「进过一次选择模式并长按扫选」之后，这个标志会一直留着，把之后每一次右键都吞掉
    // （宿主见到它就 preventDefault 直接 return），直到用户碰巧再按一次左键进选择模式才
    // 恢复。表现为：扫选过一次之后，context menu 整个失灵。
    //
    // 时序上是安全的：同一次手势的 pointerup 一定早于后续右键的 pointerdown，而右键的
    // contextmenu 又在 pointerdown 之后，所以这里清完标志，右键那一次读到的已经是 false。
    this.suppressContextMenu = false
    this.anchor = null
    this.active = false
    this.lastId = null
    this.touchOrigin = null
    this.ports.gestureTarget.removeEventListener('pointermove', this.onGestureMove)
    this.ports.gestureTarget.removeEventListener('pointerup', this.onGestureEnd)
    this.ports.gestureTarget.removeEventListener('pointercancel', this.onGestureEnd)
  }

  /** 组件卸载时的收尾，与 end 相同（显式命名以示生命周期语义）。 */
  dispose() {
    this.end()
  }

  /**
   * 手势收尾后浏览器补发的 click 是否该被吃掉（消费即清）。
   * 吃掉它，否则扫选刚划出来的勾选会在落点那一行上被 click 再翻一次。
   */
  consumeRowClick(): boolean {
    if (!this.suppressRowClick) return false
    this.suppressRowClick = false
    return true
  }

  /** 触摸长按扫选武装后到收尾前，系统级 contextmenu 不是「用户想看 menu」，宿主要挡掉。 */
  isContextMenuSuppressed(): boolean {
    return this.suppressContextMenu
  }

  private apply(resourceId: string) {
    this.lastId = resourceId
    this.ports.setChecked(resourceId, this.checked)
  }

  // 离边缘越近速度越快，贴到边上正好是 SWEEP_MAX_SPEED，越过边缘不再增长。
  private edgeRatio(distance: number) {
    return 1 - Math.min(Math.max(distance, 0), SWEEP_EDGE_ZONE) / SWEEP_EDGE_ZONE
  }

  private edgeSpeed(clientY: number) {
    // window 模式：边缘带按视口顶底算，不按列表容器的 rect——容器此刻不是滚动容器，
    // 它在视口里的位置只反映当前滚动位置，拿它当边界会让手势提前或延后触发。
    //
    // 边缘带取「视口内靠边 N px」而不是「视口外 N px」。触摸的 clientY 按 Pointer Events
    // 恒落在 [0, innerHeight]——手指的接触点不可能在视口之外，所以按「越界」判定的两个分支
    // 在触摸端是死代码，speed 恒 0，扫选到窗口边缘就停住。带子必须落在手指够得着的范围里。
    //
    // 两支都要把 distance 钳在 ZONE 内再算系数。鼠标可以把 clientY 拖到任意负数或远超视口
    // 底的值，(1 - d/ZONE) 会随之线性无界增长：不钳的话 clientY=-1000 得到 774px/帧、
    // 是 SWEEP_MAX_SPEED 的 32 倍，列表直接「飞」过去、大量行被跳过，用户想停在某行上勾它
    // 根本停不住——那正好破坏扫选的核心价值。stepScroll 只钳了滚动上限、没钳速度。
    // 顶部那支的 distance 是「离顶边多远」= clientY 本身，不是 ZONE - clientY。写成后者会
    // 把梯度反过来：贴着屏幕顶（clientY=0）速度 0、离顶边 32px 处反而满速，触摸在列表顶部
    // 会「越靠边越慢」。
    const bottom = this.ports.viewport.innerHeight()
    if (clientY <= SWEEP_EDGE_ZONE) {
      return -this.edgeRatio(clientY) * SWEEP_MAX_SPEED
    }
    if (clientY >= bottom - SWEEP_EDGE_ZONE) {
      return this.edgeRatio(bottom - clientY) * SWEEP_MAX_SPEED
    }
    return 0
  }

  private stepScroll() {
    this.scrollFrame = null
    if (!this.active) return
    const viewport = this.ports.viewport
    const next = Math.min(Math.max(viewport.scrollY() + this.scrollSpeed, 0), viewport.maxScrollY())
    if (next === viewport.scrollY()) return
    viewport.scrollTo(next)
    // 滚完之后指针没动也要继续勾：现查命中的是指针下方那一行，不是新滚进来的行。
    this.applyAtPointer()
    this.scheduleScroll()
  }

  private scheduleScroll() {
    if (this.scrollFrame !== null || !this.active) return
    if (!this.scrollSpeed) return
    this.scrollFrame = this.ports.scheduler.requestFrame(() => this.stepScroll())
  }

  private applyAtPointer() {
    const id = this.ports.hitTest(this.pointerX, this.pointerY)
    if (!id || id === this.lastId) return
    this.apply(id)
  }

  private updateScroll(clientX: number, clientY: number) {
    this.pointerX = clientX
    this.pointerY = clientY
    this.scrollSpeed = this.edgeSpeed(clientY)
    if (this.scrollSpeed) this.scheduleScroll()
    else if (this.scrollFrame !== null) {
      this.ports.scheduler.cancelFrame(this.scrollFrame)
      this.scrollFrame = null
    }
  }

  /*
   * 扫选期间要不要拦下浏览器的触摸滚动。
   *
   * 拦的理由是扫选手势靠「按住不动」确认，一旦浏览器开始滚动，这个手势就散了：列表在动、
   * pointermove 命中的行不断变化，用户想勾的那一串就断了。所以扫选激活后要 preventDefault。
   *
   * 但不能一律拦。手指在视口边缘带内时，用户要的正是「滑到这里继续勾下面那些」——那就是
   * 滚动本身。此处再拦住，等于既不给自动滚、也不给手指滚，扫选在触摸端彻底卡在窗口边界
   * （列表是虚拟化的，滚不过窗口边界就勾不到下面的行）。
   *
   * 两条共存靠边缘带划界：
   *   - 带内（离视口上下沿 SWEEP_EDGE_ZONE 以内）：放行。手指驱动原生滚动，
   *     edgeSpeed 同时按指针位置给边缘自动滚，两者同向，不会互相拉扯。
   *   - 带外：拦住。长按确认与「手指滑动 = 放弃扫选」的判定都依赖这一条——带外放行的话，
   *     用户在列表中段随手一滑就会滚动页面，而此时扫选还开着，勾选会随页面漂移。
   *
   * 判据取 touch 的 clientY（与 edgeSpeed 同一套几何），所以「带内带外」在自动滚与
   * 手指滚之间是同一条线，不会出现「自动滚已启动但滚动仍被拦」这种自相矛盾的状态。
   */
  private blockTouchScroll(event: TouchEvent) {
    if (!this.active) return
    const touch = event.touches[0]
    // 没有触点信息（罕见的合成事件）时直接拦住，保守优先。
    if (!touch) {
      event.preventDefault()
      return
    }
    if (this.edgeSpeed(touch.clientY) !== 0) return
    event.preventDefault()
  }
}
