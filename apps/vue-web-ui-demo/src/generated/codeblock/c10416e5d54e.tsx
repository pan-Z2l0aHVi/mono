import { useState } from 'react'

export default function Demo() {
  const [title, setTitle] = useState('Quarterly review')
  const [draft, setDraft] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-editable-text
        value={title}
        aria-label="Title"
        placeholder="Untitled"
        onInput={event => setDraft(event.currentTarget.value)}
        onChange={event => {
          setTitle(event.currentTarget.value)
          setCommitted(event.currentTarget.value)
        }}
      ></web-ui-editable-text>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input draft: {draft || '(nothing typed yet)'} · change commit: {committed || '(not committed)'}
      </output>
    </div>
  )
}
