import { watch, type Ref } from 'vue'

/**
 * 工具条里「展开式字段」（通常是搜索框）的开关策略。
 *
 * 它针对的是一类模式，不是某个组件：一个会抢占焦点的字段，展开/收起会改变同级控件的布局，
 * 而 `focusout` 发生在 `mousedown` 的默认动作里——若当场收起，这次点击的 `mouseup` 就落在
 * 挪走的元素上，`click` 不再派发，点别的按钮等于只关掉了字段。**前提**因此有两条：
 * 字段的出现/消失会 reflow，且它接管焦点；不满足这两条（例如浮层形式的搜索）不需要它。
 *
 * 策略：
 *
 *   1. 按在 `controls`（放字段和同级控件的那块容器）里时不收：这一簇的点击照常完成，
 *      字段保持展开；按在容器外或键盘 Tab 离开时才收；
 *   2. 簇内点击结束后把焦点交还字段，让「字段开着」始终意味着「能继续输入、能点外面收起」；
 *      若这次动作弹出了自己的层（焦点已离开容器），字段收起让位——否则会留下一个没有焦点、
 *      又收不到 focusout 的展开态。
 *
 * 判据只用调用方给的 DOM 引用（字段、控件容器）和 `document.activeElement`，**不枚举组件类型**：
 * 容器里换成任何控件、点击后弹出任何弹层，行为都自动成立。
 *
 * 事件由 hook 自己挂到这两个 ref 上，调用方只负责交引用——不再需要把 handler 名写进模板，
 * 也就不会漏绑或绑错。同一模式的下一处（筛选字段、内联重命名）声明两个 ref、调一次这个函数即可。
 */
export interface ExpandingFieldRefs {
  /** 展开态的字段（可聚焦元素）。收起后为 undefined。 */
  field: Ref<HTMLElement | undefined>
  /** 收纳字段与同级控件的容器；按在它里面视为「用户还在这个字段的上下文里」。 */
  controls: Ref<HTMLElement | undefined>
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
     * 既没用也关不掉——它已经没有焦点，收不到「点外面」的 focusout 了。让搜索让位，把状态
     * 收回「关闭」，比留一个悬空的展开态好。
     */
    if (active !== null && active !== document.body && !controls.value?.contains(active)) {
      close()
      return
    }
    // 其余情况（焦点被按钮带走、丢给 body）把焦点交还输入框，让展开态始终可以继续输入。
    field.value?.focus()
  }

  /** 收起字段的唯一出口：离开字段，且这次离开不是按在操作控件里造成的。 */
  function onFieldFocusOut() {
    if (!pressedInsideControls) {
      close()
      return
    }
    pressedInsideControls = false
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
      /*
       * 字段出现即意味着「展开」，展开态必须能直接输入。
       * 组件（Lit）自己的 shadow 内的原生 input 要到它更新完才存在，同一 tick 调 focus() 会空转，
       * 所以放到下一帧；期间搜索若已收起，就别再动焦点。
       */
      const focusFrame = requestAnimationFrame(() => element.focus())
      onCleanup(() => {
        cancelAnimationFrame(focusFrame)
        element.removeEventListener('focusout', onFieldFocusOut)
        element.removeEventListener('keydown', onFieldKeydown)
      })
    },
    { flush: 'post' }
  )
}
