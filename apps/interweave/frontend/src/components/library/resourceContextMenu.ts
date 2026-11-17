import type { WebUiContextMenu } from '@greypan/web-ui'
import { nextTick, ref, watch, type Ref } from 'vue'

import type { ResourceView } from '@/stores/library'

/** 容器长按空格等同 ContextMenu 键：按住到这个时长才把它当成「打开当前行菜单」。 */
export const CONTEXT_MENU_LONG_PRESS_MS = 500

export interface ResourceContextMenuTimers {
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>
  clearTimeout(handle: ReturnType<typeof setTimeout>): void
  requestFrame?(callback: () => void): void
}

export interface ResourceContextMenuHost {
  /** 列表容器宿主；焦点停在这里时 Space 的语义由本控制器接管。 */
  rowsElement(): HTMLElement | null
  /** 从行元素解析当前渲染的资源；行已卸载时返回 null。 */
  resolveForRow(row: HTMLElement): ResourceView | null
  activate(resource: ResourceView): void
  resolveDefaultOpenWith(resource: ResourceView | null): Promise<string>
  anchor(): WebUiContextMenu | null
  rowAnchor(index: number): HTMLElement | null
  navigateToIndex(index: number): Promise<void>
  focusIndex(index: number): void
  activeIndex(): number
  activeResource(): ResourceView | null
  activeResourceId(): string | null
  /** 扫选手势期间系统补发的 contextmenu 不是「用户想看菜单」。 */
  suppressed(): boolean
  resources(): ResourceView[]
}

export interface ResourceContextMenuController {
  contextResource: Ref<ResourceView | null>
  defaultOpenWithName: Ref<string>
  onRowsFocusin(event: FocusEvent): void
  onTouchPointerDown(event: PointerEvent): void
  /** 行上的原生 contextmenu：定位并打开菜单。 */
  openFromRow(resource: ResourceView, event: MouseEvent): Promise<void>
  close(): void
  /** 挂上 window 上「容器长按 Space」状态机，返回卸载函数。 */
  bindWindowSpaceMachine(): () => void
}

const defaultTimers: ResourceContextMenuTimers = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: handle => clearTimeout(handle),
  requestFrame: callback => requestAnimationFrame(() => callback())
}

/**
 * 右键菜单的身份机：contextResource 有四个来源（行上的原生 contextmenu、行内 focusin、
 * 触屏 pointerdown、容器长按 Space），打开还要按序号作废旧请求、异步补「打开方式」名字。
 *
 * 四个来源各自补一次 contextResource 是因为 web-ui-context-menu 不看它、只按
 * document.activeElement 定位，而菜单项全部 gate 在它上面；漏掉一个来源就会弹出
 * 「位置在某行、内容属于另一行（或为空）」的菜单。锚点丢失、布尔属性、焦点与 dialog
 * 竞争的坑都收敛在这里一处处理。
 */
export function createResourceContextMenu(
  host: ResourceContextMenuHost,
  ports: { timers?: ResourceContextMenuTimers } = {}
): ResourceContextMenuController {
  const timers = ports.timers ?? defaultTimers
  const contextResource = ref<ResourceView | null>(null)
  const defaultOpenWithName = ref('')
  let openVersion = 0
  let defaultOpenWithRequest = 0
  let containerSpaceTimer: ReturnType<typeof setTimeout> | undefined
  let containerSpaceMenuOpened = false

  /*
   * 「打开方式」的名字是异步查出来的，而右键可以连续落到不同行上：用请求序号作废旧结果，
   * 否则慢的那次查询会把后一行的名字盖回去。名字只影响文案，查不到时回落系统默认应用。
   */
  watch(contextResource, resource => {
    const request = ++defaultOpenWithRequest
    defaultOpenWithName.value = ''
    void host.resolveDefaultOpenWith(resource).then(name => {
      if (request !== defaultOpenWithRequest) return
      defaultOpenWithName.value = name
    })
  })

  function clearContainerSpaceTimer() {
    if (containerSpaceTimer === undefined) return
    timers.clearTimeout(containerSpaceTimer)
    containerSpaceTimer = undefined
  }

  function resetContainerSpaceState() {
    clearContainerSpaceTimer()
    containerSpaceMenuOpened = false
  }

  /*
   * 容器自身也是 tab stop（Tab 停在列表大区域时，长按 Space 与 ContextMenu 键一致地把右键菜单
   * 委托给当前活动行）：web-ui-context-menu 在捕获阶段只认事件目标本身（rows），长按时会以
   * contextResource=null 弹出一张锚在列表底部的残缺菜单。这里在 window 捕获阶段接管「焦点停在
   * 列表容器时的 Space」：短按松开仍按 enterList 进入活动行；长按到 500ms 则激活并聚焦该行，再
   * 经同一条 ContextMenu 键通路打开属于该行的菜单，并吞掉长按期间的 repeat 直到松开。
   */
  function handleWindowSpaceKeydown(event: KeyboardEvent) {
    if (event.key !== ' ') return
    if (containerSpaceMenuOpened) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const rows = host.rowsElement()
    if (
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target !== rows ||
      !host.resources().length
    ) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (event.repeat || containerSpaceTimer !== undefined) return
    containerSpaceTimer = timers.setTimeout(() => {
      containerSpaceTimer = undefined
      if (document.activeElement !== rows || !host.resources().length) return
      const index = host.activeIndex()
      const resource = host.activeResource()
      if (!resource) return
      containerSpaceMenuOpened = true
      void (async () => {
        await host.navigateToIndex(index)
        contextResource.value = resource
        await nextTick()
        const anchor = host.rowAnchor(index)
        if (!anchor) return
        anchor.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, composed: true, cancelable: true })
        )
      })()
    }, CONTEXT_MENU_LONG_PRESS_MS)
  }

  function handleWindowSpaceKeyup(event: KeyboardEvent) {
    if (event.key !== ' ') return
    if (containerSpaceMenuOpened) {
      event.preventDefault()
      event.stopPropagation()
      containerSpaceMenuOpened = false
      return
    }
    if (containerSpaceTimer === undefined) return
    clearContainerSpaceTimer()
    event.preventDefault()
    event.stopPropagation()
    const rows = host.rowsElement()
    if (document.activeElement !== rows || !host.resources().length) return
    const activeId = host.activeResourceId()
    const active = host.resources().findIndex(resource => resource.id === activeId)
    if (active >= 0) host.focusIndex(active)
    else void host.navigateToIndex(0)
  }

  /*
   * 焦点是 contextResource 的第二个来源：纯键盘呼出时行上没有 contextmenu 事件。
   * 落焦到容器自己身上时置空，免得拿上一条资源的菜单项去填一张锚在列表上的菜单。
   */
  function onRowsFocusin(event: FocusEvent) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target !== host.rowsElement()) clearContainerSpaceTimer()
    const row = target.closest<HTMLElement>('[data-resource-row]')
    contextResource.value = row ? host.resolveForRow(row) : null
  }

  /*
   * 触屏长按是 contextResource 的第三个来源：组件自己在宿主上计时打开 menu，不发事件，
   * 也不认行。在 pointerdown 就落定，长按计时器到期时菜单项已是完整形态。
   */
  function onTouchPointerDown(event: PointerEvent) {
    if (event.pointerType !== 'touch') return
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const row = target.closest<HTMLElement>('[data-resource-row]')
    contextResource.value = row ? host.resolveForRow(row) : null
  }

  async function openFromRow(resource: ResourceView, event: MouseEvent) {
    // 长按扫选手势会顺带触发系统级 contextmenu，那不是「用户想看 menu」，挡掉。
    if (host.suppressed()) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    event.stopPropagation()
    // 右键呼出 menu 本身也写当前行：emit activate 让父级把 activeResourceId 置为该行资源 id。
    // 不调用 focusIndex()——它会滚到行并 focus，抢走右键改名时正在编辑器里的焦点。
    host.activate(resource)
    const { clientX, clientY } = event
    const version = ++openVersion
    contextResource.value = resource
    await nextTick()
    // WebKit 需先结束原生右键事件，再打开模态菜单，避免系统菜单与定位冲突。
    const open = () => {
      if (version === openVersion) host.anchor()?.openAt(clientX, clientY)
    }
    if (timers.requestFrame) timers.requestFrame(open)
    else open()
  }

  function close() {
    openVersion++
    host.anchor()?.close()
  }

  function bindWindowSpaceMachine() {
    window.addEventListener('keydown', handleWindowSpaceKeydown, true)
    window.addEventListener('keyup', handleWindowSpaceKeyup, true)
    window.addEventListener('blur', resetContainerSpaceState)
    return () => {
      window.removeEventListener('keydown', handleWindowSpaceKeydown, true)
      window.removeEventListener('keyup', handleWindowSpaceKeyup, true)
      window.removeEventListener('blur', resetContainerSpaceState)
      resetContainerSpaceState()
    }
  }

  return {
    contextResource,
    defaultOpenWithName,
    onRowsFocusin,
    onTouchPointerDown,
    openFromRow,
    close,
    bindWindowSpaceMachine
  }
}
