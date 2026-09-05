import { definePlugin } from '@greypan/js-kit'
import { ContextConsumer, ContextProvider, createContext, type Context } from '@lit/context'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

/*
 * 下行通道基于 @lit/context（ADR-0040）：root 上的 ContextProvider 以
 * `ReadonlyMap<HTMLElement, Context>` 为载荷向全子树广播，子项侧
 * ContextConsumer 订阅并按自身元素取条目。context-request 事件 composed，
 * 可穿过中间 shadow 边界；custom element 升级顺序保证祖先先于后代升级，
 * provider 总是先于子项请求就绪。成员追踪（querySelectorAll +
 * MutationObserver/slotchange）、点击归因与 setItemSelected 上行写回
 * 不在下行通道内，仍由 GroupController 驱动。
 */

export interface SelectionGroupContext {
  readonly disabled: boolean
}

export interface ButtonGroupContext {
  readonly direction: 'horizontal' | 'vertical'
  readonly isLast: boolean
}

// 载荷类型仅编译期品牌化；按载荷形状分两个 key，避免异构树串扰。
// createContext 泛型顺序为 <ValueType, K>。
const SELECTION_GROUP_CONTEXT = createContext<ReadonlyMap<HTMLElement, SelectionGroupContext>, symbol>(
  Symbol('web-ui.selection-group-context')
)

const BUTTON_GROUP_CONTEXT = createContext<ReadonlyMap<HTMLElement, ButtonGroupContext>, symbol>(
  Symbol('web-ui.button-group-context')
)

// 两个 key 的运行时形状一致（Map 载荷），泛型插件内部统一按宽松类型驱动。
type AnyGroupContext = Context<symbol, ReadonlyMap<HTMLElement, unknown>>

const SELECTION_GROUP_CONTEXT_LOOSE = SELECTION_GROUP_CONTEXT as unknown as AnyGroupContext
const BUTTON_GROUP_CONTEXT_LOOSE = BUTTON_GROUP_CONTEXT as unknown as AnyGroupContext

export const selectionGroupContextKey: AnyGroupContext = SELECTION_GROUP_CONTEXT_LOOSE
export const buttonGroupContextKey: AnyGroupContext = BUTTON_GROUP_CONTEXT_LOOSE

interface GroupControllerHost extends HTMLElement, ReactiveControllerHost {
  readonly renderRoot: Element | DocumentFragment
}

/**
 * 创建受管理 group 的子项侧能力：订阅最近 provider 的 context 载荷并提取
 * 自身条目。在 `make()` 时完成注册，组件无需再编写 constructor 样板。
 */
export function defineGroupManaged<Context>(
  item: HTMLElement & ReactiveControllerHost,
  options: {
    /** 与所属根组件使用的 context key 一致。 */
    context: AnyGroupContext
    requestUpdate: () => void
    equals?: (a: Context | undefined, b: Context | undefined) => boolean
  }
) {
  return definePlugin(() => {
    let context: Context | undefined
    const equals = options.equals ?? Object.is

    const consumer = new ContextConsumer(item, {
      context: options.context,
      subscribe: true,
      callback: payload => {
        const next = (payload as ReadonlyMap<HTMLElement, Context> | undefined)?.get(item)
        if (equals(context, next)) return
        context = next
        options.requestUpdate()
      }
    })

    /*
     * 离开 group（被移出 provider 子树）时 ContextConsumer 只是静默退订，
     * 不会收到「条目已移除」的通知：显式清空上下文，恢复独立控件语义
     * （如 checkbox 恢复自身表单提交）。跨组移动先断连清空、再重连订阅新组。
     */
    item.addController({
      hostDisconnected() {
        if (equals(context, undefined)) return
        context = undefined
        options.requestUpdate()
      }
    })

    return {
      getContext(): Context | undefined {
        return context
      },
      // 供测试或特殊场景确认订阅状态。
      isSubscribed(): boolean {
        return consumer.value !== undefined
      }
    }
  })
}

export interface GroupPresentationOptions<Item extends HTMLElement, Context> {
  readonly host: HTMLElement
  /** 与子项 defineGroupManaged 使用的 context key 一致。 */
  readonly context: AnyGroupContext
  readonly getItems: () => readonly Item[]
  readonly getContext: (item: Item, index: number, items: readonly Item[]) => Context
}

/**
 * 为分组子项注册可逆的展示上下文（@lit/context 下行通道）。不持有公开 DOM
 * 属性；sync() 以新 Map 载荷整体广播，成员变化体现为子项条目消失。
 */
export function defineGroupPresentation<Item extends HTMLElement, Context>(
  options: GroupPresentationOptions<Item, Context>
) {
  return definePlugin(() => {
    const provider = new ContextProvider(options.host, {
      context: options.context,
      initialValue: new Map<HTMLElement, unknown>()
    })

    return {
      sync(): boolean {
        const nextItems = options.getItems()
        const payload = new Map<HTMLElement, unknown>()
        nextItems.forEach((item, index) => payload.set(item, options.getContext(item, index, nextItems)))
        // 新 Map 实例保证 Object.is 判定为变更，全量通知订阅者。
        // 每次 hostUpdated 都重播（即使成员/方向未变）是有意形态：每次新建
        // context 对象，但子项 defineGroupManaged 的 equals 门控 requestUpdate
        // （标量字段比较），重播不产生多余渲染；代价是比「仅成员变化才通知」
        // 更频繁的广播事件，换取零状态追踪的简单性（与 GroupController 的
        // 全量 sync 对齐）。
        provider.setValue(payload)
        return true
      },
      disconnect() {
        provider.setValue(new Map())
      }
    }
  })
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

const ENABLED_SELECTION_CONTEXT: SelectionGroupContext = { disabled: false }
const DISABLED_SELECTION_CONTEXT: SelectionGroupContext = { disabled: true }

/**
 * 在一个内部插件接口后收敛选中态、继承禁用与受管子项成员关系。
 * 禁用态经 @lit/context 下行广播；选中态上行写回保持直写。
 */
export function defineGroupCoordinator<Item extends HTMLElement, Value>(options: GroupCoordinatorOptions<Item, Value>) {
  return definePlugin(() => {
    const provider = new ContextProvider(options.host, {
      context: SELECTION_GROUP_CONTEXT_LOOSE,
      initialValue: new Map<HTMLElement, SelectionGroupContext>()
    })

    let lastValue: Value | undefined
    let lastDisabled: boolean | undefined
    let lastItems = new Set<Item>()
    let initialized = false

    const sync = (): boolean => {
      const nextItems = options.getItems()
      const value = options.getValue()
      const disabled = options.getDisabled()
      // 成员变化也要重放选中写回：新成员需继承当前选中态。
      const membershipChanged = nextItems.length !== lastItems.size || [...nextItems].some(item => !lastItems.has(item))
      const selectionChanged =
        !initialized ||
        !options.valuesEqual(value, lastValue as Value) ||
        disabled !== lastDisabled ||
        membershipChanged

      // 上行选中写回：根写入子项（context 是纯下行，不承担该方向）。
      if (selectionChanged) {
        for (const item of nextItems) {
          options.setItemSelected(item, options.isItemSelected(item, value))
        }
      }

      // 禁用下行：每次 sync 以新 Map 载荷整体广播（成员增删与禁用变化一并覆盖，
      // 新 Map 实例保证 Object.is 判定为变更）。
      provider.setValue(
        new Map(
          nextItems.map(item => [
            item as HTMLElement,
            disabled ? DISABLED_SELECTION_CONTEXT : ENABLED_SELECTION_CONTEXT
          ])
        )
      )

      lastItems = new Set(nextItems)
      lastValue = options.copyValue(value)
      lastDisabled = disabled
      initialized = true
      return selectionChanged
    }

    return {
      sync,
      disconnect() {
        provider.setValue(new Map())
        lastItems.clear()
        lastValue = undefined
        lastDisabled = undefined
        initialized = false
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
