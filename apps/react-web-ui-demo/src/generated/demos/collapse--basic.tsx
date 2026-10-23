import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          展开详情
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            <p className="m-0">content slot 支持任意节点：文字、表单、图片，甚至另一条 collapse。</p>
          </div>
        </div>
      </web-ui-collapse>
      <output className="text-sm text-(--wui-color-text-secondary)">回写后的 open：{String(open)}</output>
    </div>
  )
}
