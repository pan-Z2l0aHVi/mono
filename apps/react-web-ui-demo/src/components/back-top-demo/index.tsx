import type { WebUiBackTop } from '@greypan/web-ui'
import { useEffect, useRef, type ReactNode } from 'react'

interface ScrollBoxProps {
  threshold?: number
  behavior?: 'smooth' | 'auto'
  children?: ReactNode
}

function ScrollBox({ threshold = 200, behavior = 'smooth', children }: ScrollBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  // scrollTarget 是 element 属性而非 attribute，需要在挂载后手动赋值
  useEffect(() => {
    if (boxRef.current && backTopRef.current) {
      backTopRef.current.scrollTarget = boxRef.current
    }
  }, [])

  return (
    <div
      ref={boxRef}
      className="h-48 overflow-auto rounded-xl border border-[var(--wui-color-border)] bg-[var(--wui-color-surface-raised)] p-3"
    >
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>滚动容器第 {i + 1} 行</p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={threshold} scroll-behavior={behavior}>
        {children}
      </web-ui-back-top>
    </div>
  )
}

function BackTopDemo() {
  return (
    <div>
      <h1>BackTop 回到顶部</h1>

      <h2>页面级滚动</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        向下滚动页面超过阈值后出现按钮，点击或按 Enter 回到顶部。通过 <code>--web-ui-back-top-position</code>、
        <code>--web-ui-back-top-left</code> 等自定义属性控制按钮在容器内的定位。
      </p>
      <div className="mb-6 h-80 overflow-hidden rounded-xl border border-[var(--wui-color-border)] p-4 [position:relative]">
        <p className="pb-10">这是一个占位区域：滚动页面观察左下角的回到顶部按钮。</p>
        <web-ui-back-top className="absolute bottom-5 left-6 right-auto [--web-ui-back-top-position:absolute]"></web-ui-back-top>
      </div>

      <h2>自定义滚动容器</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        通过 scrollTarget 指定滚动容器：按钮悬浮于容器右下角，仅容器滚动时显示。
      </p>
      <ScrollBox />

      <h2>自定义阈值</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        threshold=&quot;300&quot;：容器滚动超过 300px 才显示按钮。
      </p>
      <ScrollBox threshold={300} />

      <h2>自定义内容</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">默认 slot 可替换按钮内容。</p>
      <ScrollBox>
        <web-ui-button variant="primary">回到顶部</web-ui-button>
      </ScrollBox>

      <h2>立即滚动</h2>
      <p className="mb-2 text-sm text-[var(--wui-color-text-muted)]">
        scroll-behavior=&quot;auto&quot;：点击后瞬间回到顶部，无平滑滚动动画。
      </p>
      <ScrollBox behavior="auto" />
    </div>
  )
}
export default BackTopDemo
