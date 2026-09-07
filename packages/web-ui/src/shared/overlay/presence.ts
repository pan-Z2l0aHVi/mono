const DEFAULT_EXIT_DURATION = 160
const EXIT_FALLBACK_BUFFER = 80

const pendingExits = new WeakMap<HTMLElement, () => void>()

interface OverlayPresenceOptions {
  isInstant?: boolean
}

function parseDuration(value: string): number {
  const trimmed = value.trim()
  if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed)
  if (trimmed.endsWith('s')) return Number.parseFloat(trimmed) * 1000
  return 0
}

// 读取元素实际 CSS transition 的最长时长，供可覆盖主题 token 的 JS 生命周期使用。
export function getTransitionDuration(panel: HTMLElement, fallback = DEFAULT_EXIT_DURATION): number {
  const style = getComputedStyle(panel)
  const durations = style.transitionDuration.split(',').map(parseDuration)
  const delays = style.transitionDelay.split(',').map(parseDuration)
  const longest = durations.reduce(
    (max, duration, index) => Math.max(max, duration + (delays[index] ?? delays[0] ?? 0)),
    0
  )

  return longest || fallback
}

// 以可中断的方式显示浮层，避免快速切换时重启动画。
export function showOverlayPresence(panel: HTMLElement, options: OverlayPresenceOptions = {}) {
  pendingExits.get(panel)?.()
  panel.hidden = false
  if (options.isInstant) {
    panel.dataset.wuiPresence = 'open'
    return
  }
  panel.dataset.wuiPresence = 'entering'

  // 提交初始状态，让新挂载的面板拥有过渡起点。
  void panel.offsetWidth

  requestAnimationFrame(() => {
    if (panel.dataset.wuiPresence === 'entering') panel.dataset.wuiPresence = 'open'
  })
}

// 播放退出过渡；若在结束前重新显示则返回 false。
export function hideOverlayPresence(panel: HTMLElement): Promise<boolean> {
  pendingExits.get(panel)?.()
  panel.dataset.wuiPresence = 'closing'

  // jsdom 等没有计算 CSS transition 的环境无需伪造退场等待。
  if (getTransitionDuration(panel, 0) === 0) {
    panel.hidden = true
    return Promise.resolve(true)
  }

  return new Promise(resolve => {
    let settled = false
    const finish = (didClose: boolean) => {
      if (settled) return
      settled = true
      panel.removeEventListener('transitionend', onTransitionEnd)
      clearTimeout(timeout)
      pendingExits.delete(panel)
      if (didClose && panel.dataset.wuiPresence === 'closing') panel.hidden = true
      resolve(didClose)
    }

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === panel && (event.propertyName === 'opacity' || event.propertyName === 'transform'))
        finish(true)
    }

    pendingExits.set(panel, () => finish(false))
    panel.addEventListener('transitionend', onTransitionEnd)
    const timeout = setTimeout(() => finish(true), getTransitionDuration(panel) + EXIT_FALLBACK_BUFFER)
  })
}
