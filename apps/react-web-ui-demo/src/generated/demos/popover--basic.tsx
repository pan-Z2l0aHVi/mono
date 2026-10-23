import { useState } from 'react'

export default function Demo() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <web-ui-popover
        onopen-change={event => {
          setCount(value => value + 1)
          setLast(event.detail.open ? 'true' : 'false')
        }}
      >
        <web-ui-button slot="trigger" variant="secondary">
          显示详情
        </web-ui-button>
        <div className="flex max-w-xs flex-col gap-1 text-sm">
          <span className="font-semibold">发布详情</span>
          <span>panel 放任意节点；点 trigger 切换，点外面或按 Escape 关闭。</span>
        </div>
      </web-ui-popover>
      <output className="text-sm text-(--wui-color-text-secondary)">
        open-change：{count} 次 · 最后一次 detail.open = {last}
      </output>
    </div>
  )
}
