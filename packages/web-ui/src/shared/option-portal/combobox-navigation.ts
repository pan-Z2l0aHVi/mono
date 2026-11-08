import type { WebUiOption } from '@/components/option'

/** typeahead 序列窗口：两次击键间隔超过它即重新开始匹配。 */
const TYPEAHEAD_WINDOW_MS = 500

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

/**
 * combobox 键盘导航状态机（select / autocomplete）。
 *
 * 与 combobox-shell 的分层一致：成员管理轴留在 option-portal 与组件，这里只收口
 * **游标轴**——activeIndex 状态、环绕导航、Home/End 边界、键盘打开的初始锚点、
 * 指针接管与 typeahead 缓冲。键位映射（keydown switch）留在组件：autocomplete 的
 * Enter 有 custom value / multiline 分支，吞进来会把组件语义拖进模块。
 * 组件保留 `@state` 镜像供 `aria-activedescendant` 计算，模块经 `onActiveChange`
 * 通知同步；成员轴的回写（portal diff）与关闭清理走静默通道，不打渲染回调。
 *
 * 两组件的语义差异全部经 hooks 注入（零行为变化）：
 * - `isEnabled`：select 是 `!disabled && live`（portal 感知），autocomplete 是
 *   `!disabled && !data-filtered`。
 * - 锚点策略：键盘打开时 select 选中项优先、autocomplete 首个 enabled
 *   （`getInitialAnchor`）；导航起点失效时 select 折入选中项（`getFallbackAnchor`），
 *   autocomplete 不注入——它的过滤同步保证 activeIndex 失效即已清零。
 * - 指针接管：select 有激活项即清空；autocomplete 用键盘导航旗标（键盘打开置位，
 *   列表 pointermove / wheel 清除），option 悬停不清除。
 * - typeahead：仅 select 接线。autocomplete 的输入框即文本入口，typeahead 会与
 *   过滤输入打架，不开启——模块的缓冲对它恒为空，复位是无副作用空转。
 */
export interface ComboboxNavigationHooks {
  /** 全量 option 注册表；导航在 isEnabled 过滤出的 enabled 子集上游走，索引换算回全量。 */
  getOptions(): WebUiOption[]
  /** 单个 option 是否可被导航激活（禁用 / 过滤 / 失联的差异判据由宿主注入）。 */
  isEnabled(option: WebUiOption): boolean
  /** 面板是否开启；指针接管的门户判据。 */
  isOpen(): boolean
  /** activeIndex 变化后回调；宿主同步 `@state` 镜像与 active 属性 / aria 渲染。 */
  onActiveChange(): void
  /**
   * 键盘打开时的初始锚点：返回 enabled 内索引，无可锚定项返回 -1。
   * select 折入「选中项优先」，autocomplete 折入「首个 enabled」。
   */
  getInitialAnchor(enabled: WebUiOption[]): number
  /**
   * 导航起点回退：activeIndex 失效（未激活）时的锚点，返回 enabled 内索引或 -1。
   * select 折入选中项；不注入时走方向默认（向下取首项、向上取末项）。
   */
  getFallbackAnchor?(enabled: WebUiOption[]): number
  /** 指针接管门槛：option pointerover 时是否允许清除键盘激活。 */
  canPointerTakeOver(): boolean
}

export interface ComboboxNavigation {
  /** 当前激活项在全量 options 中的索引；-1 表示无激活。 */
  readonly activeIndex: number
  /** 键盘导航旗标（autocomplete 的指针接管判据）；select 不读它。 */
  isKeyboardNavigationActive(): boolean
  /** 显式置位 / 复位键盘导航旗标（打开钩子与输入框键入路径）。 */
  markKeyboardNavigation(active: boolean): void
  /** 环绕导航；起点失效时按宿主回退锚点或方向默认解析。 */
  navigate(delta: number): void
  /** Home / End 边界：移到首个 / 末个 enabled 项。 */
  moveToBoundary(toStart: boolean): void
  /** 键盘打开时的初始锚定（选中项优先 / 首个 enabled，由 getInitialAnchor 注入）。 */
  activateInitialAnchor(): void
  /** option pointerover 的指针接管：非触摸、面板开启且过门槛时清除键盘激活。 */
  handleOptionPointerOver(event: PointerEvent): void
  /** 列表 pointermove / wheel 清除旗标与激活（autocomplete 指针接管的后半段）。 */
  clearKeyboardNavigation(): void
  /** typeahead：单字符输入按前缀循环匹配 enabled 项；仅 select 接线。 */
  typeahead(key: string): void
  /** 清空 typeahead 缓冲（开合与导航路径的复位点）。 */
  resetTypeahead(): void
  /** 清除激活并通知宿主渲染（过滤清零、输入重置等路径）。 */
  clearActive(): void
  /** 关闭清理：旗标与激活静默归零，不打渲染回调（属性清理由宿主自己收尾）。 */
  resetForClose(): void
  /** 成员轴回写激活索引（portal diff 按身份保持）；静默，不通知渲染。 */
  setActiveIndex(index: number): void
}

export function createComboboxNavigation(hooks: ComboboxNavigationHooks): ComboboxNavigation {
  let activeIndex = -1
  let keyboardNavigationActive = false
  let typeaheadBuffer = ''
  let typeaheadLastInputAt = 0

  const options = () => hooks.getOptions()
  const enabledOf = () => options().filter(option => hooks.isEnabled(option))

  /** 把 enabled 内索引换算回全量索引并通知宿主渲染。 */
  const activateEnabledAt = (enabled: WebUiOption[], enabledIndex: number) => {
    activeIndex = options().indexOf(enabled[enabledIndex])
    hooks.onActiveChange()
  }

  const normalizeTypeaheadText = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

  return {
    get activeIndex() {
      return activeIndex
    },
    isKeyboardNavigationActive: () => keyboardNavigationActive,
    markKeyboardNavigation(active) {
      keyboardNavigationActive = active
    },
    navigate(delta) {
      this.resetTypeahead()
      const enabled = enabledOf()
      if (!enabled.length) return
      keyboardNavigationActive = true

      const active = activeIndex >= 0 ? options()[activeIndex] : undefined
      const currentIdx =
        active !== undefined && hooks.isEnabled(active)
          ? enabled.indexOf(active)
          : hooks.getFallbackAnchor
            ? hooks.getFallbackAnchor(enabled)
            : delta > 0
              ? -1
              : 0
      activateEnabledAt(enabled, nextWrappingIndex(enabled.length, currentIdx, delta))
    },
    moveToBoundary(toStart) {
      this.resetTypeahead()
      const enabled = enabledOf()
      if (!enabled.length) return
      activateEnabledAt(enabled, toStart ? 0 : enabled.length - 1)
    },
    activateInitialAnchor() {
      const enabled = enabledOf()
      keyboardNavigationActive = true
      const anchor = hooks.getInitialAnchor(enabled)
      if (anchor < 0) {
        activeIndex = -1
        hooks.onActiveChange()
        return
      }
      activateEnabledAt(enabled, anchor)
    },
    handleOptionPointerOver(event) {
      if (event.pointerType === 'touch') return
      if (!hooks.isOpen()) return
      if (!hooks.canPointerTakeOver()) return
      // 指针接管后只保留 :hover，避免键盘激活项与悬停项同时高亮。
      activeIndex = -1
      hooks.onActiveChange()
      this.resetTypeahead()
    },
    clearKeyboardNavigation() {
      if (!keyboardNavigationActive) return
      keyboardNavigationActive = false
      activeIndex = -1
      hooks.onActiveChange()
    },
    typeahead(key) {
      const optionsList = options()
      const enabled = enabledOf()
      if (!enabled.length) return

      const now = Date.now()
      const withinSequence = now - typeaheadLastInputAt <= TYPEAHEAD_WINDOW_MS
      const isRepeatedKey =
        withinSequence &&
        Array.from(typeaheadBuffer).length === 1 &&
        normalizeTypeaheadText(typeaheadBuffer) === normalizeTypeaheadText(key)
      const query = isRepeatedKey ? key : withinSequence ? `${typeaheadBuffer}${key}` : key
      typeaheadBuffer = query
      typeaheadLastInputAt = now

      const activeOption = optionsList[activeIndex]
      const currentEnabledIndex = activeOption ? enabled.indexOf(activeOption) : -1
      const findMatch = (prefix: string) => {
        const normalizedPrefix = normalizeTypeaheadText(prefix)
        for (let offset = 1; offset <= enabled.length; offset++) {
          const option = enabled[(currentEnabledIndex + offset + enabled.length) % enabled.length]
          if (normalizeTypeaheadText(option.label.trimStart()).startsWith(normalizedPrefix)) return option
        }
        return undefined
      }

      const currentMatch =
        query !== key &&
        currentEnabledIndex >= 0 &&
        activeOption &&
        normalizeTypeaheadText(activeOption.label.trimStart()).startsWith(normalizeTypeaheadText(query))
          ? activeOption
          : undefined
      const queryMatch = currentMatch ?? findMatch(query)
      const option = queryMatch ?? (query === key ? undefined : findMatch(key))
      if (!queryMatch && query !== key) typeaheadBuffer = key
      if (!option) return

      activeIndex = optionsList.indexOf(option)
      hooks.onActiveChange()
    },
    resetTypeahead() {
      typeaheadBuffer = ''
      typeaheadLastInputAt = 0
    },
    clearActive() {
      activeIndex = -1
      hooks.onActiveChange()
    },
    resetForClose() {
      keyboardNavigationActive = false
      activeIndex = -1
    },
    setActiveIndex(index) {
      activeIndex = index
    }
  }
}
