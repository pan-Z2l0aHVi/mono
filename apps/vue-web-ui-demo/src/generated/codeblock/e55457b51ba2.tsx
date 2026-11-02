import { useState } from 'react'

export default function Demo() {
  const [view, setView] = useState('day')

  return (
    <web-ui-segmented value={view} onInput={event => setView(event.currentTarget.value)}>
      <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
    </web-ui-segmented>
  )
}
