import { toast } from '@greypan/web-ui'
import { useEffect, useSyncExternalStore } from 'react'

import { onRouteFailure, routeProgress } from '@/router/progress'

export function RouteProgressBar() {
  const snapshot = useSyncExternalStore(routeProgress.subscribe, routeProgress.getSnapshot, routeProgress.getSnapshot)

  useEffect(() => {
    return onRouteFailure(() => {
      toast.error('页面加载失败，请重试')
    })
  }, [])

  return (
    <div
      className={
        'pointer-events-none fixed inset-x-0 top-0 z-(--wui-layer-loading,3000) transition-opacity duration-200 motion-reduce:transition-none ' +
        (snapshot.visible ? 'opacity-100' : 'opacity-0')
      }
      data-visible={snapshot.visible}
      data-phase={snapshot.phase}
      style={
        {
          '--wui-progress-height': '3px',
          '--wui-progress-radius': '0',
          '--wui-duration-trigger': snapshot.value === 0 ? '0ms' : '200ms'
        } as React.CSSProperties
      }
    >
      <web-ui-progress
        className="pointer-events-none motion-reduce:[--wui-duration-trigger:0ms]"
        value={snapshot.value}
        max={100}
        aria-hidden={snapshot.visible ? undefined : 'true'}
        aria-label="页面加载进度"
      ></web-ui-progress>
    </div>
  )
}
