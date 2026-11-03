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
        只震这张卡片
      </web-ui-button>
      <div
        ref={cardRef}
        className="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm"
      >
        没有填完的字段还在这块里。
      </div>
    </>
  )
}
