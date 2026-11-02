import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('week')
  const [inputCount, setInputCount] = useState(0)
  const [changeCount, setChangeCount] = useState(0)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented
        value={view}
        onInput={event => {
          setView(event.currentTarget.value)
          setInputCount(count => count + 1)
        }}
        onChange={event => {
          setView(event.currentTarget.value)
          setChangeCount(count => count + 1)
        }}
      >
        <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {inputCount} / change: {changeCount} · 当前值：{view}
      </output>
      <web-ui-button onClick={() => setView('month')}>外部设为「月」</web-ui-button>
    </div>
  )
}
