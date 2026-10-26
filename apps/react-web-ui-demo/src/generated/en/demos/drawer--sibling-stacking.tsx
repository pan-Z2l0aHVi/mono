import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState([false, false, false])

  function setAt(index: number, value: boolean) {
    setOpen(current => current.map((item, i) => (i === index ? value : item)))
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {open.map((_, index) => (
          <web-ui-button key={index} onClick={() => setAt(index, true)}>
            Open drawer {index + 1}
          </web-ui-button>
        ))}
      </div>

      {open.map((value, index) => (
        <web-ui-drawer
          key={index}
          open={value}
          heading={`Sibling drawer ${index + 1}`}
          closable
          onopen-change={event => setAt(index, event.detail.open)}
        >
          <p>Sibling drawer {index + 1}. Open the next one and watch this layer scale down and expose its edge.</p>
        </web-ui-drawer>
      ))}
    </>
  )
}
