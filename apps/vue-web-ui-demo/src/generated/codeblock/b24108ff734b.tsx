import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开</web-ui-button>
      <web-ui-dialog
        closable
        open={open}
        heading="示例"
        style={{ '--wui-dialog-close-size': '34px' }}
        onopen-change={event => setOpen(event.detail.open)}
      >
        示例
      </web-ui-dialog>
    </>
  )
}
