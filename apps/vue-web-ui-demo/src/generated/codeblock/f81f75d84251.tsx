import { useState } from 'react'

export default function Demo() {
  const [outer, setOuter] = useState(false)
  const [inner, setInner] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse
        open={outer}
        onopen-change={event => {
          // The inner open-change bubbles through the outer host: only accept the one dispatched to this element.
          if (event.target === event.currentTarget) setOuter(event.detail.open)
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          Outer collapse
        </button>
        <div slot="content">
          <div className="p-3">
            <p className="m-0 mb-2 text-sm">Outer content, with another one nested inside.</p>
            <web-ui-collapse open={inner} onopen-change={event => setInner(event.detail.open)}>
              <button
                type="button"
                className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
              >
                Inner collapse
              </button>
              <div slot="content">
                <div className="p-3 text-sm">
                  Expanding the inner one makes the outer one taller; each level holds its own open.
                </div>
              </div>
            </web-ui-collapse>
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        outer {String(outer)} · inner {String(inner)}
      </output>
    </div>
  )
}
