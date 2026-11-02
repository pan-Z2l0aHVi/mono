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
          Explicit length 28px · blur 10px
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: the band length ignores the 0.4 derivation of peek, and the blur radius rises
                from 4px to 10px.
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
          Edge color from the shared border color
        </button>
        <div slot="content">
          <div className="p-3 text-sm">
            {Array.from({ length: 5 }, (_, index) => (
              <p key={index} className="m-0">
                Paragraph {index + 1}: the clipping edge uses the border color as its base, and the band fades from the
                edge inwards.
              </p>
            ))}
          </div>
        </div>
      </web-ui-collapse>
    </div>
  )
}
