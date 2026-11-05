import type { WebUiSelect } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const picker = useRef<WebUiSelect>(null)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        ref={picker}
        trigger="none"
        placeholder="none 模式"
        aria-label="none 模式"
        onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}
      >
        <web-ui-option value="a" label="选项 A"></web-ui-option>
        <web-ui-option value="b" label="选项 B"></web-ui-option>
      </web-ui-select>
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button size="28" variant="secondary" onClick={() => picker.current?.show()}>
          show()
        </web-ui-button>
        <web-ui-button size="28" variant="secondary" onClick={() => picker.current?.hide()}>
          hide()
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {last}</output>
      </div>
    </div>
  )
}
