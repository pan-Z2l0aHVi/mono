import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const UPLOAD_ID = 'demo-upload'

export default function Demo() {
  const [step, setStep] = useState('尚未开始')

  useEffect(() => () => toast.clear(), [])

  function start() {
    setStep('0%')
    toast.info('上传中 0%', { id: UPLOAD_ID, duration: 0 })
  }

  function progress() {
    setStep('60%')
    toast.info('上传中 60%', { id: UPLOAD_ID })
  }

  function finish() {
    setStep('完成')
    toast.success('上传完成', { id: UPLOAD_ID, duration: 3000 })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={start}>开始上传</web-ui-button>
        <web-ui-button onClick={progress}>进度 60%</web-ui-button>
        <web-ui-button onClick={finish}>完成</web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">
        id：{UPLOAD_ID} · 当前：{step}
      </output>
    </div>
  )
}
