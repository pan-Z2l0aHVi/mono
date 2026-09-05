import { nanoid } from 'nanoid'

import { off, on } from '@/shortcut'
import { defineSession } from '@/storage'

/**
 * 基于真实浏览器 history 的前进/后退可用性跟踪（Navigation API 只读子集）。
 *
 * vue-router 只在 router.push() 时维护 history.state.back/forward；地址栏输入、
 * 浏览器前进/后退创建的 entry 会克隆旧 state，导致 back/forward 恒为 null，
 * 无法用来判断能否后退/前进。本模块以「entry 栈 + 当前索引」自行跟踪浏览器
 * history 位置：
 *
 * - 全局 patch `history.pushState` / `history.replaceState`，只在旁路记录，
 *   不向 history.state 写入任何元数据（区别于注入式 ponyfill）；
 * - `popstate` 处理浏览器前进/后退与地址栏导航，按 URL 在栈中查找定位；
 * - 通过 sessionStorage（复用 storage 模块）持久化，刷新后仍能恢复；
 * - 存储被禁（隐私模式、受限 webview）时静默降级为内存态，功能不崩。
 *
 * 公开 API 只承诺 Navigation API 的只读子集：canGoBack / canGoForward /
 * currentEntry / entries() / currententrychange。navigate / intercept /
 * transition 不在承诺范围内；事件不承诺 'reload' 类型（无法可靠检测）。
 */

export interface HistoryNavEntry {
  readonly id: string
  readonly key: string
  readonly index: number
  readonly url: string | null
  readonly sameDocument: boolean
  getState(): unknown
}

export type HistoryNavigationType = 'push' | 'replace' | 'traverse' | 'reload'

export interface HistoryNavCurrentEntryChangeEvent {
  readonly from: HistoryNavEntry | null
  readonly navigationType: HistoryNavigationType
}

export interface HistoryNavOptions {
  /** sessionStorage 键名前缀，避免多应用/多实例共存互踩。默认 'history-nav'。 */
  namespace?: string
}

export interface HistoryNav {
  readonly canGoBack: boolean
  readonly canGoForward: boolean
  readonly currentEntry: HistoryNavEntry | null
  entries(): HistoryNavEntry[]
  onCurrentEntryChange(handler: (event: HistoryNavCurrentEntryChangeEvent) => void): () => void
  dispose(): void
}

const DEFAULT_NAMESPACE = 'history-nav'
const SNAPSHOT_KEY = 'history-nav-snapshot'

interface InternalEntry {
  id: string
  key: string
  url: string
  state?: unknown
}

interface Snapshot {
  stack: Array<Pick<InternalEntry, 'id' | 'key' | 'url' | 'state'>>
  index: number
}

/** JSON 可序列化才落盘；函数等无法序列化的 state 仅保留在内存。 */
function jsonSafe(value: unknown): unknown {
  try {
    JSON.stringify(value)
    return value
  } catch {
    return undefined
  }
}

function cloneState<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  try {
    return structuredClone(value)
  } catch {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return value
    }
  }
}

function resolveUrl(url: string | URL | null | undefined): string {
  return url == null ? window.location.href : new URL(String(url), window.location.href).href
}

class HistoryNavImpl implements HistoryNav {
  private readonly namespace: string
  private readonly storage: ReturnType<typeof defineSession>
  private stack: InternalEntry[] = []
  private index = -1
  private listeners = new Set<(event: HistoryNavCurrentEntryChangeEvent) => void>()
  private installed = false

  constructor(options: HistoryNavOptions) {
    this.namespace = options.namespace ?? DEFAULT_NAMESPACE
    this.storage = defineSession(this.namespace)
    this.hydrate()
    this.install()
  }

  get canGoBack(): boolean {
    return this.index > 0
  }

  get canGoForward(): boolean {
    return this.index < this.stack.length - 1
  }

  get currentEntry(): HistoryNavEntry | null {
    if (this.index < 0 || this.index >= this.stack.length) return null
    return this.toPublicEntry(this.stack[this.index], this.index)
  }

  entries(): HistoryNavEntry[] {
    return this.stack.map((entry, index) => this.toPublicEntry(entry, index))
  }

  onCurrentEntryChange(handler: (event: HistoryNavCurrentEntryChangeEvent) => void): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  dispose(): void {
    if (!this.installed) return
    off(window, 'popstate', this.onPopstate)
    // 删除实例上的 patch 属性，还原 History 原型上的原生方法。
    delete (window.history as unknown as Record<string, unknown>).pushState
    delete (window.history as unknown as Record<string, unknown>).replaceState
    this.installed = false
    this.stack = []
    this.index = -1
    this.listeners.clear()
    if (instance === this) instance = null
  }

  private readonly onPopstate = (): void => {
    const from = this.currentEntry
    const type = this.trackTraverse(window.location.href)
    if (type) this.emit(type, from)
  }

  private install(): void {
    if (this.installed) return
    this.installed = true

    const history = window.history
    const boundPush = history.pushState.bind(history)
    const boundReplace = history.replaceState.bind(history)

    history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
      boundPush(data, unused, url)
      this.pushEntry(resolveUrl(url), window.history.state)
    }) as History['pushState']

    history.replaceState = ((data: unknown, unused: string, url?: string | URL | null) => {
      boundReplace(data, unused, url)
      this.replaceCurrent(resolveUrl(url), window.history.state)
    }) as History['replaceState']

    on(window, 'popstate', this.onPopstate)
  }

  private pushEntry(url: string, state: unknown): void {
    const from = this.currentEntry
    // push 总是追加（即使 URL 相同也是一条新 entry），并截断前进分支。
    this.stack.length = this.index + 1
    this.stack.push(this.createEntry(url, state))
    this.index = this.stack.length - 1
    this.emit('push', from)
  }

  private replaceCurrent(url: string, state: unknown): void {
    const from = this.currentEntry
    const entry = this.stack[this.index]
    if (!entry) {
      // 栈为空（异常路径）时退化为 push。
      this.pushEntry(url, state)
      return
    }
    entry.url = url
    entry.state = state
    this.emit('replace', from)
  }

  /**
   * popstate 遍历：目标 URL 在栈中靠前→后退、靠后→前进、都不在→新条目。
   * 命中已知条目返回 'traverse'，未命中（地址栏输入等）返回 'push'，无变化返回 null。
   */
  private trackTraverse(url: string): 'traverse' | 'push' | null {
    const current = this.stack[this.index]
    if (current && current.url === url) return null

    for (let i = this.index - 1; i >= 0; i--) {
      if (this.stack[i].url === url) {
        this.index = i
        return 'traverse'
      }
    }
    for (let i = this.index + 1; i < this.stack.length; i++) {
      if (this.stack[i].url === url) {
        this.index = i
        return 'traverse'
      }
    }
    // 全新地址（地址栏输入等未经过 pushState 的导航）→ 截断前进分支并追加。
    this.stack.length = this.index + 1
    this.stack.push(this.createEntry(url, window.history.state))
    this.index = this.stack.length - 1
    return 'push'
  }

  private createEntry(url: string, state: unknown): InternalEntry {
    return { id: nanoid(), key: nanoid(), url, state }
  }

  private toPublicEntry(entry: InternalEntry, index: number): HistoryNavEntry {
    return {
      id: entry.id,
      key: entry.key,
      index,
      url: entry.url,
      sameDocument: true,
      getState: () => cloneState(this.stack[this.index] === entry ? window.history.state : entry.state)
    }
  }

  private emit(navigationType: HistoryNavigationType, from: HistoryNavEntry | null): void {
    const event: HistoryNavCurrentEntryChangeEvent = { from, navigationType }
    this.listeners.forEach(handler => handler(event))
    this.persist()
  }

  private hydrate(): void {
    const snapshot = this.storage.get<Snapshot>(SNAPSHOT_KEY)
    if (snapshot && Array.isArray(snapshot.stack) && snapshot.stack.length > 0) {
      const entry = snapshot.stack[snapshot.index]
      if (entry && entry.url === window.location.href) {
        this.stack = snapshot.stack as InternalEntry[]
        this.index = snapshot.index
        return
      }
    }
    this.stack = [this.createEntry(window.location.href, window.history.state)]
    this.index = 0
  }

  private persist(): void {
    const snapshot: Snapshot = {
      stack: this.stack.map(entry => ({
        id: entry.id,
        key: entry.key,
        url: entry.url,
        state: jsonSafe(entry.state)
      })),
      index: this.index
    }
    this.storage.set(SNAPSHOT_KEY, snapshot)
  }
}

let instance: HistoryNav | null = null

const noopNav: HistoryNav = {
  canGoBack: false,
  canGoForward: false,
  currentEntry: null,
  entries: () => [],
  onCurrentEntryChange: () => () => {},
  dispose: () => {}
}

/**
 * 创建 history-nav 单例。幂等：首次调用安装 patch 与初始栈，后续调用返回
 * 同一实例。无 window（SSR / Node）时返回 no-op 实例。
 */
export function defineHistoryNav(options: HistoryNavOptions = {}): HistoryNav {
  if (instance) return instance
  if (typeof window === 'undefined' || typeof window.history === 'undefined') {
    instance = noopNav
    return instance
  }
  instance = new HistoryNavImpl(options)
  return instance
}
