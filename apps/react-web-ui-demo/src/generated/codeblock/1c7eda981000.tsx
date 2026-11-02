import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('list')
  const [lockedView] = useState('list')

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">Item disabled</span>
        <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="grid" disabled>
            Grid
          </web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">Selected: {view}</output>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">Group disabled</span>
        <web-ui-segmented disabled value={lockedView}>
          <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="grid">Grid</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">Selected: {lockedView} (not switchable)</output>
      </div>
    </div>
  )
}
