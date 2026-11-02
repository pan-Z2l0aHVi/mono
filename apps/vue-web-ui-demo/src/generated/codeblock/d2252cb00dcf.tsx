import { useState } from 'react'

export default function Demo() {
  const [log, setLog] = useState('No clicks yet')

  return (
    <form
      className="flex flex-wrap items-center gap-4"
      onSubmit={event => {
        event.preventDefault()
        setLog('The outer form received submit')
      }}
    >
      <web-ui-input name="note" placeholder="Note"></web-ui-input>
      <web-ui-button-group
        onClick={event => {
          const id = (event.target as HTMLElement).dataset.id
          if (id) setLog(`Clicked ${id}`)
        }}
      >
        <web-ui-button variant="secondary" type="submit" data-id="save">
          Save
        </web-ui-button>
        <web-ui-button variant="secondary" data-id="copy">
          Copy
        </web-ui-button>
        <web-ui-button variant="secondary" loading data-id="pending">
          Pending
        </web-ui-button>
        <web-ui-button variant="danger" disabled data-id="delete">
          Delete
        </web-ui-button>
      </web-ui-button-group>
      <output className="text-sm text-(--wui-color-text-secondary)">{log}</output>
    </form>
  )
}
