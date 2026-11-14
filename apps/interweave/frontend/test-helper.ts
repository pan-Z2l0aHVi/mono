import { afterAll } from 'vite-plus/test'

/*
 * 测试全局补丁（vite.config.ts 的 test.setupFiles 挂载）。
 *
 * Node ≥22 在 globalThis 上放了实验性 localStorage（未配 --localstorage-file 时读值恒为
 * undefined），而 vitest 的 jsdom 环境按「key 已存在于 global 则不拷贝」的规则跳过同名
 * 全局（getWindowKeys 的白名单里没有 localStorage），于是 spec 里裸写的 localStorage 拿到
 * 的是 Node 的空实现，jsdom 的 Storage 永远进不来。CI 的 Node 版本没有这个 getter，所以
 * 该问题只在本地复现。这里把它重新指回 jsdom window 的 Storage，恢复浏览器语义。
 */
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    const win = (globalThis as { jsdom?: { window?: { localStorage?: Storage } } }).jsdom?.window
    return win?.localStorage
  }
})

/*
 * @wailsio/runtime 的 drag 模块在导入时就挂一个 50ms 的 window.setInterval 轮询；生成的
 * bindings 会让每个碰到它的 spec 都触发这一段。轮询不随用例结束停止，jsdom 拆掉之后回调
 * 再读 window 就成了未处理异常——Vitest 记在文件上，整包因此判红，且与用例本身无关。
 *
 * 文件里各自装 fake timers 只能救自己（而且会把 rAF 一起停掉），挡不住别的文件。这里在
 * 全局补丁层统一记账，每个 spec 文件跑完后把本轮留下的 interval 全部清掉。
 */
type IntervalId = number

const nativeSetInterval = window.setInterval.bind(window) as (
  handler: TimerHandler,
  timeout?: number,
  ...args: unknown[]
) => IntervalId
const nativeClearInterval = window.clearInterval.bind(window) as (id: IntervalId) => void
const pendingIntervals = new Set<IntervalId>()

window.setInterval = ((...args: Parameters<typeof nativeSetInterval>) => {
  const id = nativeSetInterval(...args)
  pendingIntervals.add(id)
  return id
}) as typeof window.setInterval

afterAll(() => {
  for (const id of pendingIntervals) nativeClearInterval(id)
  pendingIntervals.clear()
})

// jsdom 不实现 Web Animations API；drawer page-shift 使用它管理页面位移动画。
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => []
}
if (!Element.prototype.animate) {
  Element.prototype.animate = () => ({ id: '', cancel() {}, finished: Promise.resolve() }) as unknown as Animation
}

// jsdom 不提供文字范围的布局；列表中的 middle-ellipsis 需要可重复的宽度量具。
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = function () {
    return new DOMRect(0, 0, this.toString().length * 8, 16)
  }
}
