import { useState } from 'react'

export default function Demo() {
  const [insetView, setInsetView] = useState('week')
  const [raisedView, setRaisedView] = useState('week')

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">inset（默认）</span>
        <web-ui-segmented value={insetView} onInput={event => setInsetView(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">选中值：{insetView}</output>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="text-sm text-(--wui-color-text-secondary)">raised</span>
        <web-ui-segmented
          variant="raised"
          value={raisedView}
          onInput={event => setRaisedView(event.currentTarget.value)}
        >
          <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
        </web-ui-segmented>
        <output className="text-sm text-(--wui-color-text-secondary)">选中值：{raisedView}</output>
      </div>
    </div>
  )
}
