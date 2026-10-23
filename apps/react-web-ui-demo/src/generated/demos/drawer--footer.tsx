import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>编辑资料</web-ui-button>

      <web-ui-drawer open={open} heading="编辑资料" onopen-change={event => setOpen(event.detail.open)}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="m-0">
              第 {index + 1} 行内容，用来演示正文滚动。
            </p>
          ))}
        </div>

        <div slot="footer" className="flex gap-3">
          <web-ui-button variant="secondary" full onClick={() => setOpen(false)}>
            取消
          </web-ui-button>
          <web-ui-button full onClick={() => setOpen(false)}>
            保存
          </web-ui-button>
        </div>
      </web-ui-drawer>
    </>
  )
}
