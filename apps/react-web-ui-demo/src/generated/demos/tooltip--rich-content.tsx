import { lucideInfo } from '@greypan/web-ui/icons'
import { useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-tooltip onopen-change={event => setLast(event.detail.open ? 'true' : 'false')}>
          <web-ui-button icon variant="ghost" aria-label="查看快捷键">
            <web-ui-icon icon={lucideInfo} size={16}></web-ui-icon>
          </web-ui-button>
          <div slot="content" className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">快捷键提示</span>
            <span>
              按 <kbd className="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>{' '}
              打开命令面板
            </span>
          </div>
        </web-ui-tooltip>
        <span className="text-sm text-(--wui-color-text-secondary)">悬停或聚焦图标按钮</span>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {last}</output>
    </div>
  )
}
