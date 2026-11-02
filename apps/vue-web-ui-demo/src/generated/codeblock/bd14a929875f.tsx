const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: '浅色作用域',
  dark: '暗色作用域'
}

export default function Demo() {
  return (
    <div className="flex flex-wrap gap-4">
      {appearances.map(item => (
        <web-ui-theme key={item} appearance={item}>
          <div className="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
            <p className="m-0 font-medium">{labels[item]}</p>
            <p className="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">文本、次要文本与控件表面都取这一层的值</p>
            <div className="flex flex-wrap items-center gap-2">
              <web-ui-button variant="primary">主要</web-ui-button>
              <web-ui-button variant="secondary">次要</web-ui-button>
              <web-ui-switch checked></web-ui-switch>
            </div>
          </div>
        </web-ui-theme>
      ))}
    </div>
  )
}
