import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

export interface DelayedFallbackProps {
  /** Delay before showing the fallback. Defaults to 150ms. */
  delayMs?: number
  /** Reserved height while the fallback is hidden. */
  minHeight?: string | number
  children: ReactNode
}

/**
 * Reserve space immediately but only render the skeleton after `delayMs`.
 *
 * The wrapper always keeps `minHeight`, so a fast load does not shift layout
 * when the real content replaces the fallback.
 */
export function DelayedFallback({ delayMs = 150, minHeight = 160, children }: DelayedFallbackProps) {
  const [visible, setVisible] = useState(delayMs <= 0)
  const style = {
    '--loading-min-height': typeof minHeight === 'number' ? `${minHeight}px` : minHeight
  } as CSSProperties

  useEffect(() => {
    if (delayMs <= 0) return
    const timer = window.setTimeout(() => setVisible(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  return (
    <div className="loading-delayed-fallback" aria-busy="true" style={style}>
      {visible ? children : null}
    </div>
  )
}
