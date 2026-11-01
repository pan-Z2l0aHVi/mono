import { useState } from 'react'

export default function Demo() {
  const [channels, setChannels] = useState(['email'])

  function toggle(channel: string) {
    setChannels(current =>
      current.includes(channel) ? current.filter(item => item !== channel) : [...current, channel]
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-checkbox checked={channels.includes('email')} onChange={() => toggle('email')}>
        邮件通知
      </web-ui-checkbox>
      <web-ui-checkbox checked={channels.includes('sms')} onChange={() => toggle('sms')}>
        短信通知
      </web-ui-checkbox>
      <output className="text-sm text-(--wui-color-text-secondary)">
        已选择：{channels.join('、') || '还没有选中项'}
      </output>
    </div>
  )
}
