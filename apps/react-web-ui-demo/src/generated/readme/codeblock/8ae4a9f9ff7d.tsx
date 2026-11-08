import { useState } from 'react'

export function App() {
  const [name, setName] = useState('')

  return (
    <>
      <web-ui-input value={name} placeholder="姓名" onInput={event => setName(event.currentTarget.value)} />
      <web-ui-button variant="primary" onClick={() => alert(name)}>
        问候
      </web-ui-button>
    </>
  )
}
