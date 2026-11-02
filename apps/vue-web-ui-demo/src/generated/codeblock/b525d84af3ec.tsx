import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState<string[]>([])

  function record(name: string) {
    setLog(entries => [...entries.slice(-5), name])
  }

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <div className="flex items-center gap-3">
        <web-ui-switch onInput={() => record('input')} onChange={() => record('change')}></web-ui-switch>
        <span className="text-sm text-(--wui-color-text-secondary)">
          Press and drag the whole control; crossing the midpoint or flicking sets the value
        </span>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        {log.length === 0 ? 'Waiting for interaction' : log.join(' → ')}
      </output>
    </div>
  )
}
