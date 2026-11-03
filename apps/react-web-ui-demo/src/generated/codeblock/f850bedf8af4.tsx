import { shake } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <web-ui-button
        onClick={() => {
          if (cardRef.current) shake({ target: cardRef.current, xDistance: 18 })
        }}
      >
        Shake this card only
      </web-ui-button>
      <div
        ref={cardRef}
        className="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm"
      >
        Fields that still need attention live here.
      </div>
    </>
  )
}
