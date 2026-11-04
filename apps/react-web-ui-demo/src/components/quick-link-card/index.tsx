import { DEFAULT_DURATION_MS, pointerOffset, renderTilt, resetTilt, tiltEnabled } from '@greypan/doc-demo-kit'
import { Link } from '@tanstack/react-router'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'

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
