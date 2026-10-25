import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [mounted, setMounted] = useState(true)
  const [saved, setSaved] = useState('')

  // The unmount is driven by this render, so change never reaches React's delegated root: attach a native listener and read the value from the element
  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onChange = () => {
      const value = element.value
      queueMicrotask(() => setSaved(value))
    }
    element.addEventListener('change', onChange)
    return () => element.removeEventListener('change', onChange)
  }, [mounted])

  return (
    <div className="flex flex-col items-start gap-3">
      {mounted ? (
        <web-ui-editable-text
          ref={fieldRef}
          commit-on-unmount
          value="Change a few characters, then click the unmount button below"
          aria-label="Unmountable"
        ></web-ui-editable-text>
      ) : (
        <span className="text-sm text-(--wui-color-text-secondary)">This line has been removed from the DOM</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => setMounted(false)}>Unmount this line</web-ui-button>
        <web-ui-button onClick={() => setMounted(true)}>Mount again</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          Preserved on unmount: {saved || '(nothing yet)'}
        </output>
      </div>
    </div>
  )
}
