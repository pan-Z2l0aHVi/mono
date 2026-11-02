import type { WebUiInput } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiInput>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input aria-label="Input to focus" ref={fieldRef} value="Hand focus to it"></web-ui-input>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.select()}>Select all</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.blur()}>Blur</web-ui-button>
    </div>
  )
}
