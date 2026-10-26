import { useState } from 'react'

type Placement = 'right' | 'left' | 'top' | 'bottom'

const placements: { label: string; value: Placement }[] = [
  { label: '右侧', value: 'right' },
  { label: '左侧', value: 'left' },
  { label: '顶部', value: 'top' },
  { label: '底部', value: 'bottom' }
]

const labels: Record<Placement, string> = {
  right: '右侧',
  left: '左侧',
  top: '顶部',
  bottom: '底部'
}

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement>('right')

  function openFrom(next: Placement) {
    setPlacement(next)
    setOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {placements.map(item => (
          <web-ui-button key={item.value} onClick={() => openFrom(item.value)}>
            {item.label}
          </web-ui-button>
        ))}
      </div>

      <web-ui-drawer
        open={open}
        placement={placement}
        heading="设置"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>从{labels[placement]}滑入。按 Escape 或点击遮罩关闭。</p>
      </web-ui-drawer>
    </>
  )
}
