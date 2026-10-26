import { useState } from 'react'

export default function Demo() {
  const [clicks, setClicks] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" onClick={() => setClicks(count => count + 1)}>
        Click me
      </web-ui-button>
      <web-ui-button variant="primary" disabled onClick={() => setClicks(count => count + 1)}>
        Disabled (clicks are not counted)
      </web-ui-button>
      <web-ui-button variant="primary" loading onClick={() => setClicks(count => count + 1)}>
        Loading (clicks are not counted)
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">click: {clicks} times</output>
    </div>
  )
}
