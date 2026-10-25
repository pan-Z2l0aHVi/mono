export default function Demo() {
  const rows = Array.from({ length: 20 }, (_, index) => `列表项 ${index + 1}`)

  return (
    <div className="flex w-full flex-col items-start gap-4 sm:flex-row">
      <web-ui-collapse className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          默认关闭稳态
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
            {rows.map(row => (
              <p key={row} className="m-0">
                {row}
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse keepMounted className="w-full sm:max-w-xs">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          keep-mounted 关闭稳态
        </button>
        <div slot="content">
          <div className="max-h-32 overflow-y-auto p-3 text-sm">
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
