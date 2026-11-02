import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const DEMO_ID = 'demo-close'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  function create() {
    setLast(`Created ${toast.info('This toast does not close automatically', { id: DEMO_ID, duration: 0 })}`)
  }

  function closeOne() {
    toast.close(DEMO_ID)
    setLast(`toast.close(${DEMO_ID})`)
  }

  function clearAll() {
    toast.clear()
    setLast('toast.clear()')
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={create}>Create one</web-ui-button>
        <web-ui-button variant="secondary" onClick={closeOne}>
          Close this one
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={clearAll}>
          Clear all
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last action: {last}</output>
    </div>
  )
}
