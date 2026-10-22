import { useState } from 'react'

export default function Demo() {
  const [inputValue, setInputValue] = useState(40)
  const [changeValue, setChangeValue] = useState(40)

  return (
    <div className="flex flex-wrap items-center gap-5">
      <web-ui-slider
        aria-label="事件演示"
        marks
        step={5}
        min={10}
        max={90}
        value={inputValue}
        onInput={event => setInputValue(event.currentTarget.value)}
        onChange={event => setChangeValue(event.currentTarget.value)}
      ></web-ui-slider>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {inputValue} / change: {changeValue}
      </output>
    </div>
  )
}
