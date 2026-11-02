import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="grid" disabled>
        网格
      </web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
