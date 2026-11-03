import { useState } from 'react'

export default function Demo() {
  const [first, setFirst] = useState(false)
  const [second, setSecond] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setFirst(true)}>Open layer 1</web-ui-button>

      <web-ui-drawer open={first} pageShift heading="Layer 1" onopen-change={event => setFirst(event.detail.open)}>
        <p>Sibling drawers auto-nest by opening order: the first steps aside the most, the next one less.</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setSecond(true)}>
          Open sibling layer 2
        </web-ui-button>
      </web-ui-drawer>

      <web-ui-drawer open={second} pageShift heading="Layer 2" onopen-change={event => setSecond(event.detail.open)}>
        <p>
          This layer is a sibling of the previous one, yet it nests behind it visually and adds another share; closing
          it falls back to the previous layer's position.
        </p>
      </web-ui-drawer>
    </>
  )
}
