import { useState } from 'react'

export default function Demo() {
  const [customHeader, setCustomHeader] = useState(false)
  const [noHeader, setNoHeader] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setCustomHeader(true)}>自定义 header</web-ui-button>
        <web-ui-button onClick={() => setNoHeader(true)}>不渲染 header</web-ui-button>
      </div>

      <web-ui-drawer open={customHeader} closable onopen-change={event => setCustomHeader(event.detail.open)}>
        <div slot="header" className="flex items-baseline gap-2 px-5 py-4">
          <strong className="text-lg">账户设置</strong>
          <span className="text-xs text-(--wui-color-text-secondary)">已保存</span>
        </div>
        <p>header 插槽的内容完全由消费方决定，关闭按钮仍由组件提供。</p>
      </web-ui-drawer>

      <web-ui-drawer open={noHeader} onopen-change={event => setNoHeader(event.detail.open)}>
        <p>没有 heading，也没有 header 插槽，标题区不会占位。</p>
      </web-ui-drawer>
    </>
  )
}
