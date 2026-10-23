import type { CSSProperties } from 'react'

export default function Demo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <web-ui-collapse
        peek="160px"
        style={
          {
            '--wui-collapse-peek-edge': '28px',
            '--wui-collapse-peek-edge-blur': '10px'
          } as CSSProperties
        }
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          显式长度 28px · 模糊 10px
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：带子长度不听 peek 的 0.4 推导，模糊半径也从 4px 提到 10px。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>

      <web-ui-collapse
        peek="160px"
        style={{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' } as CSSProperties}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          末端颜色取共享 border 色
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                段落 {index + 1}：末端落到 0.3 alpha 而不是全透明，裁剪边缘因此留着残影。
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
