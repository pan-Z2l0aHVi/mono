import { definePlugin } from '@greypan/js-kit'

import type { WebUiOption } from '@/components/option'
import type { OpenOverlayHandle } from '@/shared/overlay/open-overlay'

/**
 * combobox 开合与 option 交互的共享骨架（select / autocomplete）。
 *
 * 与 option-portal 的边界约定一致：交互语义的"差异点"经回调注入，
 * 这里收口两组件逐行复制的生命周期不变量——
 * - open/close 状态迁移顺序：guard → 状态翻转 → open-change 派发 →
 *   激活钩子 → scroll-lock 配对 → portal 模式的 rAF 延迟 openOverlay
 * - close 路径：before-close 钩子（portal 内容先收敛）→ 激活清理 →
 *   scroll-lock 释放 → closeOverlay（关闭后使 portal 引用失效）
 * - option 四事件监听对的绑定/解绑
 * - focusout 的 rAF :focus-within 复核
 * - 键盘导航的环绕游标算法
 */

export interface ComboboxOpenHooks {
  /** 是否允许打开（disabled / readonly 等由组件判断）。 */
  canOpen(): boolean
  getIsOpen(): boolean
  setIsOpen(open: boolean): void
  dispatchOpenChange(): void
  syncScrollLock(open: boolean): void
  /** 是否 portal 模式（决定 openOverlay 是否延迟到下一帧）。 */
  isPortal(): boolean
  openOverlay(isKeyboardNavigation: boolean): void
  closeOverlay(): void
  /** 打开时的激活项初始化（键盘导航取选中/首项，指针打开保留现状）。 */
  onOpen?(isKeyboardNavigation: boolean): void
  /** 关闭前钩子：autocomplete 需先把 light DOM 新增节点收敛进当前 portal content。 */
  onBeforeClose?(): void
  /** 关闭时清理激活状态（清 _activeIndex 与 active 属性）。 */
  onAfterClose?(): void
}

export interface ComboboxOpenController {
  open(isKeyboardNavigation?: boolean): void
  close(): void
}

export function createComboboxOpenController(hooks: ComboboxOpenHooks): ComboboxOpenController {
  function open(isKeyboardNavigation = false) {
    if (hooks.canOpen() === false || hooks.getIsOpen()) return
    hooks.setIsOpen(true)
    hooks.dispatchOpenChange()
    hooks.onOpen?.(isKeyboardNavigation)
    hooks.syncScrollLock(true)
    if (hooks.isPortal()) {
      requestAnimationFrame(() => {
        if (hooks.getIsOpen()) hooks.openOverlay(isKeyboardNavigation)
      })
    } else {
      hooks.openOverlay(isKeyboardNavigation)
    }
  }

  function close() {
    if (!hooks.getIsOpen()) return
    hooks.onBeforeClose?.()
    hooks.setIsOpen(false)
    hooks.dispatchOpenChange()
    hooks.onAfterClose?.()
    hooks.syncScrollLock(false)
    hooks.closeOverlay()
  }

  return { open, close }
}

export interface OptionListenerHandlers {
  onClick: (event: Event) => void
  onPointerOver: (event: PointerEvent) => void
  onPointerDown: (event: PointerEvent) => void
  onUpdate: () => void
}

export interface ComboboxTriggerSource {
  /** 持 ARIA 与委托监听的 trigger 包装 div（shadow 内）。 */
  getWrapper(): HTMLElement | null
  /** `slot[name="trigger"]` 的首个 assigned 元素；无自定义触发器时为 null。 */
  getCustomTrigger(): HTMLElement | null
  /** 默认触发器（shadow 内的 web-ui-input）；未渲染时为 null。 */
  getFallbackTrigger(): HTMLElement | null
}

export interface ComboboxTriggerHandlers {
  /** 触发器文本变化；value 取自触发器 host 的字符串 value 属性。 */
  onInput(value: string): void
  /** 点击触发器区域（含包装 div 自身留白）。 */
  onClick(): void
  onFocusIn(event: FocusEvent): void
  onFocusOut(event: FocusEvent): void
}

export interface ComboboxTriggerApi {
  /** 当前生效的触发器 host：自定义 trigger slot 首个 assigned 元素，否则默认触发器。 */
  getTrigger(): HTMLElement | null
  /** 触发器当前文本；触发器不暴露字符串 value 时返回 null。 */
  getValue(): string | null
  /** 回写文本；仅在文本触发器且值确实变化时写入，避免无谓重渲染。 */
  setValue(value: string): void
  /** 多行可编辑元素判定：Enter 保留换行语义，不接管为「选中高亮项」。 */
  isMultilineEdit(event: KeyboardEvent): boolean
  /**
   * 程序化聚焦当前触发器。组件自带 focus 重定向（web-ui-input/textarea）时落到
   * 内部原生控件；自定义触发器没有该能力时，原生 focus() 聚焦 host 自身。
   */
  focusTrigger(options?: FocusOptions): void
  /** 失焦当前触发器，兜底语义同 focusTrigger。 */
  blurTrigger(): void
  /** 绑定包装 div 上的委托监听（幂等：包装 div 不变则跳过）。 */
  bind(): void
  dispose(): void
}

/**
 * combobox 触发器委托层（autocomplete）。
 *
 * 默认触发器是 shadow 内的 `web-ui-input`，自定义触发器由 `slot[name="trigger"]`
 * 提供（`web-ui-textarea` 等）。两者对组件暴露同一形状：字符串 value、可聚焦、
 * 派发 composed 的 input / click / focusin / focusout。委托层把这些差异收敛成一份接口：
 * 监听统一挂在包装 div 上（事件委托，覆盖 shadow 内与 light DOM 两条路径），
 * 文本读写只认触发器 host 的 value 属性。
 *
 * 焦点用 focusin/focusout 而非 focus/blur：后两者不冒泡，到不了包装 div
 * （实测：shadow 内默认触发器与 light DOM 自定义触发器都不触发包装 div 的 focus/blur）。
 *
 * 触发器自身派发的 change（web-ui-input/textarea 在原生 change 不 composed 时补发）
 * 必须被拦下：组件的 change 只表示「选中提交」，否则失焦即误报一次 change。
 */
export const defineComboboxTrigger = () =>
  definePlugin<ComboboxTriggerApi, ComboboxTriggerSource & ComboboxTriggerHandlers>(source => {
    let boundWrapper: HTMLElement | null = null

    const getTrigger = (): HTMLElement | null => source.getCustomTrigger() ?? source.getFallbackTrigger() ?? null

    const readValue = (trigger: HTMLElement | null): string | null => {
      const value = (trigger as (HTMLElement & { value?: unknown }) | null)?.value
      return typeof value === 'string' ? value : null
    }

    // composed 事件在包装 div 上看到的是触发器 host（或其在 light DOM 内的后代）；
    // 只有来自触发器内部的输入才计入，包装 div 上的其它内容不干扰。
    const isWithinTrigger = (event: Event, trigger: HTMLElement | null): boolean => {
      const target = event.target
      return !!trigger && target instanceof Node && (target === trigger || trigger.contains(target))
    }

    const onInput = (event: Event) => {
      const trigger = getTrigger()
      if (!isWithinTrigger(event, trigger)) return
      const value = readValue(trigger)
      if (value !== null) source.onInput(value)
    }

    const onNativeChange = (event: Event) => {
      if (isWithinTrigger(event, getTrigger())) event.stopPropagation()
    }

    const onClick = () => source.onClick()
    const onFocusIn = (event: FocusEvent) => source.onFocusIn(event)
    const onFocusOut = (event: FocusEvent) => source.onFocusOut(event)

    return {
      getTrigger,
      getValue: () => readValue(getTrigger()),
      setValue(value: string) {
        const trigger = getTrigger()
        const current = readValue(trigger)
        if (!trigger || current === null || current === value) return
        ;(trigger as HTMLElement & { value: string }).value = value
      },
      isMultilineEdit(event: KeyboardEvent) {
        // composedPath()[0] 是未 retarget 的真实可编辑元素：textarea 保留 Enter 换行
        return event.composedPath()[0] instanceof HTMLTextAreaElement
      },
      focusTrigger(options?: FocusOptions) {
        // web-ui-input/textarea 的公共 focus() 已重定向到内部原生控件；普通元素或
        // 未实现 focus 的自定义触发器走原生 HTMLElement.focus()，即聚焦 host 自身
        getTrigger()?.focus(options)
      },
      blurTrigger() {
        getTrigger()?.blur()
      },
      bind() {
        const wrapper = source.getWrapper()
        if (!wrapper || wrapper === boundWrapper) return
        boundWrapper = wrapper
        wrapper.addEventListener('input', onInput)
        wrapper.addEventListener('change', onNativeChange)
        wrapper.addEventListener('click', onClick)
        wrapper.addEventListener('focusin', onFocusIn)
        wrapper.addEventListener('focusout', onFocusOut)
      },
      dispose() {
        const wrapper = boundWrapper
        boundWrapper = null
        if (!wrapper) return
        wrapper.removeEventListener('input', onInput)
        wrapper.removeEventListener('change', onNativeChange)
        wrapper.removeEventListener('click', onClick)
        wrapper.removeEventListener('focusin', onFocusIn)
        wrapper.removeEventListener('focusout', onFocusOut)
      }
    }
  })

/** option 四事件监听对的绑定/解绑；两组件的 handler 签名一致，仅实现不同。 */
export function createOptionListenerBinding(handlers: OptionListenerHandlers) {
  function bind(option: WebUiOption) {
    option.addEventListener('click', handlers.onClick)
    option.addEventListener('pointerover', handlers.onPointerOver)
    option.addEventListener('pointerdown', handlers.onPointerDown)
    option.addEventListener('option-update', handlers.onUpdate)
  }
  function unbind(option: WebUiOption) {
    option.removeEventListener('click', handlers.onClick)
    option.removeEventListener('pointerover', handlers.onPointerOver)
    option.removeEventListener('pointerdown', handlers.onPointerDown)
    option.removeEventListener('option-update', handlers.onUpdate)
  }
  return { bind, unbind }
}

/**
 * focusout 关闭复核：焦点是否真的离开了宿主与面板。
 * rAF 等待 click/pointerdown 相关的焦点迁移完成后再判定。
 */
export function handleComboboxFocusOut(
  host: HTMLElement,
  getHandle: () => OpenOverlayHandle | null | undefined,
  getIsOpen: () => boolean,
  close: () => void
): void {
  requestAnimationFrame(() => {
    const handle = getHandle()
    if (getIsOpen() && !host.matches(':focus-within') && !handle?.hasFocusWithin()) {
      close()
    }
  })
}

/**
 * 环绕游标：在 enabled 列表内按 delta 移动；从 -1（无激活）向下取首项、向上取末项。
 * 返回在 enabled 中的下一索引；调用方负责换算回全量 options 索引。
 */
export function nextWrappingIndex(enabledCount: number, currentIdx: number, delta: number): number {
  if (enabledCount === 0) return -1
  let nextIdx = currentIdx + delta
  if (nextIdx < 0) nextIdx = enabledCount - 1
  if (nextIdx >= enabledCount) nextIdx = 0
  return nextIdx
}
