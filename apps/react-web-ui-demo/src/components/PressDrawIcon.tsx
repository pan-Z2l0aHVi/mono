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
      /*
       * 点击可能同时换掉 light DOM 里的 icon（复制成功把复制图标换成对勾）。replay 收集的是
       * 当下的几何，必须等宿主提交之后再跑：release 里的 microtask 早于 React 处理外部
       * store 的提交，会画在即将被替换的旧 icon 上，新 icon 就整段没有描边。下一帧再收集，
       * 新 icon 已经挂上；`updateComplete` 等它自己的 shadow SVG 就位。
       */
      requestAnimationFrame(() => {
        void (async () => {
          await Promise.all([...el.querySelectorAll<WebUiIcon>('web-ui-icon')].map(icon => icon.updateComplete))
          if (el.isConnected) void el.replay()
        })()
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
