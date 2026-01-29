/**
 * @file timer
 * @description 增强型定时器工具（ControllableInterval）
 * 特性：
 * 1.进度保留：暂停 (pause) 时记录剩余时间，恢复 (resume) 时补全当前周期，而非重新计时
 * 2.状态可控：支持随时 start、pause、resume、stop
 * 3.链路稳健：基于递归 setTimeout 实现，避免原生 setInterval 在回调耗时过长时的“堆积”效应
 * 4.环境兼容：适配浏览器与 Node.js (SSR)，自动处理 Timeout 类型差异
 * @example
 * const timer = new ControllableInterval(() => {
 *   console.log('tick')
 * }, 1000)
 * timer.start()
 * setTimeout(() => {
 *   timer.pause() // 运行 800ms 后暂停，剩余 200ms
 *   setTimeout(() => {
 *     timer.resume() // 200ms 后立即触发回调，随后回归 1000ms 周期
 *   }, 500)
 * }, 800)
 */

export class ControllableInterval {
  private timerId: ReturnType<typeof setTimeout> | null = null
  private isPaused = false
  private remainingTime = 0
  private lastStartTime = 0

  constructor(
    private callback: () => void,
    private interval: number
  ) {}

  private tick(delay: number) {
    this.lastStartTime = Date.now()
    this.timerId = setTimeout(() => {
      this.callback()
      // 只有在没被暂停的情况下，才继续下一次循环
      if (!this.isPaused) this.tick(this.interval)
    }, delay)
  }

  start() {
    if (this.timerId || this.isPaused) return

    this.tick(this.interval)
  }

  pause() {
    if (this.isPaused || !this.timerId) return

    this.isPaused = true
    clearTimeout(this.timerId)
    this.timerId = null

    // 计算当前这一轮还剩多少时间没跑完
    const diff = Date.now() - this.lastStartTime
    this.remainingTime = Math.max(0, this.interval - diff)
  }

  resume() {
    if (!this.isPaused) return

    this.isPaused = false
    // 恢复执行：先跑完上一轮剩下的时间
    this.tick(this.remainingTime || this.interval)
  }

  stop() {
    if (this.timerId) clearTimeout(this.timerId)

    this.timerId = null
    this.isPaused = false
    this.remainingTime = 0
  }
}
