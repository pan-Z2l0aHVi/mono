import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

export default function Demo() {
  const [id, setId] = useState('—')

  useEffect(() => () => toast.clear(), [])

  return (
    <div className="flex flex-col items-start gap-3">
      <web-ui-button
        onClick={() => {
          setId(
            toast({
              heading: '已保存',
              message: '更改已写入云端',
              type: 'info',
              position: 'bottom-right',
              duration: 4000,
              closable: true
            })
          )
        }}
      >
        创建完整 option 的 toast
      </web-ui-button>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id：{id} · 位置：bottom-right · 4 秒后自动关闭
      </output>
    </div>
  )
}
