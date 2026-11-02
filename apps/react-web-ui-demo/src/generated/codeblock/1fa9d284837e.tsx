import { useState } from 'react'

const cities = [
  { label: 'Beijing', value: 'beijing' },
  { label: 'Shanghai', value: 'shanghai' },
  { label: 'Guangzhou', value: 'guangzhou' },
  { label: 'Shenzhen', value: 'shenzhen' }
]

export default function Demo() {
  const [text, setText] = useState('')
  const [liveSelected, setLiveSelected] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        placeholder="Select Beijing, then delete one character"
        onInput={event => {
          const host = event.currentTarget
          setText(host.value)
          // selected-value is derived during the component's update cycle; only the next frame reads the value matching the current text
          requestAnimationFrame(() => setLiveSelected(host.selectedValue))
        }}
        onChange={event => {
          setText(event.currentTarget.value)
          setLiveSelected(event.currentTarget.selectedValue)
          setCommitted(event.currentTarget.selectedValue)
        }}
      >
        {cities.map(city => (
          <web-ui-option key={city.value} value={city.value} label={city.label}></web-ui-option>
        ))}
      </web-ui-autocomplete>
      <output className="text-sm text-(--wui-color-text-secondary)">
        input: {text || '(empty)'} · selected-value: {liveSelected || '(empty)'}
      </output>
      <output className="text-sm text-(--wui-color-text-secondary)">
        selected-value of the latest change: {committed || '(empty)'}
      </output>
    </div>
  )
}
