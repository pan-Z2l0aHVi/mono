import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(3)

  return (
    <div className="flex flex-wrap items-center gap-6">
      <web-ui-badge count={count}>
        <web-ui-button variant="secondary" onClick={() => setCount(value => value + 1)}>
          Inbox
        </web-ui-button>
      </web-ui-badge>

      <web-ui-button onClick={() => setCount(0)}>Clear unread</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">count={count}</output>
    </div>
  )
}
