import { useState } from 'react'

export default function Demo() {
  const [title, setTitle] = useState('季度复盘')
  const [draft, setDraft] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value={title}
        aria-label="标题"
        placeholder="未命名"
        onInput={event => setDraft(event.currentTarget.value)}
        onChange={event => {
          setTitle(event.currentTarget.value)
          setCommitted(event.currentTarget.value)
        }}
      ></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input 草稿：{draft || '(还没有输入)'} · change 提交：{committed || '(未提交)'}
      </output>
    </div>
  )
}
