import type { ThemeAppearance } from '@greypan/web-ui'
import { useState } from 'react'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色', value: 'light' },
  { label: '暗色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

export default function Demo() {
  const [appearance, setAppearance] = useState<ThemeAppearance>('light')

  return (
    <web-ui-theme appearance={appearance}>
      <div className="w-full max-w-sm rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-(--wui-color-text-secondary)">appearance</span>
          <web-ui-segmented
            value={appearance}
            aria-label="示例作用域的外观"
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
          <web-ui-input value="作用域内的输入框"></web-ui-input>
          <web-ui-button variant="primary">确认</web-ui-button>
        </div>
      </div>
    </web-ui-theme>
  )
}
