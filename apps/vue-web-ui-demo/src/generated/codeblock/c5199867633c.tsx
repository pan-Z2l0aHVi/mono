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
      {POSITIONS.map(position => (
        <web-ui-button key={position} variant="secondary" onClick={() => toast.info(position, { position })}>
          {position}
        </web-ui-button>
      ))}
    </div>
  )
}
