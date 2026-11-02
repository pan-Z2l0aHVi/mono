import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="grid" disabled>
        Grid
      </web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
