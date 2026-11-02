import { lucideGlobe } from '@greypan/web-ui/icons'
import { useState } from 'react'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }

export default function Demo() {
  const [lang, setLang] = useState('en')

  return (
    <web-ui-select value={lang} onChange={event => setLang(event.currentTarget.value)}>
      <div slot="trigger" className="flex items-center gap-1.5">
        <web-ui-icon icon={lucideGlobe} size={16}></web-ui-icon>
        <span className="text-sm">{LABELS[lang] ?? 'Select language'}</span>
      </div>
      <web-ui-option value="zh" label="中文"></web-ui-option>
      <web-ui-option value="en" label="English"></web-ui-option>
      <web-ui-option value="ja" label="日本語"></web-ui-option>
    </web-ui-select>
  )
}
