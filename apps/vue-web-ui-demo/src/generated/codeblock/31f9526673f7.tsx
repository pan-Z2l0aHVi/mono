import { useState } from 'react'

export default function Demo() {
  const [plan, setPlan] = useState('basic')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked={plan === 'basic'} onChange={() => setPlan('basic')}>
        基础版
      </web-ui-radio>
      <web-ui-radio checked={plan === 'pro'} onChange={() => setPlan('pro')}>
        专业版
      </web-ui-radio>
      <output className="text-sm text-(--wui-color-text-secondary)">当前方案：{plan}</output>
    </div>
  )
}
