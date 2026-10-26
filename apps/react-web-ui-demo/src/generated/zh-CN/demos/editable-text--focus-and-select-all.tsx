import type { WebUiEditableText } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text ref={fieldRef} value="全选之后可以直接输入替换" aria-label="替换"></web-ui-editable-text>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>全选</web-ui-button>
      </div>
    </div>
  )
}
