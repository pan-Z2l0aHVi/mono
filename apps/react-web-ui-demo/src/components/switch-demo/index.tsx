import { useState } from 'react'

function SwitchDemo() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div>
      <h1>switch</h1>
      <h2>Basic usage</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-switch checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)} />
        <span className="text-sm text-gray-600">{enabled ? 'On' : 'Close'}</span>
      </div>
      <p className="text-xs text-gray-400">
        💡 Tap to switch instantly, drag across the whole track to track smoothly, or flick to throw
      </p>
      <h2>Disabled</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-switch checked disabled />
        <span className="text-sm text-gray-500">Disabled</span>
      </div>
      <h2>Loading</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-switch checked loading />
        <span className="text-sm text-gray-500">Loading</span>
      </div>
    </div>
  )
}
export default SwitchDemo
