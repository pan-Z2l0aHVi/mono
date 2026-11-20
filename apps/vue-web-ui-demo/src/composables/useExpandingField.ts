import { watch, type Ref } from 'vue'

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
 *
 * 事件由本 composable 自己挂到这两个 ref 上，调用方只负责交引用；字段出现时的聚焦仍由
 * 调用方负责（demo 的 Search 已经在 open 时等 Lit 更新完成后 focus）。
 */
export interface ExpandingFieldRefs {
  /** 展开态的字段（可聚焦元素）。收起后为 undefined。 */
  field: Ref<HTMLElement | undefined>
  /** 收纳字段与同级控件的容器；按在它里面视为「用户还在这个字段的上下文里」。 */
  controls: Ref<HTMLElement | null | undefined>
  /** 收起字段。由调用方决定是改本地状态还是往上 emit。 */
  close: () => void
  /** Escape 关闭字段后的焦点收尾（仅键盘 Escape 路径触发，不影响失焦或点击外部）。 */
  onEscapeClose?: () => void
}

export function useExpandingField({ field, controls, close, onEscapeClose }: ExpandingFieldRefs) {
  let pressedInsideControls = false

  /*
   * controls 的 pointerdown 一定早于输入框的 focusout：后者是 mousedown 的默认动作的一部分。
   * 所以在这一簇里按下时先记一笔，让随后的 focusout 知道「用户还在搜索上下文里」。
   */
  function onControlsPointerDown(event: Event) {
    // 点字段自己不会失焦，别把标记挂到一次不会到来的 focusout 上。
    if (event.target instanceof Node && field.value?.contains(event.target)) return
    pressedInsideControls = true
  }

  /** 按钮自己的 click 已经跑完，这里只收尾。 */
  function onControlsClick() {
    pressedInsideControls = false

    const active = document.activeElement
    /*
     * 焦点跑到容器外，说明这次动作弹出了自己的层（对话框、抽屉）。此时搜索框在下面继续开着
     * 既没用也关不掉——它已经没有焦点，收不到「点外面」的 focusout 了。让搜索让位。
     */
    if (active !== null && active !== document.body && !controls.value?.contains(active)) {
      close()
      return
    }
    // 其余情况（焦点被按钮带走、丢给 body）把焦点交还输入框，让展开态始终可以继续输入。
    field.value?.focus()
  }

  /**
   * 收起字段的唯一出口：离开字段，且这次离开不是「还在搜索上下文里」造成的。
   *
   * 除了 pointerdown 标记，还要看 focusout 的去向：方向键从输入框把焦点交给结果链接时，
   * 焦点仍在 controls 容器内，这不算离开，不能把整个搜索关掉。
   */
  function onFieldFocusOut(event: FocusEvent) {
    if (pressedInsideControls) {
      pressedInsideControls = false
      return
    }
    if (event.relatedTarget instanceof Node && controls.value?.contains(event.relatedTarget)) return
    close()
  }

  /** 键盘离开没有 focusout 之外的入口，Escape 属于这套策略的一部分。 */
  function onFieldKeydown(event: Event) {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Escape') return
    event.preventDefault()
    close()
    onEscapeClose?.()
  }

  /*
   * 两个 ref 都随渲染变化（字段只在展开时存在），所以用 watch + 清理函数绑定和摘除监听，
   * 而不是在 setup 里挂一次。`flush: 'post'` 保证元素已经进 DOM。
   */
  watch(
    controls,
    (element, _previous, onCleanup) => {
      if (!element) return
      element.addEventListener('pointerdown', onControlsPointerDown)
      element.addEventListener('click', onControlsClick)
      onCleanup(() => {
        element.removeEventListener('pointerdown', onControlsPointerDown)
        element.removeEventListener('click', onControlsClick)
      })
    },
    { flush: 'post' }
  )

  watch(
    field,
    (element, _previous, onCleanup) => {
      if (!element) return
      element.addEventListener('focusout', onFieldFocusOut)
      element.addEventListener('keydown', onFieldKeydown)
      onCleanup(() => {
        element.removeEventListener('focusout', onFieldFocusOut)
        element.removeEventListener('keydown', onFieldKeydown)
      })
    },
    { flush: 'post' }
  )
}
