import { useState } from 'react'

export default function Demo() {
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-textarea
        full
        clearable
        rows={4}
        maxlength={20}
        value={value}
        placeholder="最多 20 字，输入后失焦即提交"
        onInput={event => setValue(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-textarea>
      <div className="flex items-center gap-3 text-sm text-(--wui-color-text-secondary)">
        <output>
          input：{value.length} / 20 · change：{committed ? `${committed.length} 字` : '(未提交)'}
        </output>
      </div>
    </div>
  )
}
