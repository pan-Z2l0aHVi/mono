import type { ThemeMotion, WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

const motions: { label: string; value: ThemeMotion }[] = [
  { label: 'full', value: 'full' },
  { label: 'reduced', value: 'reduced' },
  { label: 'system', value: 'system' }
]

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const [motion, setMotion] = useState<ThemeMotion>('system')
  const [reduced, setReduced] = useState('')

  return (
    <web-ui-theme ref={theme} appearance="light" motion={motion}>
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-(--wui-color-text-secondary)">motion</span>
          <web-ui-segmented
            value={motion}
            aria-label="Motion preset of the sample scope"
            onInput={event => {
              const next = motions.find(item => item.value === event.currentTarget.value)
              if (next) setMotion(next.value)
            }}
          >
            {motions.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select portal placeholder="Open to see the duration" aria-label="Select for comparing motion presets">
            <web-ui-option value="enter" label="Enter">
              Enter
            </web-ui-option>
            <web-ui-option value="exit" label="Exit">
              Exit
            </web-ui-option>
          </web-ui-select>
          <web-ui-button
            variant="secondary"
            onClick={() => setReduced(`isReducedMotion() = ${String(theme.current?.isReducedMotion())}`)}
          >
            Read the result
          </web-ui-button>
          <output className="text-sm text-(--wui-color-text-secondary)">
            {reduced === '' ? 'Not read yet' : reduced}
          </output>
        </div>
      </div>
    </web-ui-theme>
  )
}
