import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={() => setLast(toast.success('Operation succeeded'))}>success</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.info('Informational message'))}>info</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.warning('Please note'))}>warning</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.error('Something went wrong'))}>error</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">Last created id: {last}</output>
    </div>
  )
}
