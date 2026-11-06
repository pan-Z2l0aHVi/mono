import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const field = useRef<WebUiAutocomplete>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-autocomplete
        ref={field}
        trigger="none"
        placeholder="none mode"
        aria-label="none mode"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-option value="bug" label="Bug"></web-ui-option>
        <web-ui-option value="feature" label="Feature"></web-ui-option>
      </web-ui-autocomplete>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => field.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => field.current?.hide()}>
          hide()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">Last detail.open = {last}</output>
      </div>
    </div>
  )
}
