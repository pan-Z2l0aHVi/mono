const ESCAPE_KEY = 'Escape'

export interface ExpandingFieldBinding {
  getField(): HTMLElement | null | undefined
  getControls(): HTMLElement | null | undefined
  close(): void
  onEscapeClose?: () => void
}

export interface ExpandingFieldController {
  attachControls(element: HTMLElement | null | undefined): void
  attachField(element: HTMLElement | null | undefined): void
  dispose(): void
}

/**
 * 头部工具条里「展开式字段」（搜索框）的开关与焦点收尾策略（框架无关内部原语）。
 *
 * 1. 按在 `controls`（字段与同级控件容器）内时不收起，保证同级控件点击照常派发；
 *    按在容器外或键盘 Tab 离开时收起；
 * 2. 容器内点击结束后把焦点交还字段；若动作弹出独立层（焦点移出容器），字段收起让位；
 * 3. 字段本体的 Escape 触发关闭。
 */
export function createExpandingFieldController(binding: ExpandingFieldBinding): ExpandingFieldController {
  let pressedInsideControls = false
  let listeningWindowPointer = false
  let currentControls: HTMLElement | null = null
  let currentField: HTMLElement | null = null

  function detachWindowPointerListeners() {
    if (!listeningWindowPointer) return
    window.removeEventListener('pointerup', onWindowPointerUp, true)
    window.removeEventListener('pointercancel', onWindowPointerCancel, true)
    listeningWindowPointer = false
  }

  function attachWindowPointerListeners() {
    if (listeningWindowPointer) return
    window.addEventListener('pointerup', onWindowPointerUp, true)
    window.addEventListener('pointercancel', onWindowPointerCancel, true)
    listeningWindowPointer = true
  }

  function onWindowPointerUp(event: Event) {
    detachWindowPointerListeners()
    if (!pressedInsideControls) return
    const releasedInsideControls = event.target instanceof Node && Boolean(currentControls?.contains(event.target))
    if (!releasedInsideControls) {
      pressedInsideControls = false
      return
    }
    queueMicrotask(() => {
      pressedInsideControls = false
    })
  }

  function onWindowPointerCancel() {
    detachWindowPointerListeners()
    pressedInsideControls = false
  }

  function onControlsPointerDown(event: Event) {
    const fieldElement = binding.getField()
    if (fieldElement && event.target instanceof Node && fieldElement.contains(event.target)) return
    pressedInsideControls = true
    attachWindowPointerListeners()
  }

  function onControlsPointerCancel() {
    detachWindowPointerListeners()
    pressedInsideControls = false
  }

  function onControlsClick() {
    detachWindowPointerListeners()
    pressedInsideControls = false
    const fieldElement = binding.getField()
    const controlsElement = binding.getControls()
    const activeElement = document.activeElement
    if (
      activeElement !== null &&
      activeElement !== document.body &&
      controlsElement !== null &&
      controlsElement !== undefined &&
      !controlsElement.contains(activeElement)
    ) {
      binding.close()
      return
    }
    fieldElement?.focus()
  }

  function onFieldFocusOut(event: FocusEvent) {
    if (pressedInsideControls) {
      pressedInsideControls = false
      return
    }
    const controlsElement = binding.getControls()
    if (event.relatedTarget instanceof Node && controlsElement?.contains(event.relatedTarget)) return
    binding.close()
  }

  function onFieldKeydown(event: Event) {
    if (!(event instanceof KeyboardEvent) || event.key !== ESCAPE_KEY) return
    event.preventDefault()
    binding.close()
    binding.onEscapeClose?.()
  }

  function detachControls() {
    detachWindowPointerListeners()
    if (!currentControls) return
    currentControls.removeEventListener('pointerdown', onControlsPointerDown)
    currentControls.removeEventListener('pointercancel', onControlsPointerCancel)
    currentControls.removeEventListener('click', onControlsClick)
    currentControls = null
    pressedInsideControls = false
  }

  function detachField() {
    if (!currentField) return
    currentField.removeEventListener('focusout', onFieldFocusOut)
    currentField.removeEventListener('keydown', onFieldKeydown)
    currentField = null
  }

  return {
    attachControls(element) {
      const next = element ?? null
      if (next === currentControls) return
      detachControls()
      if (!next) return
      currentControls = next
      currentControls.addEventListener('pointerdown', onControlsPointerDown)
      currentControls.addEventListener('pointercancel', onControlsPointerCancel)
      currentControls.addEventListener('click', onControlsClick)
    },

    attachField(element) {
      const next = element ?? null
      if (next === currentField) return
      detachField()
      if (!next) return
      currentField = next
      currentField.addEventListener('focusout', onFieldFocusOut)
      currentField.addEventListener('keydown', onFieldKeydown)
    },

    dispose() {
      pressedInsideControls = false
      detachControls()
      detachField()
    }
  }
}
