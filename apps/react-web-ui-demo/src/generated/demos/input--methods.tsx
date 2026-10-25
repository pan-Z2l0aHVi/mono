import type { WebUiInput } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiInput>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-input ref={fieldRef} aria-label="待聚焦的输入框" value="把焦点交给它"></web-ui-input>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.select()}>全选</web-ui-button>
      <web-ui-button onClick={() => fieldRef.current?.blur()}>失焦</web-ui-button>
    </div>
  )
}
