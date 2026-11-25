import { createExpandingFieldController } from './expanding-field'
import { NAV_SECTIONS, type NavSection } from './nav'

export interface SearchItem {
  path: string
  zh: string
  en: string
  keywords?: string
}

/**
 * 壳页（首页 / 快速开始 / 更新日志）的搜索条目：两端曾各硬编码一份，收进 kit 后
 * `searchNavigation` 直接以此为默认 pages，接线只剩一次调用。中文是数据（搜索索引），
 * 不进 wuchale。
 */
export const SHELL_NAV_PAGES: readonly SearchItem[] = Object.freeze([
  { path: '/home', zh: '组件总览', en: 'Components' },
  { path: '/getting-started', zh: '快速开始', en: 'Getting Started', keywords: 'quick start' },
  { path: '/changelog', zh: '更新日志', en: 'Changelog' }
])

/** 将任意导航树展平为搜索索引条目。 */
export function createNavSearchItems<Id extends string>(sections: readonly NavSection<Id>[]): SearchItem[] {
  return sections.flatMap(section =>
    section.items.map(item => ({
      path: item.path,
      zh: item.label,
      en: item.label,
      keywords: item.zhName
    }))
  )
}

const componentItems: SearchItem[] = createNavSearchItems(NAV_SECTIONS)

/** 搜索导航项目；空查询不产生结果。pages 缺省用壳页 + 组件导航的全集。 */
export function searchNavigation<Id extends string = never>(
  query: string,
  pages: readonly SearchItem[] = SHELL_NAV_PAGES,
  sections?: readonly NavSection<Id>[]
): SearchItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const items = sections ? createNavSearchItems(sections) : componentItems
  return [...pages, ...items].filter(item =>
    [item.zh, item.en, item.keywords].some(value => value?.toLocaleLowerCase().includes(needle))
  )
}

export interface SearchUpdatableElement extends HTMLElement {
  readonly updateComplete?: Promise<unknown>
}

export interface SearchElements {
  controls?: HTMLElement | null
  input?: SearchUpdatableElement | null
  popover?: SearchUpdatableElement | null
  results?: HTMLElement | null
}

export interface SearchSnapshot {
  readonly query: string
  readonly displayQuery: string
  readonly panelOpen: boolean
  readonly hasQuery: boolean
  readonly popoverOpen: boolean
  readonly matches: readonly SearchItem[]
}

export interface SearchControllerOptions {
  pages?: readonly SearchItem[]
  onOpenChange: (open: boolean) => void
  navigateLinks?: (event: KeyboardEvent, input: HTMLElement, links: HTMLAnchorElement[]) => void
}

export interface SearchController {
  readonly getSnapshot: () => SearchSnapshot
  readonly subscribe: (listener: () => void) => () => void
  setOnOpenChange(handler: (open: boolean) => void): void
  syncOpen(open: boolean): void
  syncElements(elements: SearchElements): void
  openSearch(): void
  setQuery(value: string): void
  handleKeydown(event: KeyboardEvent): void
  handleResultClick(event: MouseEvent): void
  dispose(): void
}

const ESCAPE_KEY = 'Escape'
const ARROW_DOWN_KEY = 'ArrowDown'

/**
 * demo 头部搜索栏的共享状态机与交互控制器：
 * 统一持有 query/displayQuery/panelOpen 状态、expanding-field 焦点/外点/Escape 策略、
 * 结果面板键盘导航与点击收起判定。React 与 Vue 宿主仅保留薄视图与框架事件绑定。
 */
export function createSearchController(options: SearchControllerOptions): SearchController {
  const pages = options.pages ?? SHELL_NAV_PAGES
  const listeners = new Set<() => void>()
  let onOpenChange = options.onOpenChange

  let open = false
  let query = ''
  let displayQuery = ''
  let panelOpen = true
  let focusGeneration = 0

  let controlsEl: HTMLElement | null = null
  let inputEl: SearchUpdatableElement | null = null
  let popoverEl: SearchUpdatableElement | null = null
  let resultsEl: HTMLElement | null = null

  let snapshot: SearchSnapshot = computeSnapshot()

  const expandingField = createExpandingFieldController({
    getField: () => inputEl,
    getControls: () => controlsEl,
    close: () => onOpenChange(false)
  })

  function computeSnapshot(): SearchSnapshot {
    const hasQuery = query.trim().length > 0
    return Object.freeze({
      query,
      displayQuery,
      panelOpen,
      hasQuery,
      popoverOpen: panelOpen && hasQuery,
      matches: Object.freeze(searchNavigation(displayQuery, pages))
    })
  }

  function emit() {
    snapshot = computeSnapshot()
    for (const listener of listeners) listener()
  }

  function focusInputWhenReady() {
    const element = inputEl
    if (!open || !element) return
    const generation = ++focusGeneration
    const done = element.updateComplete ?? Promise.resolve()
    void done.then(() => {
      if (generation !== focusGeneration || !open || element !== inputEl) return
      element.focus()
    })
  }

  return {
    getSnapshot: () => snapshot,

    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    setOnOpenChange(handler) {
      onOpenChange = handler
    },

    syncOpen(nextOpen) {
      if (nextOpen === open) return
      open = nextOpen
      focusGeneration++
      if (open) focusInputWhenReady()
    },

    syncElements(elements) {
      if ('controls' in elements) {
        controlsEl = elements.controls ?? null
        expandingField.attachControls(controlsEl)
      }
      if ('input' in elements) {
        const nextInput = elements.input ?? null
        const changed = nextInput !== inputEl
        inputEl = nextInput
        expandingField.attachField(inputEl)
        if (changed && open && inputEl) focusInputWhenReady()
      }
      if ('popover' in elements) popoverEl = elements.popover ?? null
      if ('results' in elements) resultsEl = elements.results ?? null
    },

    openSearch() {
      if (!panelOpen) {
        panelOpen = true
        emit()
      }
      onOpenChange(true)
    },

    setQuery(value) {
      query = value
      if (value.trim()) displayQuery = value
      panelOpen = true
      emit()
    },

    handleKeydown(event) {
      const target = event.target as HTMLElement | null
      const links = [...(resultsEl?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
      if (event.key === ESCAPE_KEY) {
        // 搜索结果链接上的 Escape 只收起结果面板；输入框本体的 Escape 由 expandingField 关闭整个搜索。
        if (target?.closest('a[href]')) {
          event.preventDefault()
          event.stopPropagation()
          if (panelOpen) {
            panelOpen = false
            emit()
          }
          inputEl?.focus()
        }
        return
      }
      if (event.key === ARROW_DOWN_KEY && target === inputEl && !panelOpen && snapshot.hasQuery) {
        event.preventDefault()
        panelOpen = true
        emit()
        const activeInput = inputEl
        requestAnimationFrame(() => {
          const done = popoverEl?.updateComplete ?? Promise.resolve()
          void done.then(() =>
            requestAnimationFrame(() => {
              if (document.activeElement === activeInput) {
                resultsEl?.querySelector<HTMLAnchorElement>('a[href]')?.focus()
              }
            })
          )
        })
        return
      }
      if (inputEl && options.navigateLinks) {
        options.navigateLinks(event, inputEl, links)
      }
    },

    handleResultClick(event) {
      if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        onOpenChange(false)
      }
    },

    dispose() {
      focusGeneration++
      expandingField.dispose()
      controlsEl = null
      inputEl = null
      popoverEl = null
      resultsEl = null
      listeners.clear()
    }
  }
}
