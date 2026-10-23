import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(true)
  const [rows, setRows] = useState(['第 1 行'])

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <web-ui-button
          variant="secondary"
          onClick={() => setRows(current => [...current, `第 ${current.length + 1} 行`])}
        >
          加一行
        </web-ui-button>
        <web-ui-button
          variant="secondary"
          disabled={rows.length === 1}
          onClick={() => setRows(current => current.slice(0, -1))}
        >
          删一行
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">行数：{rows.length}</output>
      </div>

      <web-ui-collapse open={open} onopen-change={event => setOpen(event.detail.open)}>
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          展开着改内容
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
