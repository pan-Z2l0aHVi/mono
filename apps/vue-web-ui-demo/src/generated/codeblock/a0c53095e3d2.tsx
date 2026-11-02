import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

export default function Demo() {
  const [appearance, setAppearance] = useState<ThemeAppearance>('light')

  return (
    <web-ui-theme appearance="dark">
      <div className="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p className="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">
          The outer layer is fixed to dark; switching the inner one cannot affect it
        </p>
        <web-ui-theme appearance={appearance}>
          <div className="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-(--wui-color-text-secondary)">appearance</span>
              <web-ui-segmented
                value={appearance}
                aria-label="Appearance of the sample scope"
                onInput={event => {
                  const next = appearances.find(item => item.value === event.currentTarget.value)
                  if (next) setAppearance(next.value)
                }}
              >
                {appearances.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-input value="Input inside the scope"></web-ui-input>
              <web-ui-button variant="primary">Confirm</web-ui-button>
            </div>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
