import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [last, setLast] = useState('No action yet')

  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onCancel = () => setLast('cancel: Escape restored the value to the state when editing began')
    element.addEventListener('cancel', onCancel)
    return () => element.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text ref={fieldRef} value="Change a few characters, then press Escape"></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">{last}</output>
    </div>
  )
}
