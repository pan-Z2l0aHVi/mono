import { useState } from 'react'

export default function Demo() {
  const [pending, setPending] = useState(false)

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button disabled>Disabled</web-ui-button>
        <web-ui-button variant="primary" disabled>
          Disabled
        </web-ui-button>
        <web-ui-button loading>Loading</web-ui-button>
        <web-ui-button variant="primary" loading>
          Loading
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="primary" loading={pending} onClick={() => setPending(true)}>
          Save
        </web-ui-button>
        <web-ui-button variant="secondary" disabled={!pending} onClick={() => setPending(false)}>
          Stop waiting
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          loading: {pending ? 'true, the Save button cannot be clicked' : 'false'}
        </output>
      </div>
    </div>
  )
}
