import { useState } from 'react'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        value={text}
        placeholder="输入框架名"
        onInput={event => setText(event.currentTarget.value)}
        onChange={event => {
          setText(event.currentTarget.value)
          setPicked(event.currentTarget.selectedValue)
        }}
      >
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        输入：{text || '(空)'} · selected-value：{picked || '(空)'}
      </output>
    </div>
  )
}
