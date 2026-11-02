import type { WebUiEditableText } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        ref={fieldRef}
        value="Type directly to replace after selecting all"
        aria-label="Replace"
      ></web-ui-editable-text>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>Select all</web-ui-button>
      </div>
    </div>
  )
}
