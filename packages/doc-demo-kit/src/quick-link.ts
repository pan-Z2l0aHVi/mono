export const TILT_MAX_DEGREES = 8
export const TILT_PERSPECTIVE_PX = 800
export const DEFAULT_DURATION_MS = 300

/** 阴影颜色既可能是 #RRGGBBAA，也可能是 rgb()/rgba()，两种都要能按比例调浅。只用于 `fadeShadow` 的 replace。 */
export const SHADOW_COLOR = /#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi

/** 只有精确指针设备才启用倾斜；触屏与「减少动态效果」偏好下保持静态。 */
export function tiltEnabled(disabled = false): boolean {
  if (disabled) return false
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** 影子单层：位移、模糊半径与透明度都随倾斜变化。显式拼接而不是模板字符串，避免被抽成语料。 */
export function shadowLayer(x: number, y: number, blur: number, alpha: number): string {
  return x.toFixed(1) + 'px ' + y.toFixed(1) + 'px ' + blur.toFixed(0) + 'px rgb(0 0 0 / ' + alpha.toFixed(2) + ')'
}

/** 按比例调低阴影各层的透明度，让主题原始阴影继续作为底子，只整体变浅。 */
export function fadeShadow(shadow: string, factor: number): string {
  if (factor >= 1) return shadow
  return shadow.replace(SHADOW_COLOR, function (color) {
    if (color.charAt(0) === '#') {
      const hex = color.slice(1)
      if (hex.length !== 8) return color
      const alpha = Math.round(parseInt(hex.slice(6), 16) * factor)
      return '#' + hex.slice(0, 6) + alpha.toString(16).padStart(2, '0')
    }
    const channels = color.match(/[\d.]+/g)
    if (!channels || channels.length < 3) return color
    const alpha = channels.length > 3 ? Number(channels[3]) : 1
    return 'rgba(' + channels.slice(0, 3).join(', ') + ', ' + (alpha * factor).toFixed(3) + ')'
  })
}

/** 指针在卡片内的归一化位置；限制在 ±0.5，指针擦到倾斜后溢出的边角时数值不会乱跑。 */
export function pointerOffset(
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  return {
    x: Math.min(0.5, Math.max(-0.5, (clientX - bounds.left) / bounds.width - 0.5)),
    y: Math.min(0.5, Math.max(-0.5, (clientY - bounds.top) / bounds.height - 0.5))
  }
}

/**
 * 倾斜时阴影落在抬起的一侧，同时按 lift 把主题原始阴影整体调浅：下压侧只剩一层很淡的
 * 底影，比平稳时更浅；抬起侧由附加层加深。指针停在正中时 lift 为 0，与未 hover 一致。
 *
 * 只覆盖 --wui-internal-glass-shadow（玻璃的投影槽），玻璃自身的 inset 高光不受影响。
 */
export function renderTilt(visual: HTMLElement, x: number, y: number, baseShadow: string): void {
  const rotateX = -y * TILT_MAX_DEGREES * 2
  const rotateY = x * TILT_MAX_DEGREES * 2
  const lift = Math.min(1, Math.hypot(x, y) * 2)

  visual.style.transform = [
    'perspective(' + TILT_PERSPECTIVE_PX + 'px)',
    'rotateX(' + rotateX.toFixed(2) + 'deg)',
    'rotateY(' + rotateY.toFixed(2) + 'deg)'
  ].join(' ')
  const tiltShadow = shadowLayer(-x * 40, -y * 40 + 2, 12 + lift * 10, lift * 0.07)
  const base = fadeShadow(baseShadow, 1 - lift * 0.65)
  visual.style.setProperty('--wui-internal-glass-shadow', base ? tiltShadow + ', ' + base : tiltShadow)
}

/** 立刻回到未倾斜状态；只在确实写过内联样式时动手，避免无谓地打断正在播放的过渡。 */
export function resetTilt(visual: HTMLElement): void {
  if (!visual.style.transform && !visual.style.getPropertyValue('--wui-internal-glass-shadow')) return
  visual.style.transitionDuration = '0s'
  visual.style.transform = ''
  visual.style.removeProperty('--wui-internal-glass-shadow')
}
