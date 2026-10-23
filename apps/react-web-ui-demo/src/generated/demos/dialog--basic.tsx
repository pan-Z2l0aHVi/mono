import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button onClick={() => setOpen(true)}>打开 dialog</web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{changes} 次 · 最后一次 detail.open = {last}
      </output>
      <web-ui-dialog
        open={open}
        heading="确认操作"
        closable
        onopen-change={event => {
          setChanges(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
          setOpen(event.detail.open)
        }}
      >
        <p className="m-0">删除后无法恢复，确定继续吗？</p>
        <web-ui-button slot="footer" variant="secondary" onClick={() => setOpen(false)}>
          取消
        </web-ui-button>
        <web-ui-button slot="footer" variant="danger" onClick={() => setOpen(false)}>
          删除
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
