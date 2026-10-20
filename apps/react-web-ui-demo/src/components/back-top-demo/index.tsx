import type { WebUiBackTop } from '@greypan/web-ui'
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { OverlayScrollbarsComponent, type OverlayScrollbarsComponentRef } from 'overlayscrollbars-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface ScrollBoxProps {
  threshold?: number
  behavior?: 'smooth' | 'auto'
  children?: ReactNode
}

function ScrollBox({ threshold = 200, behavior = 'smooth', children }: ScrollBoxProps) {
  const boxRef = useRef<OverlayScrollbarsComponentRef<'div'> | null>(null)
  const backTopRef = useRef<WebUiBackTop>(null)

  // scrollTarget 是 element 属性而非 attribute，需要在挂载后手动赋值。
  // 接管滚动后滚动发生在 OverlayScrollbars 生成的 viewport 上，宿主自己不再滚动，
  // 所以目标要取 viewport 而不是宿主元素，否则 button 永远不会出现。
  useEffect(() => {
    const viewport = boxRef.current?.osInstance()?.elements().viewport
    if (viewport && backTopRef.current) {
      backTopRef.current.scrollTarget = viewport
    }
  }, [])

  return (
    <OverlayScrollbarsComponent
      ref={boxRef}
      options={webUiScrollbarsOptions}
      className="h-48 overflow-auto rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface-raised) p-3"
    >
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>滚动容器第 {i + 1} 行</p>
      ))}
      <web-ui-back-top ref={backTopRef} threshold={threshold} scrollBehavior={behavior}>
        {children}
      </web-ui-back-top>
    </OverlayScrollbarsComponent>
  )
}

function BackTopDemo() {
  return (
    <div>
      <h1>BackTop back top</h1>

      <h2>Page scroll</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        向下滚动页面超过阈值后出现 button，点击或按 Enter back top。通过 <code>--wui-back-top-position</code>、
        <code>--wui-back-top-left</code> 等自定义属性控制 button 在容器内的定位。
      </p>
      <div className="mb-6 h-80 overflow-hidden rounded-xl border border-(--wui-color-border) p-4 relative">
        <p className="pb-10">
          A placeholder area: scroll the page to watch the back top button in the bottom-left corner.
        </p>
        <web-ui-back-top className="absolute bottom-5 left-6 right-auto [--wui-back-top-position:absolute]"></web-ui-back-top>
      </div>

      <h2>Custom scroll container</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        通过 scrollTarget 指定滚动容器：button 悬浮于容器右下角，仅容器滚动时显示。
      </p>
      <ScrollBox />

      <h2>Custom threshold</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        threshold=&quot;300&quot;: the button only shows after the container scrolls past 300px.
      </p>
      <ScrollBox threshold={300} />

      <h2>Custom content</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">The default slot replaces the button content.</p>
      <ScrollBox>
        <web-ui-button variant="primary">back top</web-ui-button>
      </ScrollBox>

      <h2>Scroll now</h2>
      <p className="mb-2 text-sm text-(--wui-color-text-secondary)">
        scroll-behavior=&quot;auto&quot;：点击后瞬间 back top，无平滑滚动动画。
      </p>
      <ScrollBox behavior="auto" />
    </div>
  )
}
export default BackTopDemo
