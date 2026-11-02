import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [last, setLast] = useState('还没有操作')

  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onCancel = () => setLast('cancel：Escape 已把值恢复成进入编辑时的状态')
    element.addEventListener('cancel', onCancel)
    return () => element.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text ref={fieldRef} value="改几个字，然后按 Escape"></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">{last}</output>
    </div>
  )
}
