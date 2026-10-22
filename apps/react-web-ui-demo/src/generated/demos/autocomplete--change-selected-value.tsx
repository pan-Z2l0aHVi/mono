import { useState } from 'react'

const cities = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' }
]

export default function Demo() {
  const [text, setText] = useState('')
  const [liveSelected, setLiveSelected] = useState('')
  const [committed, setCommitted] = useState('')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-autocomplete
        placeholder="选中北京后再删掉一个字"
        onInput={event => {
          const host = event.currentTarget
          setText(host.value)
          // selected-value 在组件的更新周期里派生，下一帧读到的才是与当前文本对应的值
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
        输入：{text || '(空)'} · selected-value：{liveSelected || '(空)'}
      </output>
      <output className="text-sm text-(--wui-color-text-secondary)">
        最近一次 change 的 selected-value：{committed || '(空)'}
      </output>
    </div>
  )
}
