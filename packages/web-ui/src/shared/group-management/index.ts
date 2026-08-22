import { definePlugin } from '@greypan/js-kit'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

const groupManagedItem = Symbol('web-ui.group-managed-item')

type GroupManagedItem<Context> = HTMLElement & {
  [groupManagedItem]?: (context: Context | undefined) => void
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

export function defineGroupManaged<Context>(options: {
  requestUpdate: () => void
  equals?: (a: Context | undefined, b: Context | undefined) => boolean
}) {
  return definePlugin(() => {
    let context: Context | undefined
    const equals = options.equals ?? Object.is

    return {
      getContext(): Context | undefined {
        return context
      },
      setContext(next: Context | undefined) {
        if (equals(context, next)) return
        context = next
        options.requestUpdate()
      }
    }
  })
}

export function installGroupContext<Context>(item: HTMLElement, context: Context | undefined) {
  ;(item as GroupManagedItem<Context>)[groupManagedItem]?.(context)
}

export function registerGroupManagedItem<Context>(
  item: HTMLElement,
  setContext: (context: Context | undefined) => void
) {
  ;(item as GroupManagedItem<Context>)[groupManagedItem] = setContext
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
 * Connects an internal group lifecycle plugin to Lit without putting group
 * coordination rules in component lifecycle methods.
 */
export class GroupController implements ReactiveController {
  private connected = false

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
    this.host.renderRoot.addEventListener('slotchange', this.handleSlotChange)
    this.sync()
  }

  hostUpdated() {
    this.sync()
  }

  hostDisconnected() {
    this.connected = false
    this.host.removeEventListener('change', this.handleChange, true)
    this.host.renderRoot.removeEventListener('slotchange', this.handleSlotChange)
    this.lifecycle.disconnect()
  }

  private readonly handleChange = (event: Event) => {
    this.lifecycle.handleChange?.(event)
  }

  private readonly handleSlotChange = () => {
    if (!this.connected) return
    this.sync()
  }

  sync() {
    if (!this.lifecycle.sync()) return
    this.options.afterSync?.()
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
 * Keeps selection, inherited disabled state, and managed child membership
 * behind one internal plugin interface.
 */
export function defineGroupCoordinator<Item extends HTMLElement, Value>(options: GroupCoordinatorOptions<Item, Value>) {
  return definePlugin(() => {
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
        if (!nextItems.has(item)) installGroupContext<SelectionGroupContext>(item, undefined)
      }

      for (const item of nextItems) {
        installGroupContext<SelectionGroupContext>(
          item,
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
        for (const item of items) installGroupContext<SelectionGroupContext>(item, undefined)
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
 * Registers a reversible presentation context for grouped children. It owns no
 * public DOM attributes and clears every context when membership changes.
 */
export function defineGroupPresentation<Item extends HTMLElement, Context>(
  options: GroupPresentationOptions<Item, Context>
) {
  return definePlugin(() => {
    let items = new Set<Item>()
    let previousItems: readonly Item[] = []

    return {
      sync(): boolean {
        const nextItems = options.getItems()
        const nextSet = new Set(nextItems)
        const membershipChanged =
          nextItems.length !== previousItems.length || nextItems.some((item, index) => item !== previousItems[index])

        for (const item of items) {
          if (!nextSet.has(item)) installGroupContext<Context>(item, undefined)
        }

        nextItems.forEach((item, index) => installGroupContext(item, options.getContext(item, index, nextItems)))
        items = nextSet
        previousItems = nextItems
        return membershipChanged
      },
      disconnect() {
        for (const item of items) installGroupContext<Context>(item, undefined)
        items.clear()
        previousItems = []
      }
    }
  })
}
