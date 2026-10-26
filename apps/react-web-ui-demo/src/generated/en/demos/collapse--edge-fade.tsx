export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse peek="200px">
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          peek 200px · default ratio 0.4
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: the last 80px (200px × 0.4) is the fade-plus-blur band.
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
          peek 200px · ratio 0.7, clamped by the cap
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 6 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: 200px × 0.7 = 140px, but it is drawn at the 112px cap.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
