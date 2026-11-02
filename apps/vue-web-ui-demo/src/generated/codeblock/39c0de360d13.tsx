export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · 默认比例 0.4
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：末端那 80px（200px × 0.4）是渐隐加模糊的带子。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse peek="200px" className="[--wui-collapse-peek-edge-ratio:0.7]">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · 比例 0.7，被上限夹住
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：200px × 0.7 = 140px，实际按 112px 上限画。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
