import { useState } from 'react'

const sides: { label: string; value: string }[] = [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' }
]

export default function Demo() {
  const [outerValue, setOuterValue] = useState('a')
  const [innerValue, setInnerValue] = useState('a')

  return (
    <web-ui-theme appearance="light" motion="reduced">
      <div className="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p className="m-0 mb-2 text-xs text-(--wui-color-text-secondary)">Outer light / reduced: instant</p>
        <div className="flex flex-wrap items-center gap-3">
          <web-ui-segmented
            value={outerValue}
            aria-label="Outer motion comparison"
            onInput={event => setOuterValue(event.currentTarget.value)}
          >
            {sides.map(item => (
              <web-ui-segmented-trigger key={item.value} value={item.value}>
                {item.label}
              </web-ui-segmented-trigger>
            ))}
          </web-ui-segmented>
          <web-ui-switch></web-ui-switch>
        </div>

        <web-ui-theme appearance="dark">
          <div className="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <p className="m-0 mb-2 text-xs text-(--wui-color-text-secondary)">
              Inner dark / motion unset, falls back to system: slides
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <web-ui-segmented
                value={innerValue}
                aria-label="Inner motion comparison"
                onInput={event => setInnerValue(event.currentTarget.value)}
              >
                {sides.map(item => (
                  <web-ui-segmented-trigger key={item.value} value={item.value}>
                    {item.label}
                  </web-ui-segmented-trigger>
                ))}
              </web-ui-segmented>
              <web-ui-switch checked></web-ui-switch>
            </div>
          </div>
        </web-ui-theme>
      </div>
    </web-ui-theme>
  )
}
