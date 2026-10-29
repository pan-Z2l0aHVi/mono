/**
 * 视口的**期待驱动**设置点（仅 browser mode）。
 *
 * ## 为什么 `await page.viewport(w, h)` 之后不能立刻量
 *
 * `page.viewport()` 走的是一条**跨文档的往返**：测试 iframe 把请求 post 给
 * orchestrator，orchestrator 改 iframe 外层容器的 CSS 尺寸，再 post 一句
 * `viewport:done` 回来。往返完成只证明「尺寸已经写进 orchestrator 的样式」，
 * **不证明 iframe 已经按新尺寸重新布局**——那要等 orchestrator 文档完成一次布局，
 * 再由引擎重算 iframe 的 viewport。负载下这段窗口会被拉长，于是
 * `window.innerWidth` 在 `await page.viewport(...)` 返回后仍可能是旧值，
 * 量出来的列数 / 断点判定也就跟着错一整档。
 *
 * 这里等的是**期待值本身**（`window.innerWidth / innerHeight` 等于目标），
 * 而不是「等一段时间没变化」——后者在视口根本没生效时同样成立。
 *
 * ## 为什么这份代码在本 app 里而不是共用一份
 *
 * 等价实现在 `packages/web-ui/src/shared/test-utils/viewport.ts`。`test-utils` 不在
 * `@greypan/web-ui` 的 `exports` 里（那是内部测试基础设施，不是发布面），而把它加进
 * exports 会把测试辅助代码变成公开契约。本 app 因此保留自己的一份，与 vue demo 的
 * 同名文件逐字保持一致：三份副本的等待语义、预算与错误文案必须相同，改一处要改三处。
 */
import { page } from 'vite-plus/test/browser'

/**
 * 等「一个渲染步进真的过去了」，而不只是等 rAF 回调被调用。
 *
 * 依赖视口的组件（断点切换、滚动锁定、可见区计算）在视口尺寸生效后的**下一次**
 * 渲染步进里才把状态写回，所以尺寸到位之后还要再让出一个渲染步进。
 */
async function renderStepUntil(deadline: number): Promise<boolean> {
  if (performance.now() >= deadline) return false
  return new Promise(resolve => {
    let done = false
    let frame = 0
    let task: ReturnType<typeof setTimeout> | undefined
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const finish = (completed: boolean) => {
      if (done) return
      done = true
      cancelAnimationFrame(frame)
      clearTimeout(task)
      clearTimeout(watchdog)
      resolve(completed)
    }
    if (Number.isFinite(deadline)) watchdog = setTimeout(() => finish(false), deadline - performance.now())
    frame = requestAnimationFrame(() => {
      task = setTimeout(() => finish(performance.now() < deadline), 0)
    })
  })
}

/**
 * 换视口并等它**真的生效**。
 *
 * 等两件事，顺序不能换：
 *  1. `window.innerWidth / innerHeight` 等于目标——iframe 已按新尺寸布局；
 *  2. 再让出一个完整渲染步进——media query 监听与它们引起的样式重算在下一步派发。
 */
export async function setViewport(width: number, height: number, timeoutMs = 5000): Promise<void> {
  // RPC 由 runner 预算管理；本预算覆盖尺寸生效与最后的渲染步进。
  await page.viewport(width, height)
  const startedAt = performance.now()
  const deadline = startedAt + timeoutMs
  let steps = 0
  const step = async (stage: 'dimensions' | 'render') => {
    if (!(await renderStepUntil(deadline))) {
      throw new Error(
        `viewport did not settle at ${width}x${height} (stage=${stage}, read ${window.innerWidth}x${window.innerHeight}, ` +
          `waited ${Math.round(performance.now() - startedAt)}ms / ${steps} render steps, budget ${timeoutMs}ms)`
      )
    }
    steps++
  }
  while (window.innerWidth !== width || window.innerHeight !== height) await step('dimensions')
  await step('render')
}
