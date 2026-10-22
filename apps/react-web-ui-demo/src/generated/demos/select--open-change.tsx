import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        placeholder="打开或关闭 panel"
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-option value="a" label="选项 A"></web-ui-option>
        <web-ui-option value="b" label="选项 B"></web-ui-option>
      </web-ui-select>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
