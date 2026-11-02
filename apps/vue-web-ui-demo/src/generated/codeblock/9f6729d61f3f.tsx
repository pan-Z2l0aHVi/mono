import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('day')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
