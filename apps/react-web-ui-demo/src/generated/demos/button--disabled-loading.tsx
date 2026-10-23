import { useState } from 'react'

export default function Demo() {
  const [pending, setPending] = useState(false)

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button disabled>Disabled</web-ui-button>
        <web-ui-button variant="primary" disabled>
          Disabled
        </web-ui-button>
        <web-ui-button loading>加载中</web-ui-button>
        <web-ui-button variant="primary" loading>
          加载中
        </web-ui-button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <web-ui-button variant="primary" loading={pending} onClick={() => setPending(true)}>
          保存
        </web-ui-button>
        <web-ui-button variant="secondary" disabled={!pending} onClick={() => setPending(false)}>
          结束等待
        </web-ui-button>
        <output className="text-sm text-(--wui-color-text-secondary)">
          loading：{pending ? 'true，保存按钮点不动' : 'false'}
        </output>
      </div>
    </div>
  )
}
