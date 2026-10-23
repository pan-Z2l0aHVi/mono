import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef } from 'react'

export default function Demo() {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  useEffect(() => {
    const box = boxRef.current
    if (box && backTopRef.current) backTopRef.current.scrollTarget = box
  }, [])

  return (
    <div ref={boxRef} className="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
      {Array.from({ length: 20 }, (_, index) => (
        <p key={index} className="m-0 py-1 text-sm">
          滚动容器第 {index + 1} 行
        </p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={100} scrollBehavior="auto"></web-ui-back-top>
    </div>
  )
}
