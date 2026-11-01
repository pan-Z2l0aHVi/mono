import type { WebUiSwitch } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiSwitch>(null)
  const [inputs, setInputs] = useState(0)
  const [changes, setChanges] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-switch
        ref={fieldRef}
        onInput={() => setInputs(count => count + 1)}
        onChange={() => setChanges(count => count + 1)}
      ></web-ui-switch>
      <web-ui-button
        onClick={() => {
          const field = fieldRef.current
          if (field) field.checked = !field.checked
        }}
      >
        Write checked programmatically
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input {inputs} times · change {changes} times
      </output>
    </div>
  )
}
