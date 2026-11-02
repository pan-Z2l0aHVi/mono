import { Link } from '@tanstack/react-router'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'

const TILT_MAX_DEGREES = 8
const TILT_PERSPECTIVE_PX = 800
const DEFAULT_DURATION_MS = 300
/** 阴影颜色既可能是 #RRGGBBAA，也可能是 rgb()/rgba()，两种都要能按比例调浅。 */
const SHADOW_COLOR = /#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi

/** 只有精确指针设备才启用倾斜；触屏与「减少动态效果」偏好下保持静态。 */
function tiltEnabled(disabled: boolean) {
  if (disabled) return false
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** 影子单层：位移、模糊半径与透明度都随倾斜变化。显式拼接而不是模板字符串，避免被抽成语料。 */
function shadowLayer(x: number, y: number, blur: number, alpha: number) {
  return x.toFixed(1) + 'px ' + y.toFixed(1) + 'px ' + blur.toFixed(0) + 'px rgb(0 0 0 / ' + alpha.toFixed(2) + ')'
}

/** 按比例调低阴影各层的透明度，让主题原始阴影继续作为底子，只整体变浅。 */
function fadeShadow(shadow: string, factor: number) {
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
function pointerOffset(bounds: DOMRect, clientX: number, clientY: number) {
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
function renderTilt(visual: HTMLElement, x: number, y: number, baseShadow: string) {
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

function resetTilt(visual: HTMLElement) {
  if (!visual.style.transform && !visual.style.getPropertyValue('--wui-internal-glass-shadow')) return
  visual.style.transitionDuration = '0s'
  visual.style.transform = ''
  visual.style.removeProperty('--wui-internal-glass-shadow')
}

interface QuickLinkCardProps {
  path: string
  label: string
  desc: string
  /** 关闭倾斜效果，链接本身仍可点击。 */
  disabled?: boolean
  /** 进入/离开的过渡时长，单位毫秒。 */
  duration?: number
  /** 使用线性缓动；默认走主题的 ease-out 曲线。 */
  linear?: boolean
}

/**
 * 指针事件挂在没有 transform 的外层链接上，它的盒子是稳定的、命中区域不随倾斜变化；
 * 倾斜只作用于内层视觉元素，包围盒不会随倾斜变大、反过来推动倾斜形成抖动。
 *
 * 过渡交给 CSS：进入和离开各占 duration，进入后这段时间内指针的移动也走同一条过渡，
 * 之后改为 0s 直接跟手，既不截断起始动画、也不会持续拖尾。
 */
export default function QuickLinkCard({
  path,
  label,
  desc,
  disabled = false,
  duration = DEFAULT_DURATION_MS,
  linear = false
}: QuickLinkCardProps) {
  const visualRef = useRef<HTMLDivElement>(null)
  const baseShadowRef = useRef('')
  const startedAtRef = useRef(0)
  const trackingRef = useRef(false)
  const cleanupTokenRef = useRef(0)

  const easingClass = linear ? 'ease-linear' : 'ease-(--wui-ease-enter)'

  function getVisual() {
    const visual = visualRef.current
    if (!visual) return null
    if (!baseShadowRef.current) {
      baseShadowRef.current = getComputedStyle(visual).getPropertyValue('--wui-internal-glass-shadow').trim()
    }
    return visual
  }

  function handlePointerEnter() {
    // 重新进入时从当前位置接上，第一段移动重新按过渡时长播放。
    startedAtRef.current = 0
    trackingRef.current = false
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== 'mouse') return
    const visual = getVisual()
    if (!visual) return
    if (!tiltEnabled(disabled)) {
      resetTilt(visual)
      return
    }

    cleanupTokenRef.current += 1
    const now = performance.now()
    if (!startedAtRef.current) startedAtRef.current = now
    if (!trackingRef.current && now - startedAtRef.current >= duration) trackingRef.current = true
    visual.style.transitionDuration = trackingRef.current ? '0s' : duration + 'ms'

    const { x, y } = pointerOffset(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY)
    renderTilt(visual, x, y, baseShadowRef.current)
  }

  function handlePointerLeave() {
    const visual = getVisual()
    if (!visual || !visual.style.transform) return
    if (!tiltEnabled(disabled)) {
      resetTilt(visual)
      return
    }

    trackingRef.current = false
    visual.style.transitionDuration = duration + 'ms'
    renderTilt(visual, 0, 0, baseShadowRef.current)

    // 归位动画播完后再清掉内联样式，让卡片回到与未 hover 完全相同的状态。
    const token = cleanupTokenRef.current + 1
    cleanupTokenRef.current = token
    window.setTimeout(() => {
      if (cleanupTokenRef.current !== token) return
      resetTilt(visual)
    }, duration)
  }

  return (
    <Link
      to={path}
      className="relative block text-left"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={visualRef}
        className={[
          'wui-glass pointer-events-none flex min-h-32 flex-col justify-between rounded-3xl p-5',
          'transition-[transform,box-shadow]',
          easingClass,
          '[--wui-glass-corner-radius:24px]'
        ].join(' ')}
      >
        <div>
          <div className="font-semibold text-(--wui-color-text)">{label}</div>
          <p className="mt-2 text-xs leading-relaxed text-(--wui-color-text-secondary) line-clamp-2">{desc}</p>
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-(--wui-color-accent) opacity-70">
          查看演示 →
        </div>
      </div>
    </Link>
  )
}
