import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState([false, false, false])

  function setAt(index: number, value: boolean) {
    setOpen(current => current.map((item, i) => (i === index ? value : item)))
  }

  return (
    <>
      <web-ui-button onClick={() => setAt(0, true)}>Open drawer 1</web-ui-button>

      {open.map((value, index) => (
        <web-ui-drawer
          key={index}
          open={value}
          heading={`Sibling drawer ${index + 1}`}
          closable
          onopen-change={event => setAt(index, event.detail.open)}
        >
          <p>
            Sibling drawer {index + 1}.
            {index < open.length - 1
              ? ' Open the next drawer from the footer.'
              : ' Close to see the remaining layers rearrange.'}
          </p>
          {index < open.length - 1 && (
            <web-ui-button slot="footer" variant="secondary" full onClick={() => setAt(index + 1, true)}>
              Open drawer {index + 2}
            </web-ui-button>
          )}
        </web-ui-drawer>
      ))}
    </>
  )
}
