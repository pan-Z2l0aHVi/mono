import type { WebUiDropdownItem } from '@greypan/web-ui'
import { useCallback, useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('—')

  // menu item 打开时被迁进 portal panel，React 的 onClick 委托在根容器收不到；这里直接挂原生 click。
  const handleItemRef = useCallback((item: WebUiDropdownItem | null) => {
    if (!item) return
    const element = item
    const close = () => {
      setLast(element.textContent?.trim() || element.value)
      setOpen(false)
    }
    element.addEventListener('click', close)
    return () => element.removeEventListener('click', close)
  }, [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" onClick={() => setOpen(value => !value)}>
          {open ? '关闭菜单' : '打开菜单'}
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          状态：{open ? 'open' : 'closed'} · 最近选择：{last}
        </output>
      </div>

      <web-ui-dropdown open={open} onopen-change={event => setOpen(event.detail.open)}>
        <web-ui-button slot="trigger" variant="secondary">
          受控菜单
        </web-ui-button>
        <web-ui-dropdown-item ref={handleItemRef} value="edit">
          编辑
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="copy">
          复制
        </web-ui-dropdown-item>
        <web-ui-dropdown-item ref={handleItemRef} value="archive">
          归档
        </web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
  )
}
