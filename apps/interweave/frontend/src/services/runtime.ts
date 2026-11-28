/**
 * Wails runtime core 的就绪判定与等待。
 *
 * 平台、flags 与 bindings 都不是页面一开始就有的：Go 侧在 `WebViewDidFinishNavigation`
 * 之后才 execJS 注入 runtime core（`window._wails` 与其中的 `environment`），而模块脚本早于
 * 那次导航完成执行。所以「进程事实什么时候可信」只有这一个判据：启动序据此挡住首次渲染，
 * 运行时选择据此决定走桌面服务还是浏览器预览。
 */

interface WailsWindow {
  _wails?: {
    environment?: {
      OS?: string
      Arch?: string
    }
  }
}

/** runtime core 注入完成后派发的事件名，由 Wails 注入的 runtime 脚本发出。 */
const RUNTIME_CONFIG_EVENT = 'wails:runtime-config-ready'

/**
 * 等待上限。注入发生在页面 load 之后，正常在毫秒级就绪；纯浏览器预览永远等不到这个事件，
 * 超时后由调用方按「没有桥接」的语义继续。
 */
export const RUNTIME_CONFIG_TIMEOUT_MS = 1500

/** runtime core 是否已注入。判据取 environment：它与事件在同一次注入里出现。 */
export function hasWailsRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const environment = (window as Window & WailsWindow)._wails?.environment
  return typeof environment?.OS === 'string' && typeof environment.Arch === 'string'
}

/** 返回 Wails 注入的宿主操作系统标识（如 'windows' / 'darwin' / 'linux'）；未就绪时返回 null。 */
export function wailsPlatformOS(): string | null {
  if (typeof window === 'undefined') return null
  const os = (window as Window & WailsWindow)._wails?.environment?.OS
  return typeof os === 'string' ? os : null
}

/**
 * 等 runtime core 注入完成。
 *
 * 已注入时立即返回 `true`；超时返回 `false`，调用方据此走没有桥接的路径。超时路径会再查一次
 * 就绪状态，覆盖「事件在首次判空与挂上监听之间到达」的竞态。监听与定时器在同一次 settle 里
 * 清理，重复调用互不影响。
 */
export function waitForRuntimeConfig(timeoutMs = RUNTIME_CONFIG_TIMEOUT_MS): Promise<boolean> {
  if (hasWailsRuntime()) return Promise.resolve(true)

  return new Promise(resolve => {
    let timer = 0
    const settle = (ready: boolean) => {
      window.clearTimeout(timer)
      window.removeEventListener(RUNTIME_CONFIG_EVENT, onReady)
      resolve(ready)
    }
    const onReady = () => settle(true)
    timer = window.setTimeout(() => settle(hasWailsRuntime()), timeoutMs)
    window.addEventListener(RUNTIME_CONFIG_EVENT, onReady)
  })
}
