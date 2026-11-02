import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={() => setLast(toast.success('操作成功'))}>success</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.info('提示信息'))}>info</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.warning('请注意'))}>warning</web-ui-button>
        <web-ui-button onClick={() => setLast(toast.error('出错了'))}>error</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近创建的 id：{last}</output>
    </div>
  )
}
