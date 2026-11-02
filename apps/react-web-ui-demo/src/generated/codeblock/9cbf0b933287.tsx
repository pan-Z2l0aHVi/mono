import type { WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const [report, setReport] = useState('还没读取')

  function inspect() {
    const el = theme.current
    if (!el) return
    const derived = el.resolvedAppearance
    const tampered = derived === 'dark' ? 'light' : 'dark'
    el.setAttribute('resolved-appearance', tampered)
    setReport(`解析结果 ${derived}；外部写入 ${tampered} 之后回读到 ${el.getAttribute('resolved-appearance')}`)
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-theme ref={theme} appearance="system">
        <web-ui-button onClick={inspect}>读取并尝试改写</web-ui-button>
      </web-ui-theme>
      <output className="text-sm text-(--wui-color-text-secondary)">{report}</output>
    </div>
  )
}
