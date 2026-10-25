import { useState } from 'react'

export default function Demo() {
  const [framework, setFramework] = useState('vue')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-select
        aria-label="前端框架"
        value={framework}
        placeholder="请选择框架"
        onChange={event => setFramework(event.currentTarget.value)}
      >
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React"></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
      </web-ui-select>
      <div className="flex items-center gap-3">
        <web-ui-button onClick={() => setFramework('')}>清除</web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">当前值：{framework || '（空）'}</output>
      </div>
      <web-ui-select placeholder="禁用状态" disabled>
        <web-ui-option value="a" label="不可选"></web-ui-option>
      </web-ui-select>
    </div>
  )
}
