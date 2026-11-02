const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: 'Light scope',
  dark: 'Dark scope'
}

export default function Demo() {
  return (
    <div className="flex flex-wrap gap-4">
      {appearances.map(item => (
        <web-ui-theme key={item} appearance={item}>
          <div className="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <p className="m-0 font-medium">{labels[item]}</p>
            <p className="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">
              Text, secondary text, and control surfaces all take their values from this layer
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary">Primary</web-ui-button>
              <web-ui-button variant="secondary">Secondary</web-ui-button>
              <web-ui-switch checked></web-ui-switch>
            </div>
          </div>
        </web-ui-theme>
      ))}
    </div>
  )
}
