import { useState } from 'react'

export default function Demo() {
  const [clicks, setClicks] = useState(0)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" onClick={() => setClicks(count => count + 1)}>
        按一下
      </web-ui-button>
      <web-ui-button variant="primary" disabled onClick={() => setClicks(count => count + 1)}>
        禁用（点了不计数）
      </web-ui-button>
      <web-ui-button variant="primary" loading onClick={() => setClicks(count => count + 1)}>
        加载（点了不计数）
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">click：{clicks} 次</output>
    </div>
  )
}
