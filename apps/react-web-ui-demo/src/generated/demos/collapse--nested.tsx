import { useState } from 'react'

export default function Demo() {
  const [outer, setOuter] = useState(false)
  const [inner, setInner] = useState(false)

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <web-ui-collapse
        open={outer}
        onopen-change={event => {
          // 内层的 open-change 会冒泡经过外层宿主：只认派发给自己这一条的。
          if (event.target === event.currentTarget) setOuter(event.detail.open)
        }}
      >
        <button
          type="button"
          className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
        >
          外层 collapse
        </button>
        <div slot="content">
          <div className="p-3">
            <p className="m-0 mb-2 text-sm">外层内容，里面再套一条。</p>
            <web-ui-collapse open={inner} onopen-change={event => setInner(event.detail.open)}>
              <button
                type="button"
                className="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
              >
                内层 collapse
              </button>
              <div slot="content">
                <div className="p-3 text-sm">内层展开后外层随之变高，两层各自持有 open。</div>
              </div>
            </web-ui-collapse>
          </div>
        </div>
      </web-ui-collapse>

      <output className="text-sm text-(--wui-color-text-secondary)">
        外层 {String(outer)} · 内层 {String(inner)}
      </output>
    </div>
  )
}
