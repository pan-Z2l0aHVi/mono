/**
 * @file timer
 * @description 增强型定时器工具（ControllableInterval）
 * 特性：
 * 1.进度保留：暂停 (pause) 时记录剩余时间，恢复 (resume) 时补全当前周期，而非重新计时
 * 2.状态可控：支持随时 start、pause、resume、stop
 * 3.链路稳健：基于递归 setTimeout 实现，避免原生 setInterval 在回调耗时过长时的“堆积”效应
 * 4.环境兼容：适配浏览器与 Node.js (SSR)，自动处理 Timeout 类型差异
 * @example
 * const timer = createControllableInterval(() => {
 *   console.log('tick')
 * }, 1000))
 * timer.start()
 * setTimeout(() => {
 *   timer.pause() // 运行 800ms 后暂停，剩余 200ms
 *   setTimeout(() => {
 *     timer.resume() // 200ms 后立即触发回调，随后回归 1000ms 周期
 *   }, 500)
 * }, 800)
 */

import { definePlugin } from '@/plugin'

export function defineControllableInterval(callback: () => void, interval: number) {
  return definePlugin(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null
    let isPaused = false
    let remainingTime = 0
    let lastStartTime = 0

    function tick(delay: number) {
      lastStartTime = Date.now()
      timerId = setTimeout(() => {
        callback()
        // 只有在没被暂停的情况下，才继续下一次循环
        if (!isPaused) tick(interval)
      }, delay)
    }

    function start() {
      if (timerId || isPaused) return

      tick(interval)
    }

    function pause() {
      if (isPaused || !timerId) return

      isPaused = true
      clearTimeout(timerId)
      timerId = null

      // 计算当前这一轮还剩多少时间没跑完
      const diff = Date.now() - lastStartTime
      remainingTime = Math.max(0, interval - diff)
    }

    function resume() {
      if (!isPaused) return

      isPaused = false
      // 恢复执行：先跑完上一轮剩下的时间
      tick(remainingTime || interval)
    }

    function stop() {
      if (timerId) clearTimeout(timerId)

      timerId = null
      isPaused = false
      remainingTime = 0
    }

    return {
      tick,
      start,
      pause,
      resume,
      stop
    }
  })
}

export function createControllableInterval(callback: () => void, interval: number) {
  return defineControllableInterval(callback, interval).make()
}
