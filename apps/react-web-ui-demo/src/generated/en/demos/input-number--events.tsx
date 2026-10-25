import { useState } from 'react'

export default function Demo() {
  const [live, setLive] = useState(1)
  const [committed, setCommitted] = useState(1)

  return (
    <div className="flex w-full flex-col gap-3">
      <web-ui-input-number
        value={live}
        min={0}
        max={99}
        step={1}
        onInput={event => setLive(event.currentTarget.value)}
        onChange={event => setCommitted(event.currentTarget.value)}
      ></web-ui-input-number>
      <output className="text-sm text-(--wui-color-text-secondary)">
        Follows input: {live} · change, only at commit points: {committed}
      </output>
    </div>
  )
}
