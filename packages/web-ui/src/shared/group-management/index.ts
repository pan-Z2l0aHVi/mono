import { definePlugin } from '@greypan/js-kit'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

const groupManagedItem = Symbol('web-ui.group-managed-item')

// 组实例的唯一身份。同一子项可能先后属于多个组（如跨组移动），共享通道必须
// 按 owner 归属写入，防止旧组晚到的清理覆写新组刚安装的 context。
const groupOwnerToken = Symbol('web-ui.group-owner-token')

type GroupOwner = Record<typeof groupOwnerToken, true>

type GroupManagedItem<Context> = HTMLElement & {
  [groupManagedItem]?: (owner: GroupOwner, context: Context | undefined) => void
}

interface GroupControllerHost extends HTMLElement, ReactiveControllerHost {
  readonly renderRoot: Element | DocumentFragment
}

export interface SelectionGroupContext {
  readonly disabled: boolean
}

export interface ButtonGroupContext {
  readonly direction: 'horizontal' | 'vertical'
  readonly isLast: boolean
}

/**
 * 创建受管理 group 的子项侧能力：提供只读 context 视图，并注册由 group owner
 * 推送的接收通道。在 `make()` 时完成注册，组件无需再编写 constructor 样板。
 */
function createGroupOwner(): GroupOwner {
  return { [groupOwnerToken]: true }
}

export function defineGroupManaged<Context>(
  item: HTMLElement,
  options: {
    requestUpdate: () => void
    equals?: (a: Context | undefined, b: Context | undefined) => boolean
  }
) {
  return definePlugin(() => {
    let context: Context | undefined
    const equals = options.equals ?? Object.is

    const setContext = (next: Context | undefined) => {
      if (equals(context, next)) return
      context = next
      options.requestUpdate()
    }

    registerGroupManagedItem(item, setContext)

    return {
      getContext(): Context | undefined {
        return context
      }
    }
  })
}

function installGroupContext<Context>(item: HTMLElement, owner: GroupOwner, context: Context | undefined) {
  ;(item as GroupManagedItem<Context>)[groupManagedItem]?.(owner, context)
}

function registerGroupManagedItem<Context>(item: HTMLElement, setContext: (context: Context | undefined) => void) {
  let currentOwner: GroupOwner | undefined
  ;(item as GroupManagedItem<Context>)[groupManagedItem] = (owner, context) => {
    // 安装总是被接受并转移归属（安装方来自实时 DOM 查询，身份可信）；
    // 清理只在写入者仍是当前归属者时执行——跨组移动后旧组晚到的
    // 移除同步不得覆写新组刚安装的 context。
    if (context === undefined && currentOwner !== owner) return
    currentOwner = context === undefined ? undefined : owner
    setContext(context)
  }
}

export interface GroupLifecycle {
  sync(): boolean
  disconnect(): void
  handleChange?(event: Event): void
}

interface GroupControllerOptions {
  afterSync?: () => void
}

/**
 * 把组生命周期插件接入 Lit，协调规则不落在组件生命周期方法里。
 */
export class GroupController implements ReactiveController {
  private connected = false
  private observer: MutationObserver | null = null
  private observedSlots = new Set<HTMLSlotElement>()
  constructor(
    private readonly host: GroupControllerHost,
    private readonly lifecycle: GroupLifecycle,
    private readonly options: GroupControllerOptions = {}
  ) {
    host.addController(this)
  }

  hostConnected() {
    this.connected = true
    this.host.addEventListener('change', this.handleChange, true)
    this.observeHost()
    this.observeSlots()
    this.sync()
  }

  hostUpdated() {
    this.observeSlots()
    this.sync()
  }

  hostDisconnected() {
    this.connected = false
    this.host.removeEventListener('change', this.handleChange, true)
    this.disconnectSlots()
    this.disconnectHostObserver()
    this.lifecycle.disconnect()
  }

  private readonly handleChange = (event: Event) => {
    this.lifecycle.handleChange?.(event)
  }

  private readonly handleSlotChange = () => {
    if (!this.connected) return
    this.sync()
  }

  private readonly handleMutations = () => {
    if (!this.connected) return
    this.sync()
  }

  sync() {
    if (!this.lifecycle.sync()) return
    this.options.afterSync?.()
  }

  private observeHost() {
    this.disconnectHostObserver()
    // 监听 light DOM 的增删，覆盖 Vue v-if / React && 的 comment 锚点替换与深层包裹
    this.observer = new MutationObserver(this.handleMutations)
    this.observer.observe(this.host, { childList: true, subtree: true })
  }

  private disconnectHostObserver() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }

  private observeSlots() {
    const root = this.host.renderRoot as Element
    const slots = root.querySelectorAll<HTMLSlotElement>('slot')
    for (const slot of slots) {
      if (!this.observedSlots.has(slot)) {
        slot.addEventListener('slotchange', this.handleSlotChange)
        this.observedSlots.add(slot)
      }
    }
    // 清理已移除的 slot（热更新等场景）
    for (const slot of this.observedSlots) {
      if (!root.contains(slot)) {
        slot.removeEventListener('slotchange', this.handleSlotChange)
        this.observedSlots.delete(slot)
      }
    }
  }

  private disconnectSlots() {
    for (const slot of this.observedSlots) {
      slot.removeEventListener('slotchange', this.handleSlotChange)
    }
    this.observedSlots.clear()
  }
}

export interface GroupCoordinatorOptions<Item extends HTMLElement, Value> {
  readonly host: HTMLElement
  readonly getItems: () => readonly Item[]
  readonly getValue: () => Value
  readonly setValue: (value: Value) => void
  readonly getDisabled: () => boolean
  readonly isItem: (target: EventTarget | null) => target is Item
  readonly isItemSelected: (item: Item, value: Value) => boolean
  readonly getNextValue: (item: Item, value: Value) => Value
  readonly valuesEqual: (a: Value, b: Value) => boolean
  readonly copyValue: (value: Value) => Value
  readonly setItemSelected: (item: Item, selected: boolean) => void
  readonly dispatchValueChange: () => void
}

/**
 * 在一个内部插件接口后收敛选中态、继承禁用与受管子项成员关系。
 */
export function defineGroupCoordinator<Item extends HTMLElement, Value>(options: GroupCoordinatorOptions<Item, Value>) {
  return definePlugin(() => {
    const owner = createGroupOwner()
    let items = new Set<Item>()
    let lastValue: Value | undefined
    let lastDisabled: boolean | undefined
    let initialized = false

    const sync = (): boolean => {
      const nextItems = new Set(options.getItems())
      const membershipChanged = nextItems.size !== items.size || [...nextItems].some(item => !items.has(item))
      const value = options.getValue()
      const disabled = options.getDisabled()
      const selectionChanged =
        !initialized ||
        !options.valuesEqual(value, lastValue as Value) ||
        disabled !== lastDisabled ||
        membershipChanged

      for (const item of items) {
        if (!nextItems.has(item)) installGroupContext<SelectionGroupContext>(item, owner, undefined)
      }

      for (const item of nextItems) {
        installGroupContext<SelectionGroupContext>(
          item,
          owner,
          disabled ? DISABLED_SELECTION_CONTEXT : ENABLED_SELECTION_CONTEXT
        )
        if (selectionChanged) options.setItemSelected(item, options.isItemSelected(item, value))
      }

      items = nextItems
      lastValue = options.copyValue(value)
      lastDisabled = disabled
      initialized = true
      return selectionChanged
    }

    return {
      sync,
      disconnect() {
        for (const item of items) installGroupContext<SelectionGroupContext>(item, owner, undefined)
        items.clear()
        initialized = false
        lastValue = undefined
        lastDisabled = undefined
      },
      handleChange(event: Event) {
        if (options.getDisabled() || !options.isItem(event.target) || !options.host.contains(event.target)) {
          return
        }

        const current = options.getValue()
        const next = options.getNextValue(event.target, current)
        if (options.valuesEqual(current, next)) return

        options.setValue(next)
        options.dispatchValueChange()
      }
    }
  })
}

const ENABLED_SELECTION_CONTEXT: SelectionGroupContext = { disabled: false }
const DISABLED_SELECTION_CONTEXT: SelectionGroupContext = { disabled: true }

export interface GroupPresentationOptions<Item extends HTMLElement, Context> {
  readonly getItems: () => readonly Item[]
  readonly getContext: (item: Item, index: number, items: readonly Item[]) => Context
}

/**
 * 为分组子项注册可逆的展示上下文。不持有公开 DOM 属性，成员变化时清空全部上下文。
 */
export function defineGroupPresentation<Item extends HTMLElement, Context>(
  options: GroupPresentationOptions<Item, Context>
) {
  return definePlugin(() => {
    const owner = createGroupOwner()
    let items = new Set<Item>()
    let previousItems: readonly Item[] = []

    return {
      sync(): boolean {
        const nextItems = options.getItems()
        const nextSet = new Set(nextItems)
        const membershipChanged =
          nextItems.length !== previousItems.length || nextItems.some((item, index) => item !== previousItems[index])

        for (const item of items) {
          if (!nextSet.has(item)) installGroupContext<Context>(item, owner, undefined)
        }

        nextItems.forEach((item, index) => installGroupContext(item, owner, options.getContext(item, index, nextItems)))
        items = nextSet
        previousItems = nextItems
        return membershipChanged
      },
      disconnect() {
        for (const item of items) installGroupContext<Context>(item, owner, undefined)
        items.clear()
        previousItems = []
      }
    }
  })
}
