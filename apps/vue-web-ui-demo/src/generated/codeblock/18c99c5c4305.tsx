import { useState } from 'react'

export default function Demo() {
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input
        full
        clearable
        value={value}
        placeholder="Commits on blur after typing"
        onInput={event => setValue(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-input>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {value || '(empty)'} / change: {committed || '(not committed)'}
      </output>
    </div>
  )
}
