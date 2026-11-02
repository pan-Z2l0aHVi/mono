import type { WebUiEditableText } from '@greypan/web-ui'
import { useEffect, useRef, useState } from 'react'

export default function Demo() {
  const fieldRef = useRef<WebUiEditableText>(null)
  const [mounted, setMounted] = useState(true)
  const [saved, setSaved] = useState('')

  // 卸载由这次 render 驱动，change 到不了 React 的委托根：挂原生监听，从元素上读值
  useEffect(() => {
    const element = fieldRef.current
    if (!element) return
    const onChange = () => {
      const value = element.value
      queueMicrotask(() => setSaved(value))
    }
    element.addEventListener('change', onChange)
    return () => element.removeEventListener('change', onChange)
  }, [mounted])

  return (
    <div className="flex flex-col items-start gap-3">
      {mounted ? (
        <web-ui-editable-text
          ref={fieldRef}
          commit-on-unmount
          value="改几个字，再按下面的卸载按钮"
          aria-label="可卸载"
        ></web-ui-editable-text>
      ) : (
        <span className="text-sm text-(--wui-color-text-secondary)">这一行已经从 DOM 移除</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button onClick={() => setMounted(false)}>卸载这一行</web-ui-button>
        <web-ui-button onClick={() => setMounted(true)}>重新挂载</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">卸载保住：{saved || '(还没有)'}</output>
      </div>
    </div>
  )
}
