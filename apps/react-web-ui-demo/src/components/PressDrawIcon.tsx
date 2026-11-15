import type { WebUiIcon, WebUiSvgDrawLines } from '@greypan/web-ui'
import { useEffect, useRef, type ReactNode } from 'react'

export function PressDrawIcon({ children }: { children: ReactNode }) {
  const lines = useRef<WebUiSvgDrawLines>(null)
  const animation = useRef<Animation | null>(null)
  useEffect(() => {
    const el = lines.current
    if (!el) return
    const trigger = el.closest('button,web-ui-button')
    const reduced = () =>
      el.closest('web-ui-theme')?.getAttribute('motion') === 'reduced' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const press = () => {
      animation.current?.cancel()
      if (!reduced()) el.style.transform = 'scale(.8)'
    }
    const cancel = () => {
      el.style.transform = ''
    }
    const release = () => {
      const current = getComputedStyle(el).transform
      el.style.transform = ''
      if (!reduced()) {
        animation.current?.cancel()
        animation.current = el.animate(
          [{ transform: current }, { transform: 'scale(1.6)', offset: 0.4 }, { transform: 'scale(1)' }],
          { duration: 420, easing: 'cubic-bezier(.23,1,.32,1)' }
        )
      }
      queueMicrotask(async () => {
        await Promise.all([...el.querySelectorAll<WebUiIcon>('web-ui-icon')].map(icon => icon.updateComplete))
        if (el.isConnected) void el.replay()
      })
    }
    trigger?.addEventListener('pointerdown', press)
    trigger?.addEventListener('pointercancel', cancel)
    trigger?.addEventListener('click', release)
    window.addEventListener('pointerup', cancel)
    return () => {
      trigger?.removeEventListener('pointerdown', press)
      trigger?.removeEventListener('pointercancel', cancel)
      trigger?.removeEventListener('click', release)
      window.removeEventListener('pointerup', cancel)
      animation.current?.cancel()
    }
  }, [])
  return (
    <web-ui-svg-draw-lines
      ref={lines}
      duration={300}
      easing="ease-out"
      noAutoplay
      className="inline-flex transition-transform duration-150 motion-reduce:transition-none"
    >
      {children}
    </web-ui-svg-draw-lines>
  )
}
