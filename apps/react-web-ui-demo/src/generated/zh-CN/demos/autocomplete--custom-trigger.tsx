import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useRef } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiAutocomplete>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete ref={fieldRef} filter="none">
        <web-ui-textarea
          slot="trigger"
          rows={3}
          className="[--wui-textarea-width:20rem]"
          placeholder="多行 trigger：Enter 换行，Escape 或失焦关闭 panel"
        ></web-ui-textarea>
        <web-ui-option value="bug" label="缺陷"></web-ui-option>
        <web-ui-option value="feature" label="需求"></web-ui-option>
      </web-ui-autocomplete>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>聚焦 trigger</web-ui-button>
    </div>
  )
}
