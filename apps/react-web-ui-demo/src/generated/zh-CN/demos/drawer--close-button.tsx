import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [closable, setClosable] = useState(true)

  return (
    <>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setOpen(true)}>打开 drawer</web-ui-button>
        <web-ui-checkbox checked={closable} onChange={event => setClosable(event.currentTarget.checked)}>
          显示关闭按钮
        </web-ui-checkbox>
      </div>

      <web-ui-drawer
        open={open}
        heading="关闭按钮"
        closable={closable}
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p>关闭按钮由 closable 控制；关闭后可以重新勾选再打开对比。</p>
      </web-ui-drawer>
    </>
  )
}
