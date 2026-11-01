import { useState } from 'react'

export default function Demo() {
  const [plan, setPlan] = useState('basic')

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-radio checked={plan === 'basic'} onChange={() => setPlan('basic')}>
        Basic
      </web-ui-radio>
      <web-ui-radio checked={plan === 'pro'} onChange={() => setPlan('pro')}>
        Pro
      </web-ui-radio>
      <output className="text-sm text-(--wui-color-text-secondary)">Current plan: {plan}</output>
    </div>
  )
}
