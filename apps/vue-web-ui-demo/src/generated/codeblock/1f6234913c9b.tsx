export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="80px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 80px（内容比它长）
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 8 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：关闭时只露出前 80px，露出的这一截也点不动。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px（内容比它短）
        </button>
        <div slot="content">
          <div className="p-3 text-sm">内容不足 200px：收起高度取内容实际高度，不会被撑到 200px。</div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
