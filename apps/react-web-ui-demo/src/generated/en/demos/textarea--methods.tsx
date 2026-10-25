import type { WebUiTextarea } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiTextarea>(null)

  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea ref={fieldRef} rows={3} value="Type directly to replace after selecting all"></web-ui-textarea>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>Select all</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.blur()}>Blur</web-ui-button>
      </div>
    </div>
  )
}
