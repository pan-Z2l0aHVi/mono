import type { CSSProperties } from 'react'
import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const sizes: { label: string; placement: Placement; size: string }[] = [
  { label: 'Right 400px', placement: 'right', size: '400px' },
  { label: 'Left 260px', placement: 'left', size: '260px' },
  { label: 'Top 400px', placement: 'top', size: '400px' },
  { label: 'Bottom 160px', placement: 'bottom', size: '160px' }
]

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(sizes[0])

  const vertical = current.placement === 'top' || current.placement === 'bottom'

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {sizes.map(item => (
          <web-ui-button
            key={item.label}
            onClick={() => {
              setCurrent(item)
              setOpen(true)
            }}
          >
            {item.label}
          </web-ui-button>
        ))}
      </div>

      <web-ui-drawer
        open={open}
        placement={current.placement}
        heading={current.label}
        onopen-change={event => setOpen(event.detail.open)}
        style={
          {
            '--wui-drawer-width': vertical ? undefined : current.size,
            '--wui-drawer-height': vertical ? current.size : undefined
          } as CSSProperties
        }
      >
        <p>Current size: {current.size}</p>
      </web-ui-drawer>
    </>
  )
}
