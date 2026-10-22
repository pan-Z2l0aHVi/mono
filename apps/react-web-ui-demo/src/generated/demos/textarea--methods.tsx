import type { WebUiTextarea } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiTextarea>(null)

  return (
    <div className="flex flex-col gap-3">
      <web-ui-textarea ref={fieldRef} rows={3} value="全选之后可以直接输入替换"></web-ui-textarea>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.select()}>全选</web-ui-button>
        <web-ui-button onClick={() => fieldRef.current?.blur()}>失焦</web-ui-button>
      </div>
    </div>
  )
}
