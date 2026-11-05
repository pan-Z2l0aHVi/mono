import { toast, type ToastPosition } from '@greypan/web-ui'
import { useEffect } from 'react'

const POSITIONS: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right'
]

export default function Demo() {
  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-wrap gap-2">
      <web-ui-button
        onClick={() => {
          for (const position of POSITIONS) {
            toast.info(position, { id: `demo-position-${position}`, position, duration: 0 })
          }
        }}
      >
        显示全部位置
      </web-ui-button>
      <web-ui-button variant="secondary" onClick={() => toast.clear()}>
        清空
      </web-ui-button>
    </div>
  )
}
