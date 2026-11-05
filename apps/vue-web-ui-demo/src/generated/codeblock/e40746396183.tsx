import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [id, setId] = useState('-')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button
          onClick={() => {
            setId(
              toast({
                heading: 'Saved',
                message: 'Changes written to the cloud',
                type: 'info',
                position: 'top-center',
                duration: 4000,
                closable: true
              })
            )
          }}
        >
          Create a toast with full options
        </web-ui-button>
        <web-ui-button
          variant="secondary"
          onClick={() => {
            setId(
              toast({
                heading: 'Cannot close',
                message: 'This toast has no close button',
                type: 'warning',
                position: 'bottom-right',
                duration: 6000,
                closable: false
              })
            )
          }}
        >
          Create a toast without a close button
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id: {id} · the first closes after 4 seconds, the second after 6
      </output>
    </div>
  )
}
