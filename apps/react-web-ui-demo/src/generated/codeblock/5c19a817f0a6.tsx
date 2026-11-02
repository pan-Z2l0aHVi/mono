import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

export default function Demo() {
  const [outer, setOuter] = useState<ThemeAppearance>('light')
  const [middle, setMiddle] = useState<ThemeAppearance>('dark')
  const [inner, setInner] = useState<ThemeAppearance>('system')

  return (
    <web-ui-theme appearance={outer} motion="reduced">
      <div className="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-2">
          <span className="text-xs text-(--wui-color-text-secondary)">第 1 层 · reduced 动效</span>
          <web-ui-segmented
            value={outer}
            aria-label="第 1 层外观"
            onInput={event => {
              const next = appearances.find(item => item.value === event.currentTarget.value)
              if (next) setOuter(next.value)
            }}
          >
            {appearances.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
        </div>

        <web-ui-theme appearance={middle} motion="full">
          <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <div className="flex flex-col items-start gap-2">
              <span className="text-xs text-(--wui-color-text-secondary)">第 2 层 · full 动效</span>
              <web-ui-segmented
                value={middle}
                aria-label="第 2 层外观"
                onInput={event => {
                  const next = appearances.find(item => item.value === event.currentTarget.value)
                  if (next) setMiddle(next.value)
                }}
              >
                {appearances.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            </div>

            <web-ui-theme appearance={inner}>
              <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-xs text-(--wui-color-text-secondary)">第 3 层 · system 动效</span>
                  <web-ui-segmented
                    value={inner}
                    aria-label="第 3 层外观"
                    onInput={event => {
                      const next = appearances.find(item => item.value === event.currentTarget.value)
                      if (next) setInner(next.value)
                    }}
                  >
                    {appearances.map(item => (
                      <web-ui-segmented-trigger key={item.value} value={item.value}>
                        {item.label}
                      </web-ui-segmented-trigger>
                    ))}
                  </web-ui-segmented>
                </div>
              </div>
            </web-ui-theme>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
