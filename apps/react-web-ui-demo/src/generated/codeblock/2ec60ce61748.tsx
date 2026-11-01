import { useState } from 'react'

type FilterMode = 'contains' | 'prefix' | 'none'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']

export default function Demo() {
  const [mode, setMode] = useState<FilterMode>('contains')

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-select
          className="[--wui-input-width:140px]"
          value={mode}
          onChange={event => setMode(event.currentTarget.value as FilterMode)}
        >
          <web-ui-option value="contains" label="contains"></web-ui-option>
          <web-ui-option value="prefix" label="prefix"></web-ui-option>
          <web-ui-option value="none" label="none"></web-ui-option>
        </web-ui-select>
        <output className="text-sm text-(--wui-color-text-secondary)">Current mode: {mode}</output>
      </div>
      <web-ui-autocomplete filter={mode} placeholder="Type a framework name">
        {frameworks.map(name => (
          <web-ui-option key={name} value={name} label={name}></web-ui-option>
        ))}
      </web-ui-autocomplete>
    </div>
  )
}
