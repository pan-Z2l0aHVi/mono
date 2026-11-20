import { useEffect, useRef, type RefObject } from 'react'

const ESCAPE_KEY = 'Escape'

/**
 * 头部工具条里「展开式字段」（这里是搜索框）的开关策略。
 *
 * 复刻 interweave 的 `useExpandingField`：一个会抢占焦点的字段展开/收起会改变同级控件的
 * 布局，而 `focusout` 发生在 `mousedown` 的默认动作里——若当场收起，这次点击的 `mouseup`
 * 就落在挪走的元素上，`click` 不再派发，点别的按钮等于只关掉了字段。
 *
 * 策略：
 *
 *   1. 按在 `controls`（放字段和同级控件的那块容器）里时不收：这一簇的点击照常完成，
 *      字段保持展开；按在容器外或键盘 Tab 离开时才收；
 *   2. 簇内点击结束后把焦点交还字段，让「字段开着」始终意味着「能继续输入、能点外面收起」；
 *      若这次动作弹出了自己的层（焦点已离开容器），字段收起让位——否则会留下一个没有焦点、
 *      又收不到 focusout 的展开态。
 *
 * 判据只用调用方给的 DOM 引用（字段、控件容器）和 `document.activeElement`，不枚举组件类型：
 * 容器里换成任何控件、点击后弹出任何弹层，行为都自动成立。
 */
export interface ExpandingFieldOptions {
  /** 展开态的字段（可聚焦元素）；收起后 ref.current 为 null。 */
  field: RefObject<HTMLElement | null>
  /** 收纳字段与同级控件的容器；按在它里面视为「用户还在这个字段的上下文里」。 */
  controls: RefObject<HTMLElement | null>
  /** 字段当前是否展开。React 的 ref 变化不触发重渲染，用这个开关在展开时挂字段监听。 */
  active: boolean
  /** 收起字段。由调用方决定是改本地状态还是往上 emit。 */
  close: () => void
  /** Escape 关闭字段后的焦点收尾（仅键盘 Escape 路径触发，不影响失焦或点击外部）。 */
  onEscapeClose?: () => void
}

export function useExpandingField({ field, controls, active, close, onEscapeClose }: ExpandingFieldOptions) {
  const pressedInsideControls = useRef(false)
  // 监听器只挂一次，回调里读最新一帧的引用/闭包，避免因 close 每次渲染都是新函数而反复重挂。
  const latest = useRef({ field, controls, close, onEscapeClose })

  useEffect(() => {
    latest.current = { field, controls, close, onEscapeClose }
  })

  /*
   * controls 常驻：挂一次 pointerdown / click。controls 的 pointerdown 一定早于输入框的
   * focusout（后者是 mousedown 的默认动作），所以在这一簇里按下时先记一笔。
   */
  useEffect(() => {
    const element = controls.current
    if (!element) return

    function onControlsPointerDown(event: Event) {
      // 点字段自己不会失焦，别把标记挂到一次不会到来的 focusout 上。
      const fieldElement = latest.current.field.current
      if (fieldElement && event.target instanceof Node && fieldElement.contains(event.target)) return
      pressedInsideControls.current = true
    }

    /** 按钮自己的 click 已经跑完，这里只收尾。 */
    function onControlsClick() {
      pressedInsideControls.current = false

      const fieldElement = latest.current.field.current
      const controlsElement = latest.current.controls.current
      const activeElement = document.activeElement
      /*
       * 焦点跑到容器外，说明这次动作弹出了自己的层（对话框、抽屉）。此时搜索框在下面继续
       * 开着既没用也关不掉——它已经没有焦点，收不到「点外面」的 focusout 了。让搜索让位。
       */
      if (
        activeElement !== null &&
        activeElement !== document.body &&
        controlsElement !== null &&
        !controlsElement.contains(activeElement)
      ) {
        latest.current.close()
        return
      }
      // 其余情况把焦点交还输入框，让展开态始终可以继续输入。
      fieldElement?.focus()
    }

    element.addEventListener('pointerdown', onControlsPointerDown)
    element.addEventListener('click', onControlsClick)
    return () => {
      element.removeEventListener('pointerdown', onControlsPointerDown)
      element.removeEventListener('click', onControlsClick)
    }
  }, [controls])

  /*
   * 字段只在展开时存在，所以按 active 挂/摘监听。React 的 ref 在提交后才赋值，effect 跑在
   * 提交之后，能拿到已挂载的 DOM。
   */
  useEffect(() => {
    if (!active) return
    const element = field.current
    if (!element) return

    /**
     * 收起字段的唯一出口：离开字段，且这次离开不是「还在搜索上下文里」造成的。
     *
     * 除了 pointerdown 标记，还要看 focusout 的去向：方向键从输入框把焦点交给结果链接时，
     * 焦点仍在 controls 容器内，这不算离开，不能把整个搜索关掉。
     */
    function onFieldFocusOut(event: FocusEvent) {
      if (pressedInsideControls.current) {
        pressedInsideControls.current = false
        return
      }
      const controlsElement = latest.current.controls.current
      if (event.relatedTarget instanceof Node && controlsElement?.contains(event.relatedTarget)) return
      latest.current.close()
    }

    /** 键盘离开没有 focusout 之外的入口，Escape 属于这套策略的一部分。 */
    function onFieldKeydown(event: Event) {
      if (!(event instanceof KeyboardEvent) || event.key !== ESCAPE_KEY) return
      event.preventDefault()
      latest.current.close()
      latest.current.onEscapeClose?.()
    }

    element.addEventListener('focusout', onFieldFocusOut)
    element.addEventListener('keydown', onFieldKeydown)
    return () => {
      element.removeEventListener('focusout', onFieldFocusOut)
      element.removeEventListener('keydown', onFieldKeydown)
    }
  }, [active, field])
}
