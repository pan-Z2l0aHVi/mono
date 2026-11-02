import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <web-ui-dialog
        open={open}
        footerOrientation="horizontal"
        heading="保存这条消息？"
        onopen-change={event => setOpen(event.detail.open)}
      >
        <p className="m-0">这条消息尚未发送，并且包含未保存的更改。你可以先将它保存为草稿，稍后继续编辑。</p>
        <web-ui-button slot="footer" full variant="secondary" onClick={() => setOpen(false)}>
          放弃
        </web-ui-button>
        <web-ui-button slot="footer" full variant="primary" onClick={() => setOpen(false)}>
          保存草稿
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
