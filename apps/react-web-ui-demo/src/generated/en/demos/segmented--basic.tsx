import { useState } from 'react'

export default function Demo() {
  const [day, setDay] = useState('wed')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-segmented value={day} onInput={event => setDay(event.currentTarget.value)}>
        <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output className="text-sm text-(--wui-color-text-secondary)">Selected: {day}</output>
    </div>
  )
}
