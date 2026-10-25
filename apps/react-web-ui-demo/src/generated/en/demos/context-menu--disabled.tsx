import { useState } from 'react'

export default function Demo() {
  const [disabled, setDisabled] = useState(false)
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <web-ui-context-menu
        className="w-full"
        disabled={disabled}
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <div className="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text-secondary)">
          {disabled ? 'The menu is disabled: right-click does not open it' : 'Right-click in this area'}
        </div>
        <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      </web-ui-context-menu>
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setDisabled(value => !value)}>
          {disabled ? 'Enable menu' : 'Disable menu'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          disabled = {String(disabled)} · open-change: {count} times · last detail.open = {last}
        </output>
      </div>
    </div>
  )
}
