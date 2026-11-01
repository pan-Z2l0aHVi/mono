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
          placeholder="Multiline trigger: Enter inserts a newline, Escape or blur closes the panel"
        ></web-ui-textarea>
        <web-ui-option value="bug" label="Bug"></web-ui-option>
        <web-ui-option value="feature" label="Feature"></web-ui-option>
      </web-ui-autocomplete>
      <web-ui-button onClick={() => fieldRef.current?.focus()}>Focus the trigger</web-ui-button>
    </div>
  )
}
