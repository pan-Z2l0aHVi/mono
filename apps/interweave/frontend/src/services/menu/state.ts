import { Command } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import * as MenuService from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu/service'
import { hasWailsRuntime } from '../runtime'

/**
 * 菜单可用性上报。
 *
 * 菜单形状在 Go，禁用判据在 Vue：资源库页相关的命令只在资源库页可用，后退/前进还取决于
 * 历史栈。这里只负责把「当前哪些命令不可用」算出来推给 Go，菜单树怎么置灰由后端决定。
 */
export interface MenuStateRuntime {
  readonly isAvailable: boolean
  reportDisabled(disabled: Command[]): Promise<void>
}

class WailsMenuStateRuntime implements MenuStateRuntime {
  readonly isAvailable = hasWailsRuntime()

  async reportDisabled(disabled: Command[]): Promise<void> {
    if (!this.isAvailable) return
    await MenuService.ReportDisabledCommands(disabled)
  }
}

const runtime = new WailsMenuStateRuntime()

export function createMenuStateRuntime(): MenuStateRuntime {
  return runtime
}

/** 资源库页独有的命令：离开资源库页后它们没有可作用的对象。 */
const LIBRARY_COMMANDS: readonly Command[] = [
  Command.CommandRefreshLibrary,
  Command.CommandToggleFilterBar,
  Command.CommandFocusSearch
]

export interface MenuAvailabilityInput {
  /** 当前路由的 path；资源库页是 `/library`。 */
  path: string
  canGoBack: boolean
  canGoForward: boolean
}

/**
 * 按当前路由与历史栈算禁用集合。纯函数，可在 Node 环境单测。
 *
 * 输出按固定顺序排列，调用方因此可以按数组同一性去重；顺序也让人读测试失败信息时
 * 不必先排序。
 */
export function computeDisabledCommands(input: MenuAvailabilityInput): Command[] {
  const disabled: Command[] = []
  if (input.path !== '/library') disabled.push(...LIBRARY_COMMANDS)
  if (!input.canGoBack) disabled.push(Command.CommandNavigateBack)
  if (!input.canGoForward) disabled.push(Command.CommandNavigateForward)
  return disabled
}

/**
 * 把禁用集合推给 Go；与上一次**成功推送**的集合相同就不调用。
 *
 * 去重是必要的：路由或历史栈每变一次就重建整棵菜单，在 Windows 上是一次
 * SetMenu + DrawMenuBar。Go 侧还有一层兜底去重，这里少发一次就少一次跨进程调用。
 *
 * 只在成功后才记住集合：推送失败时菜单还停在旧状态，下一次相同输入必须重试。
 */
export function createMenuStateReporter(report: (disabled: Command[]) => Promise<void>) {
  let last: string | null = null
  return async function sync(input: MenuAvailabilityInput): Promise<void> {
    const disabled = computeDisabledCommands(input)
    const key = disabled.join('\n')
    if (key === last) return
    await report(disabled)
    last = key
  }
}
