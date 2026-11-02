import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

export default function Demo() {
  const [outer, setOuter] = useState<ThemeAppearance>('light')
  const [middle, setMiddle] = useState<ThemeAppearance>('dark')
  const [inner, setInner] = useState<ThemeAppearance>('system')

  return (
    <web-ui-theme appearance={outer} motion="reduced">
      <div className="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-col items-start gap-2">
          <span className="text-xs text-(--wui-color-text-secondary)">Layer 1 · motion reduced</span>
          <web-ui-segmented
            value={outer}
            aria-label="Layer 1 appearance"
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
              <span className="text-xs text-(--wui-color-text-secondary)">Layer 2 · motion full</span>
              <web-ui-segmented
                value={middle}
                aria-label="Layer 2 appearance"
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
                  <span className="text-xs text-(--wui-color-text-secondary)">Layer 3 · motion system</span>
                  <web-ui-segmented
                    value={inner}
                    aria-label="Layer 3 appearance"
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
