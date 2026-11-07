import { useState } from 'react'

export function App() {
  const [name, setName] = useState('')

  return (
    <>
      <web-ui-input value={name} placeholder="Name" onInput={event => setName(event.currentTarget.value)} />
      <web-ui-button variant="primary" onClick={() => alert(name)}>
        Greet
      </web-ui-button>
    </>
  )
}
