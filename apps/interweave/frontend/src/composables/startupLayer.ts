/**
 * 静态启动层的退场控制。
 *
 * 启动层本身写在 index.html 里（纯 HTML/CSS，WebView 拿到第一个字节就能画出来），
 * 这里只负责在设置就绪后退场。两条退场路径：
 *
 *   1. 设置拉取完成 —— 主题属性已经落到 web-ui-theme 上，撤掉启动层不会闪主题；
 *   2. 超时兜底 —— 设置读不到时也不能把用户永远挡在 logo 后面。
 *
 * 退场是幂等的：两条路径都会走，先到的生效。
 */
const STARTUP_LAYER_ID = 'startup-layer'

/** 超时上限。设置是本地 JSON 读取，正常在个位数毫秒内返回；3s 只兜异常路径。 */
export const STARTUP_TIMEOUT_MS = 3000

/** 退场过渡时长，与 index.html 里 #startup-layer 的 transition 一致。 */
const FADE_OUT_MS = 220

/**
 * 撤掉启动层。返回是否真的执行了退场（重复调用返回 false）。
 *
 * 幂等性以 DOM 为判据而不是模块级标志位：启动层是 index.html 里的静态节点，
 * 它的存在本身就说明「还没退场」。这样重复调用、热重载、或测试里重复挂载都不会
 * 被一个上一轮留下的标志位挡住。
 *
 * 实现细节：先标记 `data-leaving` 让 CSS 过渡跑透明度，过渡结束后才移除节点；
 * 若用户在系统里开了减少动画，CSS 会跳过脉冲动画，但这里仍走同一段过渡——
 * 220ms 的淡出不构成困扰，而突然消失反而更像闪烁。
 */
export function dismissStartupLayer(): boolean {
  const layer = document.getElementById(STARTUP_LAYER_ID)
  if (!layer || layer.dataset.leaving === 'true') return false
  layer.dataset.leaving = 'true'
  window.setTimeout(() => layer.remove(), FADE_OUT_MS)
  return true
}

/**
 * 安排兜底退场。返回取消函数，让调用方在设置提前就绪时清掉定时器。
 * 单独抽出来是为了让「最多等多久」只有一个来源。
 */
export function scheduleStartupTimeout(onTimeout: () => void = dismissStartupLayer): () => void {
  const timer = window.setTimeout(onTimeout, STARTUP_TIMEOUT_MS)
  return () => window.clearTimeout(timer)
}
