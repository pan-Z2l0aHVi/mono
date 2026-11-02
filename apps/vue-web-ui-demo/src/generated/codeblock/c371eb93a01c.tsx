import { useState } from 'react'

export default function Demo() {
  const [framework, setFramework] = useState('vue')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        aria-label="Frontend framework"
        value={framework}
        placeholder="Select a framework"
        onChange={event => setFramework(event.currentTarget.value)}
      >
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setFramework('')}>Clear</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">Current value: {framework || '(empty)'}</output>
      </div>
      <web-ui-select placeholder="Disabled" disabled>
        <web-ui-option value="a" label="Unavailable"></web-ui-option>
      </web-ui-select>
    </div>
  )
}
