import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)">
          Right-click in this area
        </div>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" size={14} icon={lucideCopy}></web-ui-icon>Copy
          <span slot="suffix" className="opacity-40">
            ⌘C
          </span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-item>
          <web-ui-icon slot="prefix" size={14} icon={lucideClipboardPaste}></web-ui-icon>Paste
          <span slot="suffix" className="opacity-40">
            ⌘V
          </span>
        </web-ui-dropdown-item>
        <web-ui-dropdown-divider></web-ui-dropdown-divider>
        <web-ui-dropdown-item disabled>
          <web-ui-icon slot="prefix" size={14} icon={lucideTrash2}></web-ui-icon>Delete
          <span slot="suffix" className="opacity-40">
            ⌫
          </span>
        </web-ui-dropdown-item>
      </web-ui-context-menu>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change: {count} times · last detail.open = {last}
      </output>
    </div>
  )
}
