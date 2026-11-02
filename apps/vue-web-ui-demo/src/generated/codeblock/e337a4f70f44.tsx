import { useState } from 'react'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        allowCustomValue
        placeholder="输入候选之外的文本后按 Enter"
        onChange={event => {
          setSubmitted(event.currentTarget.value)
          setSelected(event.currentTarget.selectedValue)
        }}
      >
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        最近提交：{submitted || '(空)'} · selected-value：{selected || '(空)'}
      </output>
    </div>
  )
}
