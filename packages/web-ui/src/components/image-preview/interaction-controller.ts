import { definePlugin } from '@greypan/js-kit'

import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp } from '@/shared/gesture/physics'
import {
  attachPinchGesture,
  type PinchGestureHandle,
  type PinchMoveInfo,
  type PinchStartInfo
} from '@/shared/gesture/pinch-gesture'

import type { ImagePreviewItem } from './index'

/** 交互状态投影：只含状态；派生量（zoomed、按钮可用性）由 render 从这些字段算。 */
export interface ImagePreviewInteractionView {
  readonly index: number
  /** 左相邻图索引；-1 表示没有左相邻（单图，或非 loop 已到边界）。 */
  readonly prevIndex: number
  /** 右相邻图索引；-1 语义同上。 */
  readonly nextIndex: number
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
  /** 切图手势的横向跟手位移；只作用于 track，不叠加进当前图的 transform。 */
  readonly swipeOffset: number
  /** 滑入/回位过渡中：stage 挂 is-settling，track 启用 transform 过渡。 */
  readonly swipeSettling: boolean
  readonly dragging: boolean
}

export interface ImagePreviewInteractionAdapter {
  isOpen: () => boolean
  getDialog: () => HTMLDialogElement | null
  getStage: () => HTMLElement | null
  getCurrentImage: () => HTMLImageElement | null
  getItems: () => readonly ImagePreviewItem[]
  isLooping: () => boolean
  isSwipeEnabled: () => boolean
  /** backdrop tap 是否应关闭；取反的 noBackdropClose。 */
  isBackdropCloseEnabled: () => boolean
  /** 交互判定出关闭意图（仅 backdrop tap）；由会话侧执行关闭。 */
  requestClose: () => void
  /** 交互状态发生变化；宿主据此 requestUpdate()。 */
  onViewChange: () => void
}

export interface ImagePreviewInteractionController {
  /**
   * render 的唯一读源。对象引用固定，字段在读取时现算；相邻索引还会读取当前
   * adapter 输入，因此 images / loop 属性变化不需要额外通知。
   */
  readonly view: Readonly<ImagePreviewInteractionView>

  /** 建立初始索引（按当前 items 钳制）；只由宿主在挂载前调用一次。 */
  configure: (index: number) => void
  /**
   * 幂等挂载 stage 上的 pinch 手势；首连与重挂都调用。
   * 只负责 pinch：drag handle 由 handlePointerDown 创建，由 abort() / destroy() 销毁。
   */
  syncPinch: () => void
  /**
   * 中止进行中的交互事务：销毁 drag handle、取消 settle timer、复位 dragging / swipe 瞬态，
   * 保留 index / scale / offset。pinch 监听不在这里销毁（关闭后其回调由 isOpen() 短路）。
   */
  abort: () => void
  /** 断连清理：abort() + 解绑 pinch 监听。 */
  destroy: () => void

  goTo: (index: number) => void
  next: () => void
  prev: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void

  handlePointerDown: (event: PointerEvent) => void
  handleClick: (event: MouseEvent) => void
  handleDoubleClick: (event: MouseEvent) => void
  handleWheel: (event: WheelEvent) => void
  handleKeydown: (event: KeyboardEvent) => void
  handleTrackTransitionEnd: (event: TransitionEvent) => void
}

export const MIN_SCALE = 1
export const MAX_SCALE = 4

const ZOOM_STEP = 0.5
// 滚轮 deltaY(px) 到缩放的指数系数；每 120px 步进约放大 27%。
const WHEEL_ZOOM_SENSITIVITY = 0.002
// 判定为拖拽（平移或滑动）而非点击的最小位移。
const PAN_MOVE_THRESHOLD = 3
// 滑动切图的距离阈值 = 舞台宽度 × 该比例（取整），速度阈值任一满足即切图。
const SWIPE_DISTANCE_RATIO = 0.15
const SWIPE_VELOCITY = 320
// 快速轻扫兜底：真实触摸事件流可能被合并/延迟稀释，速度取窗口速度与整段平均速度的较大者。
const SWIPE_FLICK_DISTANCE = 16
const SWIPE_FLICK_VELOCITY = 160
// 滑入/回位的兜底时长：正常由 transform 的 transitionend 提前收尾；无过渡场景按该时长提交。
const SWIPE_SETTLE_MS = 320

/**
 * image-preview 的交互事务：导航、缩放/平移、拖拽/捏合/滑动与输入判定。
 * 会话状态留在宿主组件；这里只读 isOpen()，并通过 requestClose / onViewChange 通信。
 */
export const defineImagePreviewInteraction = () =>
  definePlugin<ImagePreviewInteractionController, ImagePreviewInteractionAdapter>(adapter => {
    let index = 0
    let scale = MIN_SCALE
    let offsetX = 0
    let offsetY = 0
    let swipeOffset = 0
    let swipeSettling = false
    let dragging = false

    /** 相邻图方向：1 = 下一张（位于右侧），-1 = 上一张（位于左侧）。 */
    let swipeDir: 1 | -1 | 0 = 0
    /** 当前滑动手势的起始时间戳；松手时与 endInfo.timeStamp 求整段平均速度。 */
    let swipeStartTime = 0
    let swipeSettleCommit = false
    let swipeSettleDir: 1 | -1 = 1
    let swipeSettleTimer: ReturnType<typeof setTimeout> | undefined

    let gesture: DragGestureHandle | undefined
    let swipeGesture = false
    let panOriginX = 0
    let panOriginY = 0
    let dragged = false
    let blankPointerDown = false
    let pinch: PinchGestureHandle | undefined
    /** 双指手势起始倍率，以及起始两指中点所对应的图片局部（1x）坐标。 */
    let pinchScale = MIN_SCALE
    let pinchLocalX = 0
    let pinchLocalY = 0

    const notify = () => adapter.onViewChange()

    const setIndex = (next: number) => {
      if (index === next) return
      index = next
      notify()
    }
    const setScale = (next: number) => {
      if (scale === next) return
      scale = next
      notify()
    }
    const setOffsetX = (next: number) => {
      if (offsetX === next) return
      offsetX = next
      notify()
    }
    const setOffsetY = (next: number) => {
      if (offsetY === next) return
      offsetY = next
      notify()
    }
    const setSwipeOffset = (next: number) => {
      if (swipeOffset === next) return
      swipeOffset = next
      notify()
    }
    const setSwipeSettling = (next: boolean) => {
      if (swipeSettling === next) return
      swipeSettling = next
      notify()
    }
    const setDragging = (next: boolean) => {
      if (dragging === next) return
      dragging = next
      notify()
    }

    /** 单图或非 loop 越界返回 -1；多图 loop 环绕。 */
    const adjacent = (dir: 1 | -1): number => {
      const count = adapter.getItems().length
      if (count <= 1) return -1
      if (adapter.isLooping()) return (((index + dir) % count) + count) % count
      const target = index + dir
      return target >= 0 && target < count ? target : -1
    }

    const view: ImagePreviewInteractionView = {
      get index() {
        return index
      },
      get prevIndex() {
        return adjacent(-1)
      },
      get nextIndex() {
        return adjacent(1)
      },
      get scale() {
        return scale
      },
      get offsetX() {
        return offsetX
      },
      get offsetY() {
        return offsetY
      },
      get swipeOffset() {
        return swipeOffset
      },
      get swipeSettling() {
        return swipeSettling
      },
      get dragging() {
        return dragging
      }
    }

    /**
     * 以锚点缩放：锚点是相对舞台中心的偏移，它覆盖的图片内容在缩放前后保持不动。
     * 滚轮传光标位置，两指传两指中点，工具栏与键盘传 (0, 0)（即视口中心）。
     */
    const zoomAt = (next: number, anchorX: number, anchorY: number) => {
      const nextScale = clamp(next, MIN_SCALE, MAX_SCALE)
      if (nextScale === scale) return

      const ratio = nextScale / scale
      applyScale(nextScale, anchorX - (anchorX - offsetX) * ratio, anchorY - (anchorY - offsetY) * ratio)
    }

    const applyScale = (nextScale: number, nextOffsetX: number, nextOffsetY: number) => {
      setScale(nextScale)
      if (nextScale === MIN_SCALE) {
        setOffsetX(0)
        setOffsetY(0)
        return
      }
      setOffsetX(nextOffsetX)
      setOffsetY(nextOffsetY)
      clampOffsets()
    }

    const setScaleFromToolbar = (next: number) => zoomAt(next, 0, 0)

    /** 舞台中心的视口坐标；所有缩放锚点都以它为原点。 */
    const stageOrigin = (): { x: number; y: number } => {
      const stage = adapter.getStage()
      if (!stage) return { x: 0, y: 0 }
      const rect = stage.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }

    /**
     * 平移边界 = 图片与舞台在缩放后「尺寸差」的一半。
     *
     * 图片比舞台大时它是「能露出多少边缘」，比舞台小时它是「能在视口内移动多远」——
     * 两种情形是同一个绝对差，所以 1x 也能拖动，且图片永远拖不出视口。
     * 图片只受 max-width/max-height 收缩（不放大），因此 offsetWidth/offsetHeight
     * 就是绘制尺寸，不受 CSS transform 影响。
     */
    const offsetBounds = (): { x: number; y: number } => {
      const stage = adapter.getStage()
      const image = adapter.getCurrentImage()
      if (!stage || !image) return { x: 0, y: 0 }

      const width = image.offsetWidth
      const height = image.offsetHeight
      if (!width || !height) return { x: 0, y: 0 }

      return {
        x: Math.abs(width * scale - stage.clientWidth) / 2,
        y: Math.abs(height * scale - stage.clientHeight) / 2
      }
    }

    const clampOffsets = () => {
      const bounds = offsetBounds()
      setOffsetX(clamp(offsetX, -bounds.x, bounds.x))
      setOffsetY(clamp(offsetY, -bounds.y, bounds.y))
    }

    /**
     * 空白 = dialog 本体或未被图片 / 控件覆盖的舞台区域。
     *
     * 只能在 pointerdown（指针捕获生效前）判定：一旦舞台通过 setPointerCapture
     * 取得捕获，后续 click 的 target 会被重定向到捕获元素，用它判断会把「点图片」
     * 误判成「点空白」而关闭 overlay。
     */
    const isBlank = (target: EventTarget | null): boolean => {
      return target === adapter.getDialog() || target === adapter.getStage()
    }

    /** 取消未完成的滑入/回位过渡（新手势、pointercancel、关闭等接管时）。 */
    const cancelSwipeSettle = () => {
      if (swipeSettleTimer !== undefined) {
        clearTimeout(swipeSettleTimer)
        swipeSettleTimer = undefined
      }
      setSwipeSettling(false)
      swipeSettleCommit = false
      swipeSettleDir = 1
      setSwipeOffset(0)
      swipeDir = 0
    }

    /** 滑入/回位过渡结束：按目标提交索引切换，或复位到单图静止态。 */
    const finishSwipeSettle = () => {
      if (swipeSettleTimer === undefined) return
      clearTimeout(swipeSettleTimer)
      swipeSettleTimer = undefined
      const commit = swipeSettleCommit
      const dir = swipeSettleDir
      setSwipeSettling(false)
      swipeSettleCommit = false
      swipeDir = 0
      setSwipeOffset(0)
      if (commit) commitSwipeTo(dir)
    }

    /** 把当前索引切换到相邻图；相邻图在滑动期间已在 DOM 中呈现，提交后直接展示，避免重复淡入闪烁。 */
    const commitSwipeTo = (dir: 1 | -1) => {
      const target = adjacent(dir)
      if (target < 0 || target === index) return
      setIndex(target)
      resetZoom()
    }

    /** 释放后的滑入/回位：把 swipeOffset 从跟手位移过渡到目标位。 */
    const settleSwipe = (deltaX: number, velocityX: number, endTime: number) => {
      const dir = swipeDir
      const stageW = adapter.getStage()?.clientWidth ?? 0
      if (dir === 0 || stageW <= 0) {
        setSwipeOffset(0)
        return
      }
      const distanceThreshold = Math.max(1, Math.round(stageW * SWIPE_DISTANCE_RATIO))
      // 整段位移平均速度对合并/延迟稀释的事件流更鲁棒；时间跨度不足 2ms 视为 0。
      const spanMs = endTime - swipeStartTime
      const fullSpanVelocity = spanMs >= 2 ? (deltaX / spanMs) * 1000 : 0
      const flickVelocity = Math.max(Math.abs(velocityX), Math.abs(fullSpanVelocity))
      const crossed =
        Math.abs(deltaX) >= distanceThreshold ||
        Math.abs(velocityX) >= SWIPE_VELOCITY ||
        (Math.abs(deltaX) >= SWIPE_FLICK_DISTANCE && flickVelocity >= SWIPE_FLICK_VELOCITY)
      const commit = crossed && adjacent(dir) !== -1
      setSwipeSettling(true)
      swipeSettleCommit = commit
      swipeSettleDir = dir
      setSwipeOffset(commit ? -dir * stageW : 0)
      swipeSettleTimer = setTimeout(() => finishSwipeSettle(), SWIPE_SETTLE_MS)
    }

    const panTo = (deltaX: number, deltaY: number) => {
      const bounds = offsetBounds()
      setOffsetX(clamp(panOriginX + deltaX, -bounds.x, bounds.x))
      setOffsetY(clamp(panOriginY + deltaY, -bounds.y, bounds.y))
    }

    /**
     * 双指接管时先中止可能已开始的单指平移/滑动，避免两套手势同时写 offset。
     * 手势起点在图片上的位置被记住，缩放与两指中点位移都以它为基准。
     */
    const handlePinchStart = (info: PinchStartInfo) => {
      if (!adapter.isOpen()) return

      abort()
      setDragging(true)
      // 双指操作后浏览器不会补发 click，但混合输入的兼容 click 不应被当作 backdrop 点击。
      dragged = true

      const origin = stageOrigin()
      pinchScale = scale
      pinchLocalX = (info.centerX - origin.x - offsetX) / scale
      pinchLocalY = (info.centerY - origin.y - offsetY) / scale
    }

    const handlePinchMove = (info: PinchMoveInfo) => {
      if (!adapter.isOpen()) return

      const nextScale = clamp(pinchScale * info.ratio, MIN_SCALE, MAX_SCALE)
      const origin = stageOrigin()
      applyScale(
        nextScale,
        info.centerX - origin.x - pinchLocalX * nextScale,
        info.centerY - origin.y - pinchLocalY * nextScale
      )
    }

    const handlePinchEnd = () => {
      setDragging(false)
    }

    const handlePinchCancel = () => {
      setDragging(false)
    }

    const abort = () => {
      gesture?.destroy()
      gesture = undefined
      setDragging(false)
      cancelSwipeSettle()
      swipeDir = 0
      setSwipeOffset(0)
    }

    const configure = (initialIndex: number) => {
      const count = adapter.getItems().length
      setIndex(clamp(initialIndex, 0, Math.max(0, count - 1)))
    }

    const syncPinch = () => {
      if (pinch) return
      const stage = adapter.getStage()
      if (!stage) return

      pinch = attachPinchGesture(stage, {
        onStart: handlePinchStart,
        onMove: handlePinchMove,
        onEnd: handlePinchEnd,
        onCancel: handlePinchCancel
      })
    }

    const destroy = () => {
      abort()
      pinch?.destroy()
      pinch = undefined
    }

    const goTo = (target: number) => {
      const count = adapter.getItems().length
      if (count === 0) return

      const nextIndex = adapter.isLooping() ? ((target % count) + count) % count : clamp(target, 0, count - 1)
      // 相等时也取消：settle 可能带着 pending commit，提前 return 会让收尾把索引推走。
      cancelSwipeSettle()
      if (nextIndex === index) return

      setIndex(nextIndex)
      resetZoom()
    }

    const next = () => goTo(index + 1)
    const prev = () => goTo(index - 1)

    const zoomIn = () => setScaleFromToolbar(scale + ZOOM_STEP)
    const zoomOut = () => setScaleFromToolbar(scale - ZOOM_STEP)

    const resetZoom = () => {
      if (scale === MIN_SCALE && offsetX === 0 && offsetY === 0) return
      setScale(MIN_SCALE)
      setOffsetX(0)
      setOffsetY(0)
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (!adapter.isOpen() || event.defaultPrevented) return
      if (event.altKey || event.ctrlKey || event.metaKey) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          prev()
          break
        case 'ArrowRight':
          event.preventDefault()
          next()
          break
        case '+':
        case '=':
          event.preventDefault()
          zoomIn()
          break
        case '-':
        case '_':
          event.preventDefault()
          zoomOut()
          break
        case '0':
          event.preventDefault()
          resetZoom()
          break
        default:
          break
      }
    }

    const handleWheel = (event: WheelEvent) => {
      if (!adapter.isOpen()) return

      event.preventDefault()
      // deltaMode 1 为按行滚动（Firefox），折算成像素后再套用同一系数。
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const origin = stageOrigin()
      zoomAt(scale * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY), event.clientX - origin.x, event.clientY - origin.y)
    }

    const handleClick = (event: MouseEvent) => {
      if (!adapter.isOpen()) return

      const blank = blankPointerDown
      blankPointerDown = false
      if (!blank) return

      // detail 为 0 表示这次 click 不来自指针（键盘激活 button、程序化 .click()），
      // 此时 pointerdown 起点可能是上一次指针交互的残留，不能据此判定 backdrop 点击。
      if (event.detail === 0) return

      // 拖拽（平移或滑动）结束后的 click 不再当作 backdrop 点击。
      if (dragged) {
        dragged = false
        return
      }
      if (!adapter.isBackdropCloseEnabled()) return
      adapter.requestClose()
    }

    const handleDoubleClick = (event: MouseEvent) => {
      if (!adapter.isOpen() || event.target !== adapter.getCurrentImage()) return
      if (scale > MIN_SCALE) resetZoom()
      else setScaleFromToolbar(MAX_SCALE / 2)
    }

    /**
     * 平移与左右滑动共用 attachDragGesture：它把指针捕获推迟到确认拖拽之后，
     * 因此不会像立即捕获那样破坏图片自身的 click / dblclick 命中；
     * 拖拽过程中的窗口级监听同时兜住指针移出元素甚至移出视口的情况。
     *
     * 拖拽默认平移且不限方向；唯一例外是 swipe 独占 1x 多图路径。
     * 监听挂在 dialog 而非舞台上：控件层里的按下不会经过舞台，挂在舞台会漏掉这些按下。
     */
    const handlePointerDown = (event: PointerEvent) => {
      if (!adapter.isOpen()) return

      // 新手势接管：中止可能未完成的滑入/回位过渡并复位轮播状态。
      cancelSwipeSettle()
      swipeDir = 0
      setSwipeOffset(0)

      // 只有主指针左键才可能生成 click；其它指针不得覆盖空白判定。
      const primary = event.button === 0 && event.isPrimary !== false
      if (!primary) return

      // 指针捕获会把后续 click 的 target 重定向到捕获元素，因此在按下时记录真实命中元素。
      blankPointerDown = isBlank(event.target)
      dragged = false

      const stage = adapter.getStage()
      if (!stage || (event.target !== stage && !stage.contains(event.target as Node))) return

      // swipe 独占 1x：只有未放大、开启 swipe 且多于一张图时，横向拖拽才归切图。
      swipeGesture = scale === MIN_SCALE && adapter.isSwipeEnabled() && adapter.getItems().length > 1
      swipeStartTime = event.timeStamp
      panOriginX = offsetX
      panOriginY = offsetY

      gesture?.destroy()
      gesture = attachDragGesture(event, {
        // 不能用 axis: 'x'：那会把以纵向为主的拖拽整体判定为「取消」，1x 下纵向就无法平移。
        axis: 'both',
        threshold: PAN_MOVE_THRESHOLD,
        onMove: info => {
          if (swipeGesture) {
            setSwipeOffset(info.deltaX)
            if (info.deltaX !== 0) swipeDir = info.deltaX < 0 ? 1 : -1
          } else panTo(info.deltaX, info.deltaY)
        },
        onEnd: info => {
          dragged = true
          setDragging(false)
          if (swipeGesture) settleSwipe(info.deltaX, info.velocityX, info.timeStamp)
        },
        onTap: () => {
          setDragging(false)
        },
        onCancel: () => {
          setDragging(false)
          cancelSwipeSettle()
          swipeDir = 0
          setSwipeOffset(0)
        }
      })
      setDragging(true)
    }

    const handleTrackTransitionEnd = (event: TransitionEvent) => {
      // track 会收到当前图 / 相邻图冒泡的 transform transitionend；只收敛 track 自身的过渡。
      if (event.target !== event.currentTarget) return
      if (!swipeSettling || event.propertyName !== 'transform') return
      finishSwipeSettle()
    }

    return {
      view,
      configure,
      syncPinch,
      abort,
      destroy,
      goTo,
      next,
      prev,
      zoomIn,
      zoomOut,
      resetZoom,
      handlePointerDown,
      handleClick,
      handleDoubleClick,
      handleWheel,
      handleKeydown,
      handleTrackTransitionEnd
    }
  })
